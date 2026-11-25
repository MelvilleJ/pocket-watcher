import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiSettings, cards, emailTemplates, inboundEmails, mailboxConnections, pendingTransactions } from "@/lib/db/schema";

export async function getAiSettingsSummary(userId: string) {
  const [row] = await db
    .select({
      provider: aiSettings.provider,
      model: aiSettings.model,
      baseUrl: aiSettings.baseUrl,
      keyLast4: aiSettings.keyLast4,
      verifiedAt: aiSettings.verifiedAt,
    })
    .from(aiSettings)
    .where(eq(aiSettings.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getMailboxSummary(userId: string) {
  const [row] = await db
    .select({
      email: mailboxConnections.email,
      host: mailboxConnections.host,
      port: mailboxConnections.port,
      folder: mailboxConnections.folder,
      extraSenders: mailboxConnections.extraSenders,
      lastCheckedAt: mailboxConnections.lastCheckedAt,
      lastError: mailboxConnections.lastError,
    })
    .from(mailboxConnections)
    .where(eq(mailboxConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function listPendingTransactions(userId: string) {
  return db
    .select({
      id: pendingTransactions.id,
      kind: pendingTransactions.kind,
      date: pendingTransactions.date,
      amount: pendingTransactions.amount,
      description: pendingTransactions.description,
      originalDescription: pendingTransactions.originalDescription,
      categoryName: pendingTransactions.categoryName,
      categorySource: pendingTransactions.categorySource,
      depoId: pendingTransactions.depoId,
      parseMethod: pendingTransactions.parseMethod,
      possibleDuplicate: pendingTransactions.possibleDuplicate,
      emailSubject: inboundEmails.subject,
      emailFrom: inboundEmails.fromAddress,
      templateName: emailTemplates.name,
    })
    .from(pendingTransactions)
    .innerJoin(inboundEmails, eq(inboundEmails.id, pendingTransactions.inboundEmailId))
    .leftJoin(emailTemplates, eq(emailTemplates.id, pendingTransactions.templateId))
    .where(and(eq(pendingTransactions.userId, userId), eq(pendingTransactions.status, "pending")))
    .orderBy(desc(pendingTransactions.date));
}

export async function listEmailTemplates(userId: string) {
  return db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId)).orderBy(emailTemplates.name);
}

export async function listUnreadEmails(userId: string) {
  return db
    .select({
      id: inboundEmails.id,
      source: inboundEmails.source,
      fromAddress: inboundEmails.fromAddress,
      subject: inboundEmails.subject,
      body: inboundEmails.body,
      status: inboundEmails.status,
      error: inboundEmails.error,
      receivedAt: inboundEmails.receivedAt,
    })
    .from(inboundEmails)
    .where(and(eq(inboundEmails.userId, userId), inArray(inboundEmails.status, ["unmatched", "failed"])))
    .orderBy(desc(inboundEmails.receivedAt))
    .limit(25);
}

export async function countPendingTransactions(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(pendingTransactions)
    .where(and(eq(pendingTransactions.userId, userId), eq(pendingTransactions.status, "pending")));
  return row?.value ?? 0;
}

export async function listCards(userId: string) {
  return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(cards.name, cards.last4);
}
