"use server";

import { randomUUID } from "node:crypto";
import type * as z from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { depoTransfers, depos, expenses, income } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { ExpenseSchema, IncomeSchema, TransferSchema, type FormState } from "@/lib/validation/entities";
import { parseLocalDate } from "@/lib/utils/date";
import type { TransactionType } from "@/lib/queries/depos";
import { resolveExpenseCategory, resolveIncomeSource } from "@/lib/categories";
import { syncBudgetLinesForUser } from "@/lib/actions/budgets";

function revalidateMoneyPages() {
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}

function invalid(error: z.ZodError): FormState {
  return { error: error.issues[0]?.message ?? "Invalid input", fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
}

async function ownsDepos(userId: string, ids: (string | null)[]) {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return true;
  const rows = await db
    .select({ id: depos.id })
    .from(depos)
    .where(and(eq(depos.userId, userId), isNull(depos.deletedAt), inArray(depos.id, wanted)));
  return rows.length === wanted.length;
}

export async function createTransaction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fields = Object.fromEntries(formData);

  switch (fields.type) {
    case "income": {
      const parsed = IncomeSchema.safeParse(fields);
      if (!parsed.success) return invalid(parsed.error);
      if (!(await ownsDepos(user.id, [parsed.data.depoId]))) return { error: "Depo not found." };
      const source = await resolveIncomeSource(user.id, parsed.data.sourceName);
      if (source.created) await syncBudgetLinesForUser(user.id);

      const [row] = await db
        .insert(income)
        .values({
          userId: user.id,
          clientId: randomUUID(),
          date: parseLocalDate(parsed.data.date),
          appliedMonth: parsed.data.appliedMonth,
          sourceId: source.id,
          sourceName: source.name,
          depoId: parsed.data.depoId,
          description: parsed.data.description || null,
          amount: parsed.data.amount.toFixed(2),
          notes: parsed.data.notes || null,
        })
        .returning();
      await recordAudit({ userId: user.id, entityType: "income", entityId: row.id, action: "create", after: row });
      break;
    }
    case "expense": {
      const parsed = ExpenseSchema.safeParse(fields);
      if (!parsed.success) return invalid(parsed.error);
      if (!(await ownsDepos(user.id, [parsed.data.depoId]))) return { error: "Depo not found." };
      const category = await resolveExpenseCategory(user.id, parsed.data.categoryName);
      if (category.created) await syncBudgetLinesForUser(user.id);

      const [row] = await db
        .insert(expenses)
        .values({
          userId: user.id,
          clientId: randomUUID(),
          date: parseLocalDate(parsed.data.date),
          categoryId: category.id,
          categoryName: category.name,
          depoId: parsed.data.depoId,
          description: parsed.data.description || null,
          amount: parsed.data.amount.toFixed(2),
          paid: formData.get("paid") === "true",
          notes: parsed.data.notes || null,
        })
        .returning();
      await recordAudit({ userId: user.id, entityType: "expense", entityId: row.id, action: "create", after: row });
      break;
    }
    case "transfer": {
      const parsed = TransferSchema.safeParse(fields);
      if (!parsed.success) return invalid(parsed.error);
      if (!(await ownsDepos(user.id, [parsed.data.fromDepoId, parsed.data.toDepoId]))) {
        return { error: "Depo not found." };
      }

      const [row] = await db
        .insert(depoTransfers)
        .values({
          userId: user.id,
          clientId: randomUUID(),
          fromDepoId: parsed.data.fromDepoId,
          toDepoId: parsed.data.toDepoId,
          date: parseLocalDate(parsed.data.date),
          amount: parsed.data.amount.toFixed(2),
          fee: parsed.data.fee.toFixed(2),
          description: parsed.data.description || null,
        })
        .returning();
      await recordAudit({
        userId: user.id,
        entityType: "depo_transfer",
        entityId: row.id,
        action: "create",
        after: row,
      });
      break;
    }
    default:
      return { error: "Choose income, expense, or transfer." };
  }

  revalidateMoneyPages();
}

export async function setExpensePaid(id: string, paid: boolean) {
  const user = await requireUser();
  const scope = and(eq(expenses.id, id), eq(expenses.userId, user.id), isNull(expenses.deletedAt));

  const [existing] = await db.select().from(expenses).where(scope).limit(1);
  if (!existing || existing.paid === paid) return;

  const [row] = await db.update(expenses).set({ paid, updatedAt: new Date() }).where(scope).returning();
  await recordAudit({ userId: user.id, entityType: "expense", entityId: id, action: "update", before: existing, after: row });

  revalidateMoneyPages();
}

const TABLES = {
  income: { table: income, entityType: "income" },
  expense: { table: expenses, entityType: "expense" },
  transfer: { table: depoTransfers, entityType: "depo_transfer" },
} as const;

export async function deleteTransaction(type: TransactionType, id: string) {
  const user = await requireUser();
  const { table, entityType } = TABLES[type];
  const scope = and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt));

  const [existing] = await db.select().from(table).where(scope).limit(1);
  if (!existing) return;

  await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() }).where(scope);
  await recordAudit({ userId: user.id, entityType, entityId: id, action: "delete", before: existing });

  revalidateMoneyPages();
}
