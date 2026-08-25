import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgetLines, budgets } from "@/lib/db/schema";

export async function getBudgetForPeriod(userId: string, year: number, month: number) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.year, year), eq(budgets.month, month)))
    .limit(1);

  if (!budget) return null;

  const lines = await db
    .select()
    .from(budgetLines)
    .where(eq(budgetLines.budgetId, budget.id))
    .orderBy(asc(budgetLines.kind), asc(budgetLines.label));

  return { budget, lines };
}
