import "server-only";
import { db } from "@/lib/db";
import { expenseCategories, incomeSources } from "@/lib/db/schema";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Groceries",
  "Housing",
  "Utilities",
  "Transport",
  "Health & Fitness",
  "Personal Care",
  "Home & Appliances",
  "Dining Out",
  "Entertainment",
  "Education",
  "Family",
  "Insurance",
  "Gifts & Giving",
  "Savings Transfer",
  "Other",
];

export const DEFAULT_INCOME_SOURCES = [
  "Salary",
  "Side Income",
  "Freelance",
  "Gift",
  "Refund",
  "Other",
];

export async function seedDefaultsForUser(userId: string) {
  await db
    .insert(expenseCategories)
    .values(DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ userId, name })));

  await db
    .insert(incomeSources)
    .values(DEFAULT_INCOME_SOURCES.map((name) => ({ userId, name })));
}
