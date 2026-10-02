import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { endOfDay, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { auditLogs, expenses, subscriptions } from "@/lib/db/schema";
import { billingDates } from "@/lib/finance/subscriptions";

const INSERT_BATCH = 500;

type Subscription = typeof subscriptions.$inferSelect;

function chargesFor(sub: Subscription, now: Date) {
  const end = sub.endDate ?? (sub.status === "cancelled" ? sub.updatedAt : null);
  const through = end && end < now ? end : endOfDay(now);
  const trackedFrom = startOfDay(sub.paymentsTrackedFrom);

  return billingDates(sub.billingCycle, sub.startDate, through).map((date) => ({
    userId: sub.userId,
    clientId: randomUUID(),
    date,
    categoryId: sub.categoryId,
    categoryName: sub.categoryName,
    description: sub.name,
    amount: sub.billedAmount,
    paid: date < trackedFrom,
    subscriptionId: sub.id,
  }));
}

// Idempotent: existing (subscription, date) charges are skipped, so a missed run is caught up by the next one.
export async function generateSubscriptionCharges(userId?: string) {
  const subs = await db
    .select()
    .from(subscriptions)
    .where(userId ? and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)) : isNull(subscriptions.deletedAt));

  const now = new Date();
  const charges = subs.flatMap((sub) => chargesFor(sub, now));
  let created = 0;

  for (let i = 0; i < charges.length; i += INSERT_BATCH) {
    const inserted = await db
      .insert(expenses)
      .values(charges.slice(i, i + INSERT_BATCH))
      .onConflictDoNothing({ target: [expenses.subscriptionId, expenses.date] })
      .returning();
    if (inserted.length === 0) continue;

    await db.insert(auditLogs).values(
      inserted.map((row) => ({
        userId: row.userId,
        entityType: "expense",
        entityId: row.id,
        action: "create" as const,
        after: row,
      }))
    );
    created += inserted.length;
  }

  return created;
}
