import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { debtPayments, debts } from "@/lib/db/schema";

const num = (v: string | number | null | undefined) => (v ? Number(v) : 0);

export type DebtWithBalance = {
  id: string;
  name: string;
  lenderType: string | null;
  originalAmount: number;
  interestRate: number;
  minMonthlyPayment: number;
  paidToDate: number;
  currentBalance: number;
  percentPaidOff: number;
  notes: string | null;
};

export async function getDebtsWithBalances(userId: string): Promise<DebtWithBalance[]> {
  const [debtRows, paymentRows] = await Promise.all([
    db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt))),
    db
      .select()
      .from(debtPayments)
      .where(and(eq(debtPayments.userId, userId), isNull(debtPayments.deletedAt))),
  ]);

  const paidByDebt = new Map<string, number>();
  for (const p of paymentRows) {
    paidByDebt.set(p.debtId, (paidByDebt.get(p.debtId) ?? 0) + num(p.amount));
  }

  return debtRows.map((d) => {
    const paidToDate = paidByDebt.get(d.id) ?? 0;
    const originalAmount = num(d.originalAmount);
    const currentBalance = Math.max(originalAmount - paidToDate, 0);
    return {
      id: d.id,
      name: d.name,
      lenderType: d.lenderType,
      originalAmount,
      interestRate: num(d.interestRate),
      minMonthlyPayment: num(d.minMonthlyPayment),
      paidToDate,
      currentBalance,
      percentPaidOff: originalAmount > 0 ? paidToDate / originalAmount : 0,
      notes: d.notes,
    };
  });
}

export async function getDebtPaymentHistory(userId: string, debtId: string) {
  return db
    .select()
    .from(debtPayments)
    .where(
      and(
        eq(debtPayments.userId, userId),
        eq(debtPayments.debtId, debtId),
        isNull(debtPayments.deletedAt)
      )
    )
    .orderBy(debtPayments.date);
}
