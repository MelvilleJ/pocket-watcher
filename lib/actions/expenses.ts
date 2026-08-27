"use server";

import { randomUUID } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { ExpenseSchema, type FormState } from "@/lib/validation/entities";

export async function createExpense(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const paid = formData.get("paid") === "true";
  const parsed = ExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .insert(expenses)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      date: new Date(parsed.data.date),
      categoryName: parsed.data.categoryName,
      description: parsed.data.description || null,
      amount: parsed.data.amount.toFixed(2),
      paid,
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "expense",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id), isNull(expenses.deletedAt)))
    .limit(1);

  if (!existing) return;

  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id), isNull(expenses.deletedAt)));

  await recordAudit({
    userId: user.id,
    entityType: "expense",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
}
