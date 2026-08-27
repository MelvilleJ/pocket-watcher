import "server-only";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { debtPayments, debts, expenses, goalPayments, goals, income, subscriptions } from "@/lib/db/schema";
import { calcMonthlyCost, isSubscriptionActiveInMonth } from "@/lib/finance/subscriptions";

export type MonthSummary = {
  month: Date;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  totalOut: number;
  net: number;
  cumulativeNet: number;
};

export type CategoryBreakdown = {
  category: string;
  month: number;
  ytd: number;
};

const num = (v: string | number | null | undefined) => (v ? Number(v) : 0);

function monthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getYearRawData(userId: string, year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const [incomeRows, expenseRows, allSubs, debtPaymentRows, goalPaymentRows] = await Promise.all([
    db
      .select()
      .from(income)
      .where(
        and(
          eq(income.userId, userId),
          isNull(income.deletedAt),
          gte(income.date, yearStart),
          lte(income.date, yearEnd)
        )
      ),
    db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          isNull(expenses.deletedAt),
          gte(expenses.date, yearStart),
          lte(expenses.date, yearEnd)
        )
      ),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
    db
      .select()
      .from(debtPayments)
      .where(
        and(
          eq(debtPayments.userId, userId),
          isNull(debtPayments.deletedAt),
          gte(debtPayments.date, yearStart),
          lte(debtPayments.date, yearEnd)
        )
      ),
    db
      .select()
      .from(goalPayments)
      .where(
        and(
          eq(goalPayments.userId, userId),
          isNull(goalPayments.deletedAt),
          gte(goalPayments.date, yearStart),
          lte(goalPayments.date, yearEnd)
        )
      ),
  ]);

  return { incomeRows, expenseRows, allSubs, debtPaymentRows, goalPaymentRows };
}

export async function getMonthByMonthSummary(
  userId: string,
  year: number
): Promise<MonthSummary[]> {
  const { incomeRows, expenseRows, allSubs, debtPaymentRows } = await getYearRawData(
    userId,
    year
  );

  const months: MonthSummary[] = [];
  let cumulativeNet = 0;

  for (let m = 0; m < 12; m++) {
    const { start, end } = monthRange(year, m);

    const monthIncome = incomeRows
      .filter((r) => r.date >= start && r.date <= end)
      .reduce((sum, r) => sum + num(r.amount), 0);

    const monthExpenses = expenseRows
      .filter((r) => r.date >= start && r.date <= end)
      .reduce((sum, r) => sum + num(r.amount), 0);

    const monthSubs = allSubs
      .filter((s) => isSubscriptionActiveInMonth(s.startDate, s.endDate, start))
      .reduce((sum, s) => sum + calcMonthlyCost(s.billingCycle, num(s.billedAmount)), 0);

    const monthDebt = debtPaymentRows
      .filter((r) => r.date >= start && r.date <= end)
      .reduce((sum, r) => sum + num(r.amount), 0);

    const totalOut = monthExpenses + monthSubs + monthDebt;
    const net = monthIncome - totalOut;
    cumulativeNet += net;

    months.push({
      month: start,
      income: monthIncome,
      expenses: monthExpenses,
      subscriptions: monthSubs,
      debtPayments: monthDebt,
      totalOut,
      net,
      cumulativeNet,
    });
  }

  return months;
}

export async function getCategoryBreakdown(
  userId: string,
  year: number,
  monthIndex: number
): Promise<CategoryBreakdown[]> {
  const { start, end } = monthRange(year, monthIndex);
  const { expenseRows } = await getYearRawData(userId, year);

  const byCategory = new Map<string, { month: number; ytd: number }>();

  for (const row of expenseRows) {
    if (row.date > end) continue;
    const entry = byCategory.get(row.categoryName) ?? { month: 0, ytd: 0 };
    entry.ytd += num(row.amount);
    if (row.date >= start && row.date <= end) {
      entry.month += num(row.amount);
    }
    byCategory.set(row.categoryName, entry);
  }

  return Array.from(byCategory.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.ytd - a.ytd);
}

export async function getBudgetActuals(userId: string, year: number, monthIndex: number) {
  const { start, end } = monthRange(year, monthIndex);
  const { incomeRows, expenseRows, allSubs, debtPaymentRows, goalPaymentRows } = await getYearRawData(userId, year);

  const incomeBySource = new Map<string, number>();
  for (const row of incomeRows) {
    if (row.date < start || row.date > end) continue;
    incomeBySource.set(row.sourceName, (incomeBySource.get(row.sourceName) ?? 0) + num(row.amount));
  }

  const expenseByCategory = new Map<string, number>();
  for (const row of expenseRows) {
    if (row.date < start || row.date > end) continue;
    expenseByCategory.set(
      row.categoryName,
      (expenseByCategory.get(row.categoryName) ?? 0) + num(row.amount)
    );
  }

  const subscriptionByName = new Map<string, number>();
  for (const s of allSubs) {
    if (!isSubscriptionActiveInMonth(s.startDate, s.endDate, start)) continue;
    const cost = calcMonthlyCost(s.billingCycle, num(s.billedAmount));
    subscriptionByName.set(s.name, (subscriptionByName.get(s.name) ?? 0) + cost);
  }

  const debtNameById = new Map(
    (await db.select({ id: debts.id, name: debts.name }).from(debts).where(eq(debts.userId, userId))).map(
      (d) => [d.id, d.name] as const
    )
  );
  const debtPaymentsByName = new Map<string, number>();
  for (const row of debtPaymentRows) {
    if (row.date < start || row.date > end) continue;
    const name = debtNameById.get(row.debtId);
    if (!name) continue;
    debtPaymentsByName.set(name, (debtPaymentsByName.get(name) ?? 0) + num(row.amount));
  }

  const goalNameById = new Map(
    (await db.select({ id: goals.id, name: goals.name }).from(goals).where(eq(goals.userId, userId))).map(
      (goal) => [goal.id, goal.name] as const
    )
  );
  const goalPaymentsByName = new Map<string, number>();
  for (const row of goalPaymentRows) {
    if (row.date < start || row.date > end) continue;
    const name = goalNameById.get(row.goalId);
    if (!name) continue;
    goalPaymentsByName.set(name, (goalPaymentsByName.get(name) ?? 0) + num(row.amount));
  }

  return { incomeBySource, expenseByCategory, subscriptionByName, debtPaymentsByName, goalPaymentsByName };
}

export async function getMoneyInOutSummary(userId: string, year: number, monthIndex: number) {
  const months = await getMonthByMonthSummary(userId, year);
  const selected = months[monthIndex];

  const ytd = months.slice(0, monthIndex + 1).reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      subscriptions: acc.subscriptions + m.subscriptions,
      debtPayments: acc.debtPayments + m.debtPayments,
      totalOut: acc.totalOut + m.totalOut,
      net: acc.net + m.net,
    }),
    { income: 0, expenses: 0, subscriptions: 0, debtPayments: 0, totalOut: 0, net: 0 }
  );

  return { selected, ytd };
}
