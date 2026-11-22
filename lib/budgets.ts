import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgetLines, budgets } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit";
import { getExpenseCategories, getIncomeSources } from "@/lib/queries/lists";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listSubscriptions } from "@/lib/queries/entries";
import { listGoalsForUser } from "@/lib/queries/goals";
import { getBudgetForPeriod } from "@/lib/queries/budgets";
import { getBudgetActuals } from "@/lib/queries/summary";
import { calcMonthlyCost } from "@/lib/finance/subscriptions";

type Source = "web" | "mobile";

type NewBudgetLine = {
  budgetId: string;
  kind: "income" | "expense" | "debt" | "goal" | "subscription";
  label: string;
  plannedAmount: string;
};

async function budgetableLines(userId: string, budgetId: string): Promise<NewBudgetLine[]> {
  const [categories, sources, debts, goals, subscriptions] = await Promise.all([
    getExpenseCategories(userId),
    getIncomeSources(userId),
    getDebtsWithBalances(userId),
    listGoalsForUser(userId),
    listSubscriptions(userId),
  ]);

  return [
    ...sources.map((s) => ({ budgetId, kind: "income" as const, label: s.name, plannedAmount: "0" })),
    ...categories.map((c) => ({ budgetId, kind: "expense" as const, label: c.name, plannedAmount: "0" })),
    ...debts
      .filter((d) => d.currentBalance > 0)
      .map((d) => ({ budgetId, kind: "debt" as const, label: d.name, plannedAmount: "0" })),
    ...goals
      .filter((goal) => Number(goal.currentSaved) < Number(goal.targetAmount))
      .map((goal) => ({
        budgetId,
        kind: "goal" as const,
        label: goal.name,
        plannedAmount: Number(goal.minMonthlyContribution).toFixed(2),
      })),
    ...subscriptions
      .filter((s) => s.status === "active")
      .map((s) => ({
        budgetId,
        kind: "subscription" as const,
        label: s.name,
        plannedAmount: calcMonthlyCost(s.billingCycle, Number(s.billedAmount)).toFixed(2),
      })),
  ];
}

async function backfillBudgetLines(userId: string, budgetId: string) {
  const lines = await budgetableLines(userId, budgetId);
  if (lines.length === 0) return;

  await db
    .insert(budgetLines)
    .values(lines)
    .onConflictDoNothing({ target: [budgetLines.budgetId, budgetLines.kind, budgetLines.label] });
}

export async function syncBudgetLinesForUser(userId: string) {
  const unlockedBudgets = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.status, "draft")));

  for (const budget of unlockedBudgets) {
    await backfillBudgetLines(userId, budget.id);
  }
}

export async function ensureDraftBudgetForUser(userId: string, year: number, month: number, source: Source = "web") {
  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.year, year), eq(budgets.month, month)))
    .limit(1);

  if (existing) {
    if (existing.status === "draft") {
      await backfillBudgetLines(userId, existing.id);
    }
    return existing.id;
  }

  const [budget] = await db.insert(budgets).values({ userId, year, month }).returning();
  await backfillBudgetLines(userId, budget.id);
  await recordAudit({ userId, entityType: "budget", entityId: budget.id, action: "create", after: budget, source });

  return budget.id;
}

export async function setBudgetLinePlanned(userId: string, lineId: string, amount: number) {
  const [line] = await db
    .select({ line: budgetLines, budget: budgets })
    .from(budgetLines)
    .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
    .where(and(eq(budgetLines.id, lineId), eq(budgets.userId, userId)))
    .limit(1);

  if (!line || line.budget.status === "locked") return false;

  await db
    .update(budgetLines)
    .set({ plannedAmount: amount.toFixed(2), updatedAt: new Date() })
    .where(eq(budgetLines.id, lineId));

  return true;
}

export async function setBudgetLocked(userId: string, budgetId: string, locked: boolean, source: Source = "web") {
  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
    .limit(1);

  const targetStatus = locked ? "locked" : "draft";
  if (!existing || existing.status === targetStatus) return false;

  const [updated] = await db
    .update(budgets)
    .set({ status: targetStatus, lockedAt: locked ? new Date() : null, updatedAt: new Date() })
    .where(eq(budgets.id, budgetId))
    .returning();

  await recordAudit({
    userId,
    entityType: "budget",
    entityId: budgetId,
    action: "update",
    before: existing,
    after: updated,
    source,
  });

  return true;
}

export type BudgetViewLine = {
  id: string;
  label: string;
  plannedAmount: number;
  actual: number;
  monthlyCost?: number;
};

export async function getBudgetView(userId: string, year: number, monthIndex: number, source: Source = "web") {
  const month = monthIndex + 1;
  await ensureDraftBudgetForUser(userId, year, month, source);

  const [data, actuals, subscriptions, debts, goals] = await Promise.all([
    getBudgetForPeriod(userId, year, month),
    getBudgetActuals(userId, year, monthIndex),
    listSubscriptions(userId),
    getDebtsWithBalances(userId),
    listGoalsForUser(userId),
  ]);
  if (!data) return null;

  const { budget, lines } = data;
  const isLocked = budget.status === "locked";
  const { incomeBySource, expenseByCategory, subscriptionByName, debtPaymentsByName, goalPaymentsByName } = actuals;

  const activeDebtNames = new Set(debts.map((debt) => debt.name));
  const activeGoalNames = new Set(goals.map((goal) => goal.name));
  const activeSubscriptionNames = new Set(subscriptions.filter((s) => s.status === "active").map((s) => s.name));
  const subscriptionMonthlyCostByName = new Map(
    subscriptions.map((s) => [s.name, calcMonthlyCost(s.billingCycle, Number(s.billedAmount))])
  );

  const toView = (kind: string, actualByLabel: Map<string, number>, keep: (label: string) => boolean = () => true) =>
    lines
      .filter((l) => l.kind === kind && keep(l.label))
      .map((l) => ({
        id: l.id,
        label: l.label,
        plannedAmount: Number(l.plannedAmount),
        actual: actualByLabel.get(l.label) ?? 0,
      }));

  const income = toView("income", incomeBySource);
  const expenses = toView("expense", expenseByCategory);
  const debtLines = toView("debt", debtPaymentsByName, (label) => activeDebtNames.has(label));
  const goalLines = toView("goal", goalPaymentsByName, (label) => activeGoalNames.has(label));
  const subscriptionLines: BudgetViewLine[] = toView(
    "subscription",
    subscriptionByName,
    (label) => isLocked || activeSubscriptionNames.has(label)
  ).map((l) => ({ ...l, monthlyCost: subscriptionMonthlyCostByName.get(l.label) ?? l.plannedAmount }));

  const sumPlanned = (rows: BudgetViewLine[]) => rows.reduce((s, l) => s + l.plannedAmount, 0);
  const sumActual = (byLabel: Map<string, number>) => Array.from(byLabel.values()).reduce((s, v) => s + v, 0);

  return {
    budget: { id: budget.id, year, monthIndex, status: budget.status, isLocked },
    lines: { income, expenses, subscriptions: subscriptionLines, debts: debtLines, goals: goalLines },
    totals: {
      plannedIncome: sumPlanned(income),
      plannedExpense: sumPlanned(expenses),
      plannedSubscriptions: sumPlanned(subscriptionLines),
      plannedDebt: sumPlanned(debtLines),
      plannedGoals: sumPlanned(goalLines),
      actualIncome: sumActual(incomeBySource),
      actualExpense: sumActual(expenseByCategory),
      actualSubscriptions: sumActual(subscriptionByName),
      actualDebt: sumActual(debtPaymentsByName),
      actualGoals: sumActual(goalPaymentsByName),
    },
  };
}

export type BudgetView = NonNullable<Awaited<ReturnType<typeof getBudgetView>>>;
