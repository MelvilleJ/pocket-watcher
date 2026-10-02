import "server-only";
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, lte, or, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { depoTransfers, depos, expenses, income } from "@/lib/db/schema";

export type DepoWithBalance = {
  id: string;
  name: string;
  kind: string;
  color: string;
  icon: string;
  openingBalance: number;
  balance: number;
};

export type TransactionType = "income" | "expense" | "transfer";

export type TransactionRow = {
  id: string;
  type: TransactionType;
  date: Date;
  createdAt: Date;
  title: string;
  description: string | null;
  amount: number;
  fee: number;
  depoId: string | null;
  toDepoId: string | null;
  appliedMonth: string | null;
  paid: boolean;
};

const totalsByDepo = (rows: { depoId: string | null; total: string | null }[]) =>
  new Map(rows.filter((r) => r.depoId).map((r) => [r.depoId as string, Number(r.total ?? 0)]));

export async function listDepos(userId: string) {
  return db
    .select()
    .from(depos)
    .where(and(eq(depos.userId, userId), isNull(depos.deletedAt)))
    .orderBy(asc(depos.createdAt));
}

export async function listDeposWithBalances(userId: string): Promise<DepoWithBalance[]> {
  const [depoRows, incomeTotals, expenseTotals, transfersOut, transfersIn] = await Promise.all([
    listDepos(userId),
    db
      .select({ depoId: income.depoId, total: sum(income.amount) })
      .from(income)
      .where(and(eq(income.userId, userId), isNull(income.deletedAt), isNotNull(income.depoId)))
      .groupBy(income.depoId),
    db
      .select({ depoId: expenses.depoId, total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          isNull(expenses.deletedAt),
          isNotNull(expenses.depoId),
          eq(expenses.paid, true)
        )
      )
      .groupBy(expenses.depoId),
    db
      .select({
        depoId: depoTransfers.fromDepoId,
        total: sql<string>`sum(${depoTransfers.amount} + ${depoTransfers.fee})`,
      })
      .from(depoTransfers)
      .where(and(eq(depoTransfers.userId, userId), isNull(depoTransfers.deletedAt)))
      .groupBy(depoTransfers.fromDepoId),
    db
      .select({ depoId: depoTransfers.toDepoId, total: sum(depoTransfers.amount) })
      .from(depoTransfers)
      .where(and(eq(depoTransfers.userId, userId), isNull(depoTransfers.deletedAt)))
      .groupBy(depoTransfers.toDepoId),
  ]);

  const incomeMap = totalsByDepo(incomeTotals);
  const expenseMap = totalsByDepo(expenseTotals);
  const outMap = totalsByDepo(transfersOut);
  const inMap = totalsByDepo(transfersIn);

  return depoRows.map((depo) => {
    const openingBalance = Number(depo.openingBalance);
    return {
      id: depo.id,
      name: depo.name,
      kind: depo.kind,
      color: depo.color,
      icon: depo.icon,
      openingBalance,
      balance:
        openingBalance +
        (incomeMap.get(depo.id) ?? 0) -
        (expenseMap.get(depo.id) ?? 0) +
        (inMap.get(depo.id) ?? 0) -
        (outMap.get(depo.id) ?? 0),
    };
  });
}

export async function listTransactions(
  userId: string,
  filters: { depoId?: string; type?: TransactionType } = {},
  limit = 200
): Promise<TransactionRow[]> {
  const { depoId, type } = filters;
  const wants = (t: TransactionType) => !type || type === t;

  const [incomeRows, expenseRows, transferRows] = await Promise.all([
    wants("income")
      ? db
          .select()
          .from(income)
          .where(
            and(eq(income.userId, userId), isNull(income.deletedAt), depoId ? eq(income.depoId, depoId) : undefined)
          )
          .orderBy(desc(income.date), desc(income.createdAt))
          .limit(limit)
      : [],
    wants("expense")
      ? db
          .select()
          .from(expenses)
          .where(
            and(
              eq(expenses.userId, userId),
              isNull(expenses.deletedAt),
              depoId ? eq(expenses.depoId, depoId) : undefined
            )
          )
          .orderBy(desc(expenses.date), desc(expenses.createdAt))
          .limit(limit)
      : [],
    wants("transfer")
      ? db
          .select()
          .from(depoTransfers)
          .where(
            and(
              eq(depoTransfers.userId, userId),
              isNull(depoTransfers.deletedAt),
              depoId ? or(eq(depoTransfers.fromDepoId, depoId), eq(depoTransfers.toDepoId, depoId)) : undefined
            )
          )
          .orderBy(desc(depoTransfers.date), desc(depoTransfers.createdAt))
          .limit(limit)
      : [],
  ]);

  const rows: TransactionRow[] = [
    ...incomeRows.map((r) => ({
      id: r.id,
      type: "income" as const,
      date: r.date,
      createdAt: r.createdAt,
      title: r.sourceName,
      description: r.description,
      amount: Number(r.amount),
      fee: 0,
      depoId: r.depoId,
      toDepoId: null,
      appliedMonth: r.appliedMonth,
      paid: true,
    })),
    ...expenseRows.map((r) => ({
      id: r.id,
      type: "expense" as const,
      date: r.date,
      createdAt: r.createdAt,
      title: r.categoryName,
      description: r.description,
      amount: Number(r.amount),
      fee: 0,
      depoId: r.depoId,
      toDepoId: null,
      appliedMonth: null,
      paid: r.paid,
    })),
    ...transferRows.map((r) => ({
      id: r.id,
      type: "transfer" as const,
      date: r.date,
      createdAt: r.createdAt,
      title: "Transfer",
      description: r.description,
      amount: Number(r.amount),
      fee: Number(r.fee),
      depoId: r.fromDepoId,
      toDepoId: r.toDepoId,
      appliedMonth: null,
      paid: true,
    })),
  ];

  return rows
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function getDepoNameLookup(userId: string) {
  const rows = await db
    .select({ id: depos.id, name: depos.name, color: depos.color, icon: depos.icon, deletedAt: depos.deletedAt })
    .from(depos)
    .where(eq(depos.userId, userId));
  return new Map(rows.map((r) => [r.id, r]));
}

export const TRANSFER_FEE_CATEGORY = "Transfer fees";

// Transfer fees are real spending, so they are reported alongside expenses.
export async function listTransferFeesAsExpenses(userId: string, start: Date, end: Date) {
  const rows = await db
    .select({ date: depoTransfers.date, amount: depoTransfers.fee })
    .from(depoTransfers)
    .where(
      and(
        eq(depoTransfers.userId, userId),
        isNull(depoTransfers.deletedAt),
        gt(depoTransfers.fee, "0"),
        gte(depoTransfers.date, start),
        lte(depoTransfers.date, end)
      )
    );
  return rows.map((r) => ({ ...r, categoryName: TRANSFER_FEE_CATEGORY }));
}
