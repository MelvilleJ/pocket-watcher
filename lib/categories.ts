import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenseCategories, incomeSources } from "@/lib/db/schema";

type NamedListTable = typeof expenseCategories | typeof incomeSources;

export type ResolvedName = { id: string; name: string; created: boolean };

// Matching is case-insensitive so "groceries" lands on the existing "Groceries" instead of splitting totals.
async function resolveName(table: NamedListTable, userId: string, rawName: string): Promise<ResolvedName> {
  const name = rawName.trim().replace(/\s+/g, " ");
  const findMatch = async () => {
    const [row] = await db
      .select({ id: table.id, name: table.name, isArchived: table.isArchived })
      .from(table)
      .where(and(eq(table.userId, userId), sql`lower(${table.name}) = lower(${name})`))
      .limit(1);
    return row;
  };

  const existing = await findMatch();
  if (existing) {
    if (existing.isArchived) await db.update(table).set({ isArchived: false }).where(eq(table.id, existing.id));
    return { id: existing.id, name: existing.name, created: existing.isArchived };
  }

  const [inserted] = await db
    .insert(table)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning({ id: table.id, name: table.name });
  if (inserted) return { ...inserted, created: true };

  const raced = await findMatch();
  return { id: raced!.id, name: raced!.name, created: false };
}

export function resolveExpenseCategory(userId: string, name: string) {
  return resolveName(expenseCategories, userId, name);
}

export function resolveIncomeSource(userId: string, name: string) {
  return resolveName(incomeSources, userId, name);
}
