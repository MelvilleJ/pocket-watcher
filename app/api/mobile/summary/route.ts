import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authenticateMobileRequest, periodParams, unauthorized } from "@/lib/auth/mobile-request";
import { getCategoryBreakdown, getMoneyInOutSummary, getMonthByMonthSummary } from "@/lib/queries/summary";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listDeposWithBalances } from "@/lib/queries/depos";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const { year, monthIndex } = periodParams(request);
  const [[user], { selected, ytd }, months, categories, debts, depos] = await Promise.all([
    db.select({ savingsRate: users.savingsRate }).from(users).where(eq(users.id, session.userId)).limit(1),
    getMoneyInOutSummary(session.userId, year, monthIndex),
    getMonthByMonthSummary(session.userId, year),
    getCategoryBreakdown(session.userId, year, monthIndex),
    getDebtsWithBalances(session.userId),
    listDeposWithBalances(session.userId),
  ]);

  return NextResponse.json({
    year,
    monthIndex,
    savingsRate: Number(user?.savingsRate ?? 0),
    selected,
    ytd,
    months: months.map((m) => ({
      monthIndex: m.month.getMonth(),
      income: m.income,
      expenses: m.expenses,
      subscriptions: m.subscriptions,
      debtPayments: m.debtPayments,
    })),
    categories: categories.filter((c) => c.month > 0).map((c) => ({ category: c.category, value: c.month })),
    outstandingDebt: debts.reduce((sum, d) => sum + d.currentBalance, 0),
    depos,
  });
}
