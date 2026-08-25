"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { budgetLines, budgets } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { getExpenseCategories, getIncomeSources } from "@/lib/queries/lists";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listSubscriptions } from "@/lib/queries/entries";
import { calcMonthlyCost } from "@/lib/finance/subscriptions";

type NewBudgetLine = {
  budgetId: string;
  kind: "income" | "expense" | "debt" | "subscription";
  label: string;
  plannedAmount: string;
};

async function budgetableLines(userId: string, budgetId: string): Promise<NewBudgetLine[]> {
  const [categories, sources, debts, subscriptions] = await Promise.all([
    getExpenseCategories(userId),
    getIncomeSources(userId),
    getDebtsWithBalances(userId),
    listSubscriptions(userId),
  ]);

  return [
    ...sources.map((s) => ({ budgetId, kind: "income" as const, label: s.name, plannedAmount: "0" })),
    ...categories.map((c) => ({ budgetId, kind: "expense" as const, label: c.name, plannedAmount: "0" })),
    ...debts
      .filter((d) => d.currentBalance > 0)
      .map((d) => ({ budgetId, kind: "debt" as const, label: d.name, plannedAmount: "0" })),
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

export async function ensureDraftBudget(year: number, month: number) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, user.id), eq(budgets.year, year), eq(budgets.month, month)))
    .limit(1);

  if (existing) {
    if (existing.status === "draft") {
      await backfillBudgetLines(user.id, existing.id);
    }
    return existing.id;
  }

  const [budget] = await db
    .insert(budgets)
    .values({ userId: user.id, year, month })
    .returning();

  await backfillBudgetLines(user.id, budget.id);

  await recordAudit({
    userId: user.id,
    entityType: "budget",
    entityId: budget.id,
    action: "create",
    after: budget,
  });

  return budget.id;
}

export async function updateBudgetLine(formData: FormData) {
  const user = await requireUser();
  const lineId = String(formData.get("lineId"));
  const amount = Number(formData.get("plannedAmount"));

  if (!lineId || Number.isNaN(amount)) return;

  const [line] = await db
    .select({ line: budgetLines, budget: budgets })
    .from(budgetLines)
    .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
    .where(and(eq(budgetLines.id, lineId), eq(budgets.userId, user.id)))
    .limit(1);

  if (!line || line.budget.status === "locked") return;

  await db
    .update(budgetLines)
    .set({ plannedAmount: amount.toFixed(2), updatedAt: new Date() })
    .where(eq(budgetLines.id, lineId));

  revalidatePath("/dashboard/budget");
}

export async function lockBudget(budgetId: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)))
    .limit(1);

  if (!existing || existing.status === "locked") return;

  const [updated] = await db
    .update(budgets)
    .set({ status: "locked", lockedAt: new Date(), updatedAt: new Date() })
    .where(eq(budgets.id, budgetId))
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "budget",
    entityId: budgetId,
    action: "update",
    before: existing,
    after: updated,
  });

  revalidatePath("/dashboard/budget");
}

export async function unlockBudget(budgetId: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)))
    .limit(1);

  if (!existing || existing.status === "draft") return;

  const [updated] = await db
    .update(budgets)
    .set({ status: "draft", lockedAt: null, updatedAt: new Date() })
    .where(eq(budgets.id, budgetId))
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "budget",
    entityId: budgetId,
    action: "update",
    before: existing,
    after: updated,
  });

  revalidatePath("/dashboard/budget");
}
