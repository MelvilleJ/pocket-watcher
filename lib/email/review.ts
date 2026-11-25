import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pendingTransactions } from "@/lib/db/schema";
import { commitPendingTransaction } from "@/lib/email/commit";
import { toDateKey } from "@/lib/email/template";

export type ReviewOutcome = "added" | "dismissed" | "needs-category" | "already-handled";

export async function commitPendingAsIs(userId: string, row: typeof pendingTransactions.$inferSelect) {
  if (!row.categoryName) return false;
  const created = await commitPendingTransaction(userId, row.id, {
    kind: row.kind,
    date: toDateKey(row.date),
    amount: Number(row.amount),
    description: row.description,
    categoryName: row.categoryName,
    depoId: row.depoId,
  });
  return Boolean(created);
}

export async function approvePendingById(userId: string, id: string): Promise<ReviewOutcome> {
  const [row] = await db
    .select()
    .from(pendingTransactions)
    .where(and(eq(pendingTransactions.id, id), eq(pendingTransactions.userId, userId), eq(pendingTransactions.status, "pending")))
    .limit(1);
  if (!row) return "already-handled";
  if (!row.categoryName) return "needs-category";
  return (await commitPendingAsIs(userId, row)) ? "added" : "already-handled";
}

export async function dismissPendingById(userId: string, id: string): Promise<ReviewOutcome> {
  const dismissed = await db
    .update(pendingTransactions)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(and(eq(pendingTransactions.id, id), eq(pendingTransactions.userId, userId), eq(pendingTransactions.status, "pending")))
    .returning({ id: pendingTransactions.id });
  return dismissed.length ? "dismissed" : "already-handled";
}
