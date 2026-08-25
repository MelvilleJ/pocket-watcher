import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  debtPayments,
  debts,
  expenseCategories,
  expenses,
  income,
  incomeSources,
  subscriptions,
} from "@/lib/db/schema";
import { authenticateMobileRequest } from "@/lib/auth/mobile-request";
import { recordAudit } from "@/lib/audit";
import { SyncPushSchema } from "@/lib/validation/sync";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);
  const serverTime = new Date();

  const [
    incomeRows,
    expenseRows,
    subscriptionRows,
    debtRows,
    debtPaymentRows,
    categoryRows,
    sourceRows,
  ] = await Promise.all([
    db.select().from(income).where(and(eq(income.userId, session.userId), gt(income.updatedAt, sinceDate))),
    db.select().from(expenses).where(and(eq(expenses.userId, session.userId), gt(expenses.updatedAt, sinceDate))),
    db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, session.userId), gt(subscriptions.updatedAt, sinceDate))),
    db.select().from(debts).where(and(eq(debts.userId, session.userId), gt(debts.updatedAt, sinceDate))),
    db
      .select({
        id: debtPayments.id,
        debtClientId: debts.clientId,
        clientId: debtPayments.clientId,
        date: debtPayments.date,
        description: debtPayments.description,
        amount: debtPayments.amount,
        notes: debtPayments.notes,
        createdAt: debtPayments.createdAt,
        updatedAt: debtPayments.updatedAt,
        deletedAt: debtPayments.deletedAt,
      })
      .from(debtPayments)
      .innerJoin(debts, eq(debtPayments.debtId, debts.id))
      .where(and(eq(debtPayments.userId, session.userId), gt(debtPayments.updatedAt, sinceDate))),
    db.select().from(expenseCategories).where(eq(expenseCategories.userId, session.userId)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, session.userId)),
  ]);

  return NextResponse.json({
    serverTime,
    income: incomeRows,
    expenses: expenseRows,
    subscriptions: subscriptionRows,
    debts: debtRows,
    debtPayments: debtPaymentRows,
    expenseCategories: categoryRows,
    incomeSources: sourceRows,
  });
}

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = SyncPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId } = session;
  const result: Record<string, Record<string, string>> = {
    income: {},
    expenses: {},
    subscriptions: {},
    debts: {},
    debtPayments: {},
  };

  for (const rec of parsed.data.debts ?? []) {
    const [row] = await db
      .insert(debts)
      .values({
        userId,
        clientId: rec.clientId,
        name: rec.name,
        lenderType: rec.lenderType ?? null,
        originalAmount: rec.originalAmount.toFixed(2),
        interestRate: rec.interestRate.toFixed(4),
        minMonthlyPayment: rec.minMonthlyPayment.toFixed(2),
        notes: rec.notes ?? null,
        deletedAt: rec.deleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [debts.userId, debts.clientId],
        set: {
          name: rec.name,
          lenderType: rec.lenderType ?? null,
          originalAmount: rec.originalAmount.toFixed(2),
          interestRate: rec.interestRate.toFixed(4),
          minMonthlyPayment: rec.minMonthlyPayment.toFixed(2),
          notes: rec.notes ?? null,
          deletedAt: rec.deleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    result.debts[rec.clientId] = row.id;
    await recordAudit({
      userId,
      entityType: "debt",
      entityId: row.id,
      action: rec.deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  }

  const debtClientIds = (parsed.data.debtPayments ?? []).map((p) => p.debtClientId);
  const debtIdByClientId = new Map<string, string>();
  if (debtClientIds.length > 0) {
    const resolvedDebts = await db
      .select({ id: debts.id, clientId: debts.clientId })
      .from(debts)
      .where(and(eq(debts.userId, userId), inArray(debts.clientId, debtClientIds)));
    for (const d of resolvedDebts) debtIdByClientId.set(d.clientId, d.id);
  }

  for (const rec of parsed.data.debtPayments ?? []) {
    const debtId = result.debts[rec.debtClientId] ?? debtIdByClientId.get(rec.debtClientId);
    if (!debtId) continue;

    const [row] = await db
      .insert(debtPayments)
      .values({
        userId,
        debtId,
        clientId: rec.clientId,
        date: new Date(rec.date),
        description: rec.description ?? null,
        amount: rec.amount.toFixed(2),
        notes: rec.notes ?? null,
        deletedAt: rec.deleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [debtPayments.userId, debtPayments.clientId],
        set: {
          debtId,
          date: new Date(rec.date),
          description: rec.description ?? null,
          amount: rec.amount.toFixed(2),
          notes: rec.notes ?? null,
          deletedAt: rec.deleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    result.debtPayments[rec.clientId] = row.id;
    await recordAudit({
      userId,
      entityType: "debt_payment",
      entityId: row.id,
      action: rec.deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  }

  for (const rec of parsed.data.income ?? []) {
    const [row] = await db
      .insert(income)
      .values({
        userId,
        clientId: rec.clientId,
        date: new Date(rec.date),
        sourceName: rec.sourceName,
        description: rec.description ?? null,
        amount: rec.amount.toFixed(2),
        notes: rec.notes ?? null,
        deletedAt: rec.deleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [income.userId, income.clientId],
        set: {
          date: new Date(rec.date),
          sourceName: rec.sourceName,
          description: rec.description ?? null,
          amount: rec.amount.toFixed(2),
          notes: rec.notes ?? null,
          deletedAt: rec.deleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    result.income[rec.clientId] = row.id;
    await recordAudit({
      userId,
      entityType: "income",
      entityId: row.id,
      action: rec.deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  }

  for (const rec of parsed.data.expenses ?? []) {
    const [row] = await db
      .insert(expenses)
      .values({
        userId,
        clientId: rec.clientId,
        date: new Date(rec.date),
        categoryName: rec.categoryName,
        description: rec.description ?? null,
        amount: rec.amount.toFixed(2),
        paid: rec.paid ?? true,
        notes: rec.notes ?? null,
        deletedAt: rec.deleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [expenses.userId, expenses.clientId],
        set: {
          date: new Date(rec.date),
          categoryName: rec.categoryName,
          description: rec.description ?? null,
          amount: rec.amount.toFixed(2),
          paid: rec.paid ?? true,
          notes: rec.notes ?? null,
          deletedAt: rec.deleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    result.expenses[rec.clientId] = row.id;
    await recordAudit({
      userId,
      entityType: "expense",
      entityId: row.id,
      action: rec.deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  }

  for (const rec of parsed.data.subscriptions ?? []) {
    const [row] = await db
      .insert(subscriptions)
      .values({
        userId,
        clientId: rec.clientId,
        name: rec.name,
        categoryName: rec.categoryName,
        billingCycle: rec.billingCycle,
        billedAmount: rec.billedAmount.toFixed(2),
        startDate: new Date(rec.startDate),
        endDate: rec.endDate ? new Date(rec.endDate) : null,
        status: rec.status ?? "active",
        notes: rec.notes ?? null,
        deletedAt: rec.deleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [subscriptions.userId, subscriptions.clientId],
        set: {
          name: rec.name,
          categoryName: rec.categoryName,
          billingCycle: rec.billingCycle,
          billedAmount: rec.billedAmount.toFixed(2),
          startDate: new Date(rec.startDate),
          endDate: rec.endDate ? new Date(rec.endDate) : null,
          status: rec.status ?? "active",
          notes: rec.notes ?? null,
          deletedAt: rec.deleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    result.subscriptions[rec.clientId] = row.id;
    await recordAudit({
      userId,
      entityType: "subscription",
      entityId: row.id,
      action: rec.deleted ? "delete" : "update",
      after: row,
      source: "mobile",
    });
  }

  return NextResponse.json({ serverTime: new Date(), ids: result });
}
