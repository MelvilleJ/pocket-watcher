import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { debts, expenses, income, subscriptions } from "@/lib/db/schema";

export async function listIncome(userId: string) {
  return db
    .select()
    .from(income)
    .where(and(eq(income.userId, userId), isNull(income.deletedAt)))
    .orderBy(desc(income.date))
    .limit(200);
}

export async function listExpenses(userId: string) {
  return db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), isNull(expenses.deletedAt)))
    .orderBy(desc(expenses.date))
    .limit(200);
}

export async function listSubscriptions(userId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
    .orderBy(desc(subscriptions.createdAt))
    .limit(200);
}

export async function listDebtsRaw(userId: string) {
  return db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
    .orderBy(desc(debts.createdAt));
}
