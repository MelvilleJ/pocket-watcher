"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { goalPayments, goals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { GoalPaymentSchema, GoalSchema, type FormState } from "@/lib/validation/entities";
import { parseLocalDate } from "@/lib/utils/date";

export async function createGoal(_state: FormState, formData: FormData) {
  const user = await requireUser();
  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .insert(goals)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount.toFixed(2),
      currentSaved: (parsed.data.currentSaved ?? 0).toFixed(2),
      minMonthlyContribution: (parsed.data.minMonthlyContribution ?? 0).toFixed(2),
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "goal",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}

export async function createGoalPayment(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = GoalPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [goal] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, user.id), isNull(goals.deletedAt)))
    .limit(1);

  if (!goal) return { error: "Goal not found." };

  const amount = parsed.data.amount.toFixed(2);
  const row = await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(goalPayments)
      .values({
        userId: user.id,
        goalId: parsed.data.goalId,
        clientId: randomUUID(),
        date: parseLocalDate(parsed.data.date),
        description: parsed.data.description || null,
        amount,
        notes: parsed.data.notes || null,
      })
      .returning();

    await tx
      .update(goals)
      .set({ currentSaved: sql`${goals.currentSaved} + ${amount}`, updatedAt: new Date() })
      .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, user.id)));

    return payment;
  });

  await recordAudit({
    userId: user.id,
    entityType: "goal_payment",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoalPayment(id: string) {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(goalPayments)
    .where(and(eq(goalPayments.id, id), eq(goalPayments.userId, user.id), isNull(goalPayments.deletedAt)))
    .limit(1);

  if (!existing) return;

  await db.transaction(async (tx) => {
    await tx
      .update(goalPayments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(goalPayments.id, id), eq(goalPayments.userId, user.id)));

    await tx
      .update(goals)
      .set({
        currentSaved: sql`greatest(${goals.currentSaved} - ${existing.amount}, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, existing.goalId), eq(goals.userId, user.id)));
  });

  await recordAudit({
    userId: user.id,
    entityType: "goal_payment",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}

export async function updateGoal(_state: FormState, formData: FormData) {
  const user = await requireUser();
  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const id = String(formData.get("id"));
  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user.id), isNull(goals.deletedAt)))
    .limit(1);
  if (!existing) return { error: "Goal not found" };

  await db
    .update(goals)
    .set({
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount.toFixed(2),
      currentSaved: Number(parsed.data.currentSaved ?? existing.currentSaved).toFixed(2),
      minMonthlyContribution: Number(parsed.data.minMonthlyContribution ?? existing.minMonthlyContribution).toFixed(2),
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id), isNull(goals.deletedAt)));

  await recordAudit({
    userId: user.id,
    entityType: "goal",
    entityId: id,
    action: "update",
    before: existing,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user.id), isNull(goals.deletedAt)))
    .limit(1);

  if (!existing) return;

  await db
    .update(goals)
    .set({ deletedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id), isNull(goals.deletedAt)));

  await recordAudit({
    userId: user.id,
    entityType: "goal",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}
