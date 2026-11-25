import "server-only";
import { and, eq, gt, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { inboundEmails, pendingTransactions } from "@/lib/db/schema";
import { getAvailableModel } from "@/lib/ai/model";
import { suggestCategory } from "@/lib/categorize";
import { processEmail } from "@/lib/email/process";

const BATCH = 20;

export async function reprocessInboundEmail(row: typeof inboundEmails.$inferSelect) {
  if (row.status === "parsed" || !row.body) return null;
  await db.delete(inboundEmails).where(eq(inboundEmails.id, row.id));
  return processEmail(
    {
      userId: row.userId,
      source: row.source,
      messageId: row.messageId,
      fromAddress: row.fromAddress,
      subject: row.subject,
      body: row.body,
      isHtml: false,
      receivedAt: row.receivedAt,
    },
    // Keeps the original window so an email can't be retried forever.
    { aiRetryUntil: row.aiRetryUntil }
  );
}

const waitingEmails = (userId?: string) =>
  and(
    eq(inboundEmails.status, "failed"),
    gt(inboundEmails.aiRetryUntil, new Date()),
    isNotNull(inboundEmails.body),
    userId ? eq(inboundEmails.userId, userId) : undefined
  );

const uncategorised = (userId?: string) =>
  and(
    eq(pendingTransactions.status, "pending"),
    isNull(pendingTransactions.categoryName),
    eq(pendingTransactions.aiCategoryTried, false),
    isNotNull(pendingTransactions.description),
    userId ? eq(pendingTransactions.userId, userId) : undefined
  );

export async function countEmailsWaitingForAi(userId: string) {
  return (await db.select({ id: inboundEmails.id }).from(inboundEmails).where(waitingEmails(userId))).length;
}

export async function runAiCatchUp(userId: string) {
  const available = await getAvailableModel(userId).catch(() => null);
  if (available?.status !== "ok") return { read: 0, categorised: 0 };

  let read = 0;
  const emails = await db.select().from(inboundEmails).where(waitingEmails(userId)).limit(BATCH);
  for (const row of emails) {
    const result = await reprocessInboundEmail(row);
    if (result?.status === "parsed") read++;
  }

  let categorised = 0;
  const items = await db.select().from(pendingTransactions).where(uncategorised(userId)).limit(BATCH);
  for (const item of items) {
    let suggestion;
    try {
      suggestion = await suggestCategory(userId, item.kind, item.originalDescription ?? item.description, {
        model: available.model,
        amount: Number(item.amount),
      });
    } catch {
      break;
    }
    await db
      .update(pendingTransactions)
      .set({ categoryName: suggestion.categoryName, categorySource: suggestion.source, aiCategoryTried: true })
      .where(and(eq(pendingTransactions.id, item.id), eq(pendingTransactions.status, "pending")));
    if (suggestion.categoryName) categorised++;
  }

  return { read, categorised };
}

export async function runAllAiCatchUps() {
  await db
    .update(inboundEmails)
    .set({ aiRetryUntil: null, error: "The AI was offline for over a day. Press Retry once it's back." })
    .where(and(eq(inboundEmails.status, "failed"), lte(inboundEmails.aiRetryUntil, new Date())));

  const [emailUsers, itemUsers] = await Promise.all([
    db.selectDistinct({ userId: inboundEmails.userId }).from(inboundEmails).where(waitingEmails()),
    db.selectDistinct({ userId: pendingTransactions.userId }).from(pendingTransactions).where(uncategorised()),
  ]);
  const userIds = new Set([...emailUsers, ...itemUsers].map((r) => r.userId));
  for (const userId of userIds) await runAiCatchUp(userId).catch(() => {});
  return userIds.size;
}
