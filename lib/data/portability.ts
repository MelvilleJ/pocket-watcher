import "server-only";
import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  budgetLines,
  budgets,
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
  users,
} from "@/lib/db/schema";
import { syncBudgetLinesForUser } from "@/lib/budgets";
import { generateSubscriptionCharges } from "@/lib/subscription-charges";
import type { DataFile } from "@/lib/validation/data-file";

export const EXPORT_VERSION = 1;

export type EntityCounts = {
  expenseCategories: number;
  incomeSources: number;
  depos: number;
  depoTransfers: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debts: number;
  debtPayments: number;
  goals: number;
  goalPayments: number;
  budgets: number;
  auditLogs: number;
};

async function entityCounts(userId: string): Promise<EntityCounts> {
  const [ec, is, d, dt, inc, ex, s, dbt, dp, g, gp, b, al] = await Promise.all([
    db.select({ n: count() }).from(expenseCategories).where(eq(expenseCategories.userId, userId)),
    db.select({ n: count() }).from(incomeSources).where(eq(incomeSources.userId, userId)),
    db.select({ n: count() }).from(depos).where(eq(depos.userId, userId)),
    db.select({ n: count() }).from(depoTransfers).where(eq(depoTransfers.userId, userId)),
    db.select({ n: count() }).from(income).where(eq(income.userId, userId)),
    db.select({ n: count() }).from(expenses).where(eq(expenses.userId, userId)),
    db.select({ n: count() }).from(subscriptions).where(eq(subscriptions.userId, userId)),
    db.select({ n: count() }).from(debts).where(eq(debts.userId, userId)),
    db.select({ n: count() }).from(debtPayments).where(eq(debtPayments.userId, userId)),
    db.select({ n: count() }).from(goals).where(eq(goals.userId, userId)),
    db.select({ n: count() }).from(goalPayments).where(eq(goalPayments.userId, userId)),
    db.select({ n: count() }).from(budgets).where(eq(budgets.userId, userId)),
    db.select({ n: count() }).from(auditLogs).where(eq(auditLogs.userId, userId)),
  ]);

  return {
    expenseCategories: ec[0].n,
    incomeSources: is[0].n,
    depos: d[0].n,
    depoTransfers: dt[0].n,
    income: inc[0].n,
    expenses: ex[0].n,
    subscriptions: s[0].n,
    debts: dbt[0].n,
    debtPayments: dp[0].n,
    goals: g[0].n,
    goalPayments: gp[0].n,
    budgets: b[0].n,
    auditLogs: al[0].n,
  };
}

/**
 * Builds the full backup of one user's data. Soft-deleted rows are included
 * (with deletedAt) so an export taken before deleting the account is a
 * complete snapshot. The audit log is included so the history survives a wipe.
 */
export async function buildExport(userId: string) {
  const [
    [user],
    categories,
    sources,
    depoRows,
    transferRows,
    incomeRows,
    expenseRows,
    subscriptionRows,
    debtRows,
    debtPaymentRows,
    goalRows,
    goalPaymentRows,
    budgetRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, userId)),
    db.select().from(depos).where(eq(depos.userId, userId)),
    db.select().from(depoTransfers).where(eq(depoTransfers.userId, userId)),
    db.select().from(income).where(eq(income.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
    db.select().from(debts).where(eq(debts.userId, userId)),
    db.select().from(debtPayments).where(eq(debtPayments.userId, userId)),
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(goalPayments).where(eq(goalPayments.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(auditLogs).where(eq(auditLogs.userId, userId)),
  ]);

  if (!user) throw new Error("User not found");

  const budgetIds = budgetRows.map((b) => b.id);
  const lineRows = budgetIds.length
    ? await db.select().from(budgetLines).where(inArray(budgetLines.budgetId, budgetIds))
    : [];
  const lineByBudget = new Map<string, typeof lineRows>();
  for (const line of lineRows) {
    const list = lineByBudget.get(line.budgetId);
    if (list) list.push(line);
    else lineByBudget.set(line.budgetId, [line]);
  }

  const clientIdById = (rows: { id: string; clientId: string }[]) => new Map(rows.map((r) => [r.id, r.clientId]));
  const toClientId = (map: Map<string, string>, id: string | null) => (id ? (map.get(id) ?? null) : null);
  const depoById = clientIdById(depoRows);
  const debtById = clientIdById(debtRows);
  const goalById = clientIdById(goalRows);
  const subscriptionById = clientIdById(subscriptionRows);

  return {
    app: "pocket-watcher",
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      currency: user.currency,
      savingsRate: user.savingsRate,
      createdAt: user.createdAt,
    },
    expenseCategories: categories,
    incomeSources: sources,
    depos: depoRows,
    depoTransfers: transferRows.map((r) => ({
      ...r,
      fromDepoClientId: toClientId(depoById, r.fromDepoId),
      toDepoClientId: toClientId(depoById, r.toDepoId),
    })),
    income: incomeRows.map((r) => ({ ...r, depoClientId: toClientId(depoById, r.depoId) })),
    expenses: expenseRows.map((r) => ({
      ...r,
      depoClientId: toClientId(depoById, r.depoId),
      subscriptionClientId: toClientId(subscriptionById, r.subscriptionId),
    })),
    subscriptions: subscriptionRows,
    debts: debtRows,
    debtPayments: debtPaymentRows.map((r) => ({ ...r, debtClientId: toClientId(debtById, r.debtId) })),
    goals: goalRows,
    goalPayments: goalPaymentRows.map((r) => ({ ...r, goalClientId: toClientId(goalById, r.goalId) })),
    budgets: budgetRows.map((b) => ({ ...b, lines: lineByBudget.get(b.id) ?? [] })),
    auditLogs: auditRows,
  };
}

/**
 * Restores a data file over the user's current data. Every financial table is
 * wiped and repopulated from the file; the audit log is kept, and the restore
 * itself is recorded in it. Client IDs are preserved so mobile sync state
 * keeps working.
 */
export async function applyImport(userId: string, file: DataFile) {
  const before = await entityCounts(userId);

  await db.transaction(async (tx) => {
    // Children before parents; FKs are cascade or set-null, so this order is safe.
    const budgetIds = (await tx.select({ id: budgets.id }).from(budgets).where(eq(budgets.userId, userId))).map(
      (b) => b.id
    );
    if (budgetIds.length) {
      await tx.delete(budgetLines).where(inArray(budgetLines.budgetId, budgetIds));
      await tx.delete(budgets).where(inArray(budgets.id, budgetIds));
    }
    await tx.delete(goalPayments).where(eq(goalPayments.userId, userId));
    await tx.delete(goals).where(eq(goals.userId, userId));
    await tx.delete(debtPayments).where(eq(debtPayments.userId, userId));
    await tx.delete(debts).where(eq(debts.userId, userId));
    await tx.delete(expenses).where(eq(expenses.userId, userId));
    await tx.delete(income).where(eq(income.userId, userId));
    await tx.delete(depoTransfers).where(eq(depoTransfers.userId, userId));
    await tx.delete(depos).where(eq(depos.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(incomeSources).where(eq(incomeSources.userId, userId));
    await tx.delete(expenseCategories).where(eq(expenseCategories.userId, userId));

    const [categoryRows, sourceRows] = await Promise.all([
      tx
        .insert(expenseCategories)
        .values(file.expenseCategories.map((c) => ({ userId, name: c.name, isArchived: c.isArchived })))
        .onConflictDoNothing({ target: [expenseCategories.userId, expenseCategories.name] })
        .returning({ id: expenseCategories.id, name: expenseCategories.name }),
      tx
        .insert(incomeSources)
        .values(file.incomeSources.map((s) => ({ userId, name: s.name, isArchived: s.isArchived })))
        .onConflictDoNothing({ target: [incomeSources.userId, incomeSources.name] })
        .returning({ id: incomeSources.id, name: incomeSources.name }),
    ]);
    const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));
    const sourceIdByName = new Map(sourceRows.map((s) => [s.name, s.id]));

    if (file.depos.length)
      await tx
        .insert(depos)
        .values(file.depos.map((d) => ({ userId, ...d })))
        .onConflictDoNothing({ target: [depos.userId, depos.clientId] });
    if (file.debts.length)
      await tx
        .insert(debts)
        .values(file.debts.map((d) => ({ userId, ...d })))
        .onConflictDoNothing({ target: [debts.userId, debts.clientId] });
    if (file.goals.length)
      await tx
        .insert(goals)
        .values(
          file.goals.map((g) => ({
            userId,
            clientId: g.clientId,
            currentSaved: g.currentSaved ?? "0",
            name: g.name,
            targetAmount: g.targetAmount,
            minMonthlyContribution: g.minMonthlyContribution,
            notes: g.notes,
            deletedAt: g.deletedAt,
          }))
        )
        .onConflictDoNothing({ target: [goals.userId, goals.clientId] });
    if (file.subscriptions.length)
      await tx
        .insert(subscriptions)
        .values(
          file.subscriptions.map((s) => ({
            userId,
            clientId: s.clientId,
            name: s.name,
            categoryName: s.categoryName,
            billingCycle: s.billingCycle,
            billedAmount: s.billedAmount,
            startDate: new Date(s.startDate),
            endDate: s.endDate,
            status: s.status ?? "active",
            paymentsTrackedFrom: s.paymentsTrackedFrom ? new Date(s.paymentsTrackedFrom) : new Date(),
            notes: s.notes,
            deletedAt: s.deletedAt,
          }))
        )
        .onConflictDoNothing({ target: [subscriptions.userId, subscriptions.clientId] });

    const [depoIndex, debtIndex, goalIndex, subscriptionIndex] = await Promise.all([
      tx.select({ id: depos.id, clientId: depos.clientId }).from(depos).where(eq(depos.userId, userId)),
      tx.select({ id: debts.id, clientId: debts.clientId }).from(debts).where(eq(debts.userId, userId)),
      tx.select({ id: goals.id, clientId: goals.clientId }).from(goals).where(eq(goals.userId, userId)),
      tx.select({ id: subscriptions.id, clientId: subscriptions.clientId })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId)),
    ]);
    const depoMap = new Map(depoIndex.map((r) => [r.clientId, r.id] as const));
    const debtMap = new Map(debtIndex.map((r) => [r.clientId, r.id] as const));
    const goalMap = new Map(goalIndex.map((r) => [r.clientId, r.id] as const));
    const subscriptionMap = new Map(subscriptionIndex.map((r) => [r.clientId, r.id] as const));

    if (file.depoTransfers.length) {
      await tx
        .insert(depoTransfers)
        .values(
          file.depoTransfers
            .map((t) => {
              const fromDepoId = depoMap.get(t.fromDepoClientId);
              const toDepoId = depoMap.get(t.toDepoClientId);
              if (!fromDepoId || !toDepoId) return null;
              return {
                userId,
                clientId: t.clientId,
                fromDepoId,
                toDepoId,
                date: new Date(t.date),
                amount: t.amount,
                fee: t.fee ?? "0",
                description: t.description,
                deletedAt: t.deletedAt,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        )
        .onConflictDoNothing({ target: [depoTransfers.userId, depoTransfers.clientId] });
    }

    if (file.income.length) {
      await tx
        .insert(income)
        .values(
          file.income.map((r) => ({
            userId,
            clientId: r.clientId,
            date: new Date(r.date),
            appliedMonth: r.appliedMonth ?? null,
            sourceId: sourceIdByName.get(r.sourceName) ?? null,
            sourceName: r.sourceName,
            depoId: r.depoClientId ? (depoMap.get(r.depoClientId) ?? null) : null,
            description: r.description,
            amount: r.amount,
            notes: r.notes,
            deletedAt: r.deletedAt,
          }))
        )
        .onConflictDoNothing({ target: [income.userId, income.clientId] });
    }

    if (file.expenses.length) {
      await tx
        .insert(expenses)
        .values(
          file.expenses.map((r) => ({
            userId,
            clientId: r.clientId,
            date: new Date(r.date),
            categoryId: categoryIdByName.get(r.categoryName) ?? null,
            categoryName: r.categoryName,
            depoId: r.depoClientId ? (depoMap.get(r.depoClientId) ?? null) : null,
            subscriptionId: r.subscriptionClientId ? (subscriptionMap.get(r.subscriptionClientId) ?? null) : null,
            description: r.description,
            amount: r.amount,
            paid: r.paid,
            notes: r.notes,
            deletedAt: r.deletedAt,
          }))
        )
        .onConflictDoNothing({ target: [expenses.subscriptionId, expenses.date] });
    }

    if (file.debtPayments.length) {
      await tx
        .insert(debtPayments)
        .values(
          file.debtPayments
            .map((r) => {
              const debtId = debtMap.get(r.debtClientId);
              if (!debtId) return null;
              return {
                userId,
                clientId: r.clientId,
                debtId,
                date: new Date(r.date),
                description: r.description,
                amount: r.amount,
                notes: r.notes,
                deletedAt: r.deletedAt,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        )
        .onConflictDoNothing({ target: [debtPayments.userId, debtPayments.clientId] });
    }

    if (file.goalPayments.length) {
      await tx
        .insert(goalPayments)
        .values(
          file.goalPayments
            .map((r) => {
              const goalId = goalMap.get(r.goalClientId);
              if (!goalId) return null;
              return {
                userId,
                clientId: r.clientId,
                goalId,
                date: new Date(r.date),
                description: r.description,
                amount: r.amount,
                notes: r.notes,
                deletedAt: r.deletedAt,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        )
        .onConflictDoNothing({ target: [goalPayments.userId, goalPayments.clientId] });
    }

    for (const budget of file.budgets) {
      const [row] = await tx
        .insert(budgets)
        .values({
          userId,
          year: budget.year,
          month: budget.month,
          status: budget.status,
          lockedAt: budget.lockedAt,
        })
        .onConflictDoNothing({ target: [budgets.userId, budgets.year, budgets.month] })
        .returning({ id: budgets.id });
      if (!row) continue;
      if (budget.lines?.length) {
        await tx
          .insert(budgetLines)
          .values(
            budget.lines.map((l) => ({
              budgetId: row.id,
              kind: l.kind,
              label: l.label,
              plannedAmount: l.plannedAmount,
            }))
          )
          .onConflictDoNothing({ target: [budgetLines.budgetId, budgetLines.kind, budgetLines.label] });
      }
    }

    await tx
      .update(users)
      .set({
        name: file.user.name,
        currency: file.user.currency,
        savingsRate: file.user.savingsRate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx.insert(auditLogs).values({
      userId,
      entityType: "account",
      entityId: userId,
      action: "import",
      before: { replaced: before },
      after: {
        imported: {
          expenseCategories: file.expenseCategories.length,
          incomeSources: file.incomeSources.length,
          depos: file.depos.length,
          income: file.income.length,
          expenses: file.expenses.length,
          subscriptions: file.subscriptions.length,
          debts: file.debts.length,
          goals: file.goals.length,
          budgets: file.budgets.length,
        },
      },
      source: "web",
    });
  });

  if (file.subscriptions.length > 0) {
    await syncBudgetLinesForUser(userId);
    await generateSubscriptionCharges(userId);
  }

  return { before, after: await entityCounts(userId) };
}

/**
 * Wipes the account and everything that belongs to it. The deletion is
 * recorded first inside the same transaction; that audit row keeps a snapshot
 * of the account and survives the wipe because audit_logs.user_id is SET NULL.
 */
export async function deleteAccount(userId: string, source: "web" | "mobile" = "web") {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const counts = await entityCounts(userId);

  await db.transaction(async (tx) => {
    await tx.insert(auditLogs).values({
      userId,
      entityType: "account",
      entityId: userId,
      action: "account_deletion",
      before: {
        email: user.email,
        name: user.name,
        currency: user.currency,
        memberSince: user.createdAt,
        counts,
      },
      source,
    });

    await tx.delete(users).where(eq(users.id, userId));
  });
}
