"use server";

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { debts, debtPayments } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { DebtSchema, DebtPaymentSchema, type FormState } from "@/lib/validation/entities";
import { syncBudgetLinesForUser } from "@/lib/actions/budgets";

export async function createDebt(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = DebtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .insert(debts)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      name: parsed.data.name,
      lenderType: parsed.data.lenderType || null,
      originalAmount: parsed.data.originalAmount.toFixed(2),
      interestRate: parsed.data.interestRate.toFixed(4),
      minMonthlyPayment: parsed.data.minMonthlyPayment.toFixed(2),
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "debt",
    entityId: row.id,
    action: "create",
    after: row,
  });

  await syncBudgetLinesForUser(user.id);

  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard");
}

export async function deleteDebt(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, user.id)))
    .limit(1);

  if (!existing) return;

  await db
    .update(debts)
    .set({ deletedAt: new Date() })
    .where(and(eq(debts.id, id), eq(debts.userId, user.id)));

  await recordAudit({
    userId: user.id,
    entityType: "debt",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard");
}

export async function createDebtPayment(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = DebtPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [debt] = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, parsed.data.debtId), eq(debts.userId, user.id)))
    .limit(1);

  if (!debt) {
    return { error: "Debt not found." };
  }

  const [row] = await db
    .insert(debtPayments)
    .values({
      userId: user.id,
      debtId: parsed.data.debtId,
      clientId: randomUUID(),
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
      amount: parsed.data.amount.toFixed(2),
      notes: parsed.data.notes || null,
    })
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "debt_payment",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/debts/roadmap");
  revalidatePath("/dashboard");
}

export async function deleteDebtPayment(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(debtPayments)
    .where(and(eq(debtPayments.id, id), eq(debtPayments.userId, user.id)))
    .limit(1);

  if (!existing) return;

  await db
    .update(debtPayments)
    .set({ deletedAt: new Date() })
    .where(and(eq(debtPayments.id, id), eq(debtPayments.userId, user.id)));

  await recordAudit({
    userId: user.id,
    entityType: "debt_payment",
    entityId: id,
    action: "delete",
    before: existing,
  });

  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/debts/roadmap");
  revalidatePath("/dashboard");
}
