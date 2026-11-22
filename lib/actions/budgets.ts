"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { setBudgetLinePlanned, setBudgetLocked } from "@/lib/budgets";

export async function updateBudgetLine(formData: FormData) {
  const user = await requireUser();
  const lineId = String(formData.get("lineId"));
  const amount = Number(formData.get("plannedAmount"));

  if (!lineId || !Number.isFinite(amount)) return;

  if (await setBudgetLinePlanned(user.id, lineId, amount)) revalidatePath("/dashboard/budget");
}

export async function lockBudget(budgetId: string) {
  const user = await requireUser();
  if (await setBudgetLocked(user.id, budgetId, true)) revalidatePath("/dashboard/budget");
}

export async function unlockBudget(budgetId: string) {
  const user = await requireUser();
  if (await setBudgetLocked(user.id, budgetId, false)) revalidatePath("/dashboard/budget");
}
