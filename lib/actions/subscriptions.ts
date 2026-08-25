"use server";

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { SubscriptionSchema, type FormState } from "@/lib/validation/entities";
import { syncBudgetLinesForUser } from "@/lib/actions/budgets";

export async function createSubscription(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = SubscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      name: parsed.data.name,
      categoryName: parsed.data.categoryName,
      billingCycle: parsed.data.billingCycle,
      billedAmount: parsed.data.billedAmount.toFixed(2),
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "subscription",
    entityId: row.id,
    action: "create",
    after: row,
  });

  await syncBudgetLinesForUser(user.id);

  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard");
}

export async function cancelSubscription(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (!existing) return;

  const [updated] = await db
    .update(subscriptions)
    .set({ status: "cancelled", endDate: new Date(), updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "subscription",
    entityId: id,
    action: "update",
    before: existing,
    after: updated,
  });

  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard");
}

export async function deleteSubscription(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (!existing) return;

  await db
    .update(subscriptions)
    .set({ deletedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));

  await recordAudit({
    userId: user.id,
    entityType: "subscription",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard");
}
