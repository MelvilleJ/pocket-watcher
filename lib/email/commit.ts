import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, income, pendingTransactions } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit";
import { resolveExpenseCategory, resolveIncomeSource } from "@/lib/categories";
import { syncBudgetLinesForUser } from "@/lib/budgets";
import { parseLocalDate } from "@/lib/utils/date";
import { learnMerchant } from "@/lib/categorize";

export type CommitValues = {
  kind: "expense" | "income";
  date: string;
  amount: number;
  description: string | null;
  categoryName: string;
  depoId: string | null;
};

// Claiming the row first means a double-submitted approval can't create the transaction twice.
export async function commitPendingTransaction(userId: string, pendingId: string, values: CommitValues) {
  const scope = and(
    eq(pendingTransactions.id, pendingId),
    eq(pendingTransactions.userId, userId),
    eq(pendingTransactions.status, "pending")
  );
  const [claimed] = await db
    .update(pendingTransactions)
    .set({ status: "approved", resolvedAt: new Date() })
    .where(scope)
    .returning({ id: pendingTransactions.id, originalDescription: pendingTransactions.originalDescription });
  if (!claimed) return null;

  try {
    const entityId = await insertEntry(userId, pendingId, values, claimed.originalDescription);
    await learnMerchant(userId, values.kind, {
      originalDescription: claimed.originalDescription,
      description: values.description,
      categoryName: values.categoryName,
    });
    return entityId;
  } catch (error) {
    await db
      .update(pendingTransactions)
      .set({ status: "pending", resolvedAt: null })
      .where(eq(pendingTransactions.id, pendingId));
    throw error;
  }
}

async function insertEntry(userId: string, pendingId: string, values: CommitValues, originalDescription: string | null) {
  const notes = originalDescription ? `Imported from email: ${originalDescription}` : "Imported from email";
  const date = parseLocalDate(values.date);
  let entityId: string;

  if (values.kind === "expense") {
    const category = await resolveExpenseCategory(userId, values.categoryName);
    if (category.created) await syncBudgetLinesForUser(userId);
    const [row] = await db
      .insert(expenses)
      .values({
        userId,
        clientId: randomUUID(),
        date,
        categoryId: category.id,
        categoryName: category.name,
        depoId: values.depoId,
        description: values.description,
        amount: values.amount.toFixed(2),
        paid: true,
        notes,
      })
      .returning();
    await recordAudit({ userId, entityType: "expense", entityId: row.id, action: "create", after: row });
    entityId = row.id;
  } else {
    const source = await resolveIncomeSource(userId, values.categoryName);
    if (source.created) await syncBudgetLinesForUser(userId);
    const [row] = await db
      .insert(income)
      .values({
        userId,
        clientId: randomUUID(),
        date,
        appliedMonth: values.date.slice(0, 7),
        sourceId: source.id,
        sourceName: source.name,
        depoId: values.depoId,
        description: values.description,
        amount: values.amount.toFixed(2),
        notes,
      })
      .returning();
    await recordAudit({ userId, entityType: "income", entityId: row.id, action: "create", after: row });
    entityId = row.id;
  }

  await db
    .update(pendingTransactions)
    .set({
      ...values,
      date,
      amount: values.amount.toFixed(2),
      createdEntityId: entityId,
    })
    .where(eq(pendingTransactions.id, pendingId));

  return entityId;
}
