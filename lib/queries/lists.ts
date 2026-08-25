import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenseCategories, incomeSources } from "@/lib/db/schema";

export async function getExpenseCategories(userId: string) {
  return db
    .select()
    .from(expenseCategories)
    .where(and(eq(expenseCategories.userId, userId), eq(expenseCategories.isArchived, false)))
    .orderBy(expenseCategories.name);
}

export async function getIncomeSources(userId: string) {
  return db
    .select()
    .from(incomeSources)
    .where(and(eq(incomeSources.userId, userId), eq(incomeSources.isArchived, false)))
    .orderBy(incomeSources.name);
}
