import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  debtPayments,
  debts,
  depoTransfers,
  depos,
  expenseCategories,
  expenses,
  goalPayments,
  goals,
  income,
  incomeSources,
  subscriptions,
} from "@/lib/db/schema";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { recordAudit } from "@/lib/audit";
import { SyncPushSchema } from "@/lib/validation/sync";
import { resolveExpenseCategory, resolveIncomeSource } from "@/lib/categories";
import { syncBudgetLinesForUser } from "@/lib/budgets";
import { generateSubscriptionCharges } from "@/lib/subscription-charges";

async function clientIdMaps(userId: string) {
  const [depoRows, debtRows, goalRows] = await Promise.all([
    db.select({ id: depos.id, clientId: depos.clientId }).from(depos).where(eq(depos.userId, userId)),
    db.select({ id: debts.id, clientId: debts.clientId }).from(debts).where(eq(debts.userId, userId)),
    db.select({ id: goals.id, clientId: goals.clientId }).from(goals).where(eq(goals.userId, userId)),
  ]);
  const build = (rows: { id: string; clientId: string }[]) => ({
    toId: new Map(rows.map((r) => [r.clientId, r.id])),
    toClientId: new Map(rows.map((r) => [r.id, r.clientId])),
  });
  return { depos: build(depoRows), debts: build(debtRows), goals: build(goalRows) };
}

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const { userId } = session;
  const since = new Date(request.nextUrl.searchParams.get("since") ?? 0);
  const sinceDate = Number.isNaN(since.getTime()) ? new Date(0) : since;
  const serverTime = new Date();
  const changed = (t: { userId: AnyPgColumn; updatedAt: AnyPgColumn }) =>
    and(eq(t.userId, userId), gt(t.updatedAt, sinceDate));

  const [
    maps,
    depoRows,
    transferRows,
    incomeRows,
    expenseRows,
    subscriptionRows,
    debtRows,
    debtPaymentRows,
    goalRows,
    goalPaymentRows,
    categoryRows,
    sourceRows,
  ] = await Promise.all([
    clientIdMaps(userId),
    db.select().from(depos).where(changed(depos)),
    db.select().from(depoTransfers).where(changed(depoTransfers)),
    db.select().from(income).where(changed(income)),
    db.select().from(expenses).where(changed(expenses)),
    db.select().from(subscriptions).where(changed(subscriptions)),
    db.select().from(debts).where(changed(debts)),
    db.select().from(debtPayments).where(changed(debtPayments)),
    db.select().from(goals).where(changed(goals)),
    db.select().from(goalPayments).where(changed(goalPayments)),
    db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, userId)),
  ]);

  const depoClientId = (id: string | null) => (id ? (maps.depos.toClientId.get(id) ?? null) : null);

  return NextResponse.json({
    serverTime,
    depos: depoRows,
    depoTransfers: transferRows.map((r) => ({
      ...r,
      fromDepoClientId: depoClientId(r.fromDepoId),
      toDepoClientId: depoClientId(r.toDepoId),
    })),
    income: incomeRows.map((r) => ({ ...r, depoClientId: depoClientId(r.depoId) })),
    expenses: expenseRows.map((r) => ({ ...r, depoClientId: depoClientId(r.depoId) })),
    subscriptions: subscriptionRows,
    debts: debtRows,
    debtPayments: debtPaymentRows.map((r) => ({ ...r, debtClientId: maps.debts.toClientId.get(r.debtId) ?? null })),
    goals: goalRows,
    goalPayments: goalPaymentRows.map((r) => ({ ...r, goalClientId: maps.goals.toClientId.get(r.goalId) ?? null })),
    expenseCategories: categoryRows,
    incomeSources: sourceRows,
  });
}

type Rejection = { type: string; clientId: string; reason: string };

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const parsed = SyncPushSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId } = session;
  const data = parsed.data;
  const accepted: Record<string, string[]> = {};
  const rejected: Rejection[] = [];
  let budgetLinesStale = false;

  const accept = async (type: string, entityType: string, clientId: string, row: { id: string }, deleted?: boolean) => {
    (accepted[type] ??= []).push(clientId);
    await recordAudit({
      userId,
      entityType,
      entityId: row.id,
      action: deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  };
  const deletedAt = (deleted?: boolean) => (deleted ? new Date() : null);

  for (const rec of data.depos ?? []) {
    if (!rec.deleted) {
      const [clash] = await db
        .select({ id: depos.id })
        .from(depos)
        .where(and(eq(depos.userId, userId), eq(depos.name, rec.name), isNull(depos.deletedAt), ne(depos.clientId, rec.clientId)))
        .limit(1);
      if (clash) {
        rejected.push({ type: "depos", clientId: rec.clientId, reason: `You already have a depo called "${rec.name}".` });
        continue;
      }
    }

    const values = {
      name: rec.name,
      kind: rec.kind,
      color: rec.color,
      icon: rec.icon,
      openingBalance: rec.openingBalance.toFixed(2),
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(depos)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [depos.userId, depos.clientId], set: values })
      .returning();
    await accept("depos", "depo", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.debts ?? []) {
    const values = {
      name: rec.name,
      lenderType: rec.lenderType ?? null,
      originalAmount: rec.originalAmount.toFixed(2),
      interestRate: rec.interestRate.toFixed(4),
      minMonthlyPayment: rec.minMonthlyPayment.toFixed(2),
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(debts)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [debts.userId, debts.clientId], set: values })
      .returning();
    budgetLinesStale = true;
    await accept("debts", "debt", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.goals ?? []) {
    const [clash] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.name, rec.name), ne(goals.clientId, rec.clientId)))
      .limit(1);
    if (clash) {
      rejected.push({ type: "goals", clientId: rec.clientId, reason: `You already have a goal called "${rec.name}".` });
      continue;
    }

    // currentSaved is owned by the server once a goal exists, since goal payments adjust it.
    const values = {
      name: rec.name,
      targetAmount: rec.targetAmount.toFixed(2),
      minMonthlyContribution: rec.minMonthlyContribution.toFixed(2),
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(goals)
      .values({ userId, clientId: rec.clientId, currentSaved: (rec.initialSaved ?? 0).toFixed(2), ...values })
      .onConflictDoUpdate({ target: [goals.userId, goals.clientId], set: values })
      .returning();
    budgetLinesStale = true;
    await accept("goals", "goal", rec.clientId, row, rec.deleted);
  }

  const maps = await clientIdMaps(userId);
  const depoId = (clientId?: string | null) => (clientId ? (maps.depos.toId.get(clientId) ?? null) : null);

  for (const rec of data.depoTransfers ?? []) {
    const fromDepoId = depoId(rec.fromDepoClientId);
    const toDepoId = depoId(rec.toDepoClientId);
    if (!fromDepoId || !toDepoId || fromDepoId === toDepoId) {
      rejected.push({ type: "depoTransfers", clientId: rec.clientId, reason: "Transfer needs two different depos." });
      continue;
    }

    const values = {
      fromDepoId,
      toDepoId,
      date: new Date(rec.date),
      amount: rec.amount.toFixed(2),
      fee: (rec.fee ?? 0).toFixed(2),
      description: rec.description ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(depoTransfers)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [depoTransfers.userId, depoTransfers.clientId], set: values })
      .returning();
    await accept("depoTransfers", "depo_transfer", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.debtPayments ?? []) {
    const debtId = maps.debts.toId.get(rec.debtClientId);
    if (!debtId) {
      rejected.push({ type: "debtPayments", clientId: rec.clientId, reason: "Debt not found." });
      continue;
    }

    const values = {
      debtId,
      date: new Date(rec.date),
      description: rec.description ?? null,
      amount: rec.amount.toFixed(2),
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(debtPayments)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [debtPayments.userId, debtPayments.clientId], set: values })
      .returning();
    budgetLinesStale = true;
    await accept("debtPayments", "debt_payment", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.goalPayments ?? []) {
    const goalId = maps.goals.toId.get(rec.goalClientId);
    if (!goalId) {
      rejected.push({ type: "goalPayments", clientId: rec.clientId, reason: "Goal not found." });
      continue;
    }

    const row = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(goalPayments)
        .where(and(eq(goalPayments.userId, userId), eq(goalPayments.clientId, rec.clientId)))
        .limit(1);

      const values = {
        goalId,
        date: new Date(rec.date),
        description: rec.description ?? null,
        amount: rec.amount.toFixed(2),
        notes: rec.notes ?? null,
        deletedAt: deletedAt(rec.deleted),
        updatedAt: new Date(),
      };
      const [saved] = await tx
        .insert(goalPayments)
        .values({ userId, clientId: rec.clientId, ...values })
        .onConflictDoUpdate({ target: [goalPayments.userId, goalPayments.clientId], set: values })
        .returning();

      const adjust = (id: string, delta: number) =>
        delta === 0
          ? undefined
          : tx
              .update(goals)
              .set({ currentSaved: sql`greatest(${goals.currentSaved} + ${delta.toFixed(2)}, 0)`, updatedAt: new Date() })
              .where(and(eq(goals.id, id), eq(goals.userId, userId)));
      if (existing && !existing.deletedAt) await adjust(existing.goalId, -Number(existing.amount));
      if (!rec.deleted) await adjust(goalId, rec.amount);

      return saved;
    });
    budgetLinesStale = true;
    await accept("goalPayments", "goal_payment", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.income ?? []) {
    const source = await resolveIncomeSource(userId, rec.sourceName);
    budgetLinesStale ||= source.created;
    const values = {
      date: new Date(rec.date),
      ...(rec.appliedMonth !== undefined ? { appliedMonth: rec.appliedMonth } : {}),
      sourceId: source.id,
      sourceName: source.name,
      depoId: depoId(rec.depoClientId),
      description: rec.description ?? null,
      amount: rec.amount.toFixed(2),
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(income)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [income.userId, income.clientId], set: values })
      .returning();
    await accept("income", "income", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.expenses ?? []) {
    const category = await resolveExpenseCategory(userId, rec.categoryName);
    budgetLinesStale ||= category.created;
    const values = {
      date: new Date(rec.date),
      categoryId: category.id,
      categoryName: category.name,
      depoId: depoId(rec.depoClientId),
      description: rec.description ?? null,
      amount: rec.amount.toFixed(2),
      paid: rec.paid ?? true,
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(expenses)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [expenses.userId, expenses.clientId], set: values })
      .returning();
    await accept("expenses", "expense", rec.clientId, row, rec.deleted);
  }

  for (const rec of data.subscriptions ?? []) {
    const category = await resolveExpenseCategory(userId, rec.categoryName);
    const values = {
      name: rec.name,
      categoryId: category.id,
      categoryName: category.name,
      billingCycle: rec.billingCycle,
      billedAmount: rec.billedAmount.toFixed(2),
      startDate: new Date(rec.startDate),
      endDate: rec.endDate ? new Date(rec.endDate) : null,
      status: rec.status ?? "active",
      notes: rec.notes ?? null,
      deletedAt: deletedAt(rec.deleted),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(subscriptions)
      .values({ userId, clientId: rec.clientId, ...values })
      .onConflictDoUpdate({ target: [subscriptions.userId, subscriptions.clientId], set: values })
      .returning();
    budgetLinesStale = true;
    await accept("subscriptions", "subscription", rec.clientId, row, rec.deleted);
  }

  if (budgetLinesStale) await syncBudgetLinesForUser(userId);
  if (data.subscriptions?.length) await generateSubscriptionCharges(userId);
  if (Object.keys(accepted).length > 0) revalidatePath("/dashboard", "layout");

  return NextResponse.json({ serverTime: new Date(), accepted, rejected });
}
