"use server";

import { randomUUID } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { income } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { IncomeSchema, type FormState } from "@/lib/validation/entities";
import { parseLocalDate } from "@/lib/utils/date";

export async function createIncome(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = IncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .insert(income)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      date: parseLocalDate(parsed.data.date),
      appliedMonth: parsed.data.appliedMonth,
      sourceName: parsed.data.sourceName,
      description: parsed.data.description || null,
      amount: parsed.data.amount.toFixed(2),
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "income",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/dashboard/income");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard");
}

export async function deleteIncome(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(income)
    .where(and(eq(income.id, id), eq(income.userId, user.id), isNull(income.deletedAt)))
    .limit(1);

  if (!existing) return;

  await db
    .update(income)
    .set({ deletedAt: new Date() })
    .where(and(eq(income.id, id), eq(income.userId, user.id), isNull(income.deletedAt)));

  await recordAudit({
    userId: user.id,
    entityType: "income",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/income");
  revalidatePath("/dashboard");
}
