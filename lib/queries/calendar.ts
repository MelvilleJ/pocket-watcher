import "server-only";
import { and, eq, gte, isNull, lte, min } from "drizzle-orm";
import { db } from "@/lib/db";
import { debtPayments, debts, expenses, goalPayments, goals, income, subscriptions } from "@/lib/db/schema";
import { listTransferFeesAsExpenses } from "@/lib/queries/depos";

export type CalendarDay = {
  day: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  goalPayments: number;
};

export type CalendarMonth = {
  monthIndex: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  goalPayments: number;
  totalOut: number;
  net: number;
  days: CalendarDay[];
};

const num = (value: string | number) => Number(value);

function dayOfMonth(date: Date) {
  return Number(date.toISOString().slice(8, 10));
}

export async function getCalendarMonths(userId: string, year: number): Promise<CalendarMonth[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [incomeRows, loggedExpenseRows, debtPaymentRows, goalPaymentRows, activeDebts, activeGoals, transferFeeRows] =
    await Promise.all([
      db
        .select()
        .from(income)
        .where(and(eq(income.userId, userId), isNull(income.deletedAt), gte(income.date, start), lte(income.date, end))),
      db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            isNull(expenses.deletedAt),
            eq(expenses.paid, true),
            gte(expenses.date, start),
            lte(expenses.date, end)
          )
        ),
      db
        .select()
        .from(debtPayments)
        .where(and(eq(debtPayments.userId, userId), isNull(debtPayments.deletedAt), gte(debtPayments.date, start), lte(debtPayments.date, end))),
      db
        .select()
        .from(goalPayments)
        .where(and(eq(goalPayments.userId, userId), isNull(goalPayments.deletedAt), gte(goalPayments.date, start), lte(goalPayments.date, end))),
      db.select({ id: debts.id }).from(debts).where(and(eq(debts.userId, userId), isNull(debts.deletedAt))),
      db.select({ id: goals.id }).from(goals).where(and(eq(goals.userId, userId), isNull(goals.deletedAt))),
      listTransferFeesAsExpenses(userId, start, end),
    ]);
  const expenseRows = [...loggedExpenseRows.filter((row) => !row.subscriptionId), ...transferFeeRows];
  const subscriptionChargeRows = loggedExpenseRows.filter((row) => row.subscriptionId);

  const activeDebtIds = new Set(activeDebts.map((debt) => debt.id));
  const activeGoalIds = new Set(activeGoals.map((goal) => goal.id));

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const days = new Map<number, CalendarDay>();
    const add = (day: number, field: keyof Omit<CalendarDay, "day">, amount: number) => {
      const current = days.get(day) ?? { day, income: 0, expenses: 0, subscriptions: 0, debtPayments: 0, goalPayments: 0 };
      current[field] += amount;
      days.set(day, current);
    };

    for (const row of incomeRows) {
      if (row.date.getUTCMonth() === monthIndex) add(dayOfMonth(row.date), "income", num(row.amount));
    }
    for (const row of expenseRows) {
      if (row.date.getUTCMonth() === monthIndex) add(dayOfMonth(row.date), "expenses", num(row.amount));
    }
    for (const row of subscriptionChargeRows) {
      if (row.date.getUTCMonth() === monthIndex) add(dayOfMonth(row.date), "subscriptions", num(row.amount));
    }
    for (const row of debtPaymentRows) {
      if (row.date.getUTCMonth() === monthIndex && activeDebtIds.has(row.debtId)) {
        add(dayOfMonth(row.date), "debtPayments", num(row.amount));
      }
    }
    for (const row of goalPaymentRows) {
      if (row.date.getUTCMonth() === monthIndex && activeGoalIds.has(row.goalId)) {
        add(dayOfMonth(row.date), "goalPayments", num(row.amount));
      }
    }

    const dayValues = Array.from(days.values()).sort((a, b) => a.day - b.day);
    const incomeTotal = dayValues.reduce((sum, day) => sum + day.income, 0);
    const expenseTotal = dayValues.reduce((sum, day) => sum + day.expenses, 0);
    const debtTotal = dayValues.reduce((sum, day) => sum + day.debtPayments, 0);
    const goalTotal = dayValues.reduce((sum, day) => sum + day.goalPayments, 0);
    const subscriptionTotal = dayValues.reduce((sum, day) => sum + day.subscriptions, 0);
    const totalOut = expenseTotal + subscriptionTotal + debtTotal + goalTotal;

    return {
      monthIndex,
      income: incomeTotal,
      expenses: expenseTotal,
      subscriptions: subscriptionTotal,
      debtPayments: debtTotal,
      goalPayments: goalTotal,
      totalOut,
      net: incomeTotal - totalOut,
      days: dayValues,
    };
  });
}

export async function getEarliestActivityYear(userId: string): Promise<number> {
  const earliest = await Promise.all([
    db.select({ value: min(income.date) }).from(income).where(and(eq(income.userId, userId), isNull(income.deletedAt))),
    db.select({ value: min(expenses.date) }).from(expenses).where(and(eq(expenses.userId, userId), isNull(expenses.deletedAt))),
    db.select({ value: min(debtPayments.date) }).from(debtPayments).where(and(eq(debtPayments.userId, userId), isNull(debtPayments.deletedAt))),
    db.select({ value: min(goalPayments.date) }).from(goalPayments).where(and(eq(goalPayments.userId, userId), isNull(goalPayments.deletedAt))),
    db.select({ value: min(subscriptions.startDate) }).from(subscriptions).where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt))),
  ]);

  const years = earliest
    .map(([row]) => row?.value)
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getUTCFullYear());

  return years.length > 0 ? Math.min(...years) : new Date().getFullYear();
}
