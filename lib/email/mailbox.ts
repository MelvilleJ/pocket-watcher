import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates, mailboxConnections } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/ai/crypto";
import { parseSenderList } from "@/lib/email/mailbox-presets";
import { processEmail } from "@/lib/email/process";

const FIRST_SYNC_LOOKBACK_DAYS = 14;
const MAX_EMAILS_PER_SYNC = 50;

export type MailboxLogin = { host: string; port: number; email: string; password: string; folder: string };

function createClient(login: Omit<MailboxLogin, "folder">) {
  return new ImapFlow({
    host: login.host,
    port: login.port,
    secure: login.port === 993,
    auth: { user: login.email, pass: login.password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
}

export function describeMailboxError(error: unknown) {
  const e = error as { authenticationFailed?: boolean; code?: string; mailboxMissing?: boolean; responseText?: string };
  if (e?.authenticationFailed) {
    return "The mail server rejected the login. Check the email address and use an app password, not your normal password.";
  }
  if (e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT" || e?.code === "ECONNRESET") {
    return "Couldn't reach the mail server. Check the server address and port.";
  }
  if (e?.mailboxMissing || /nonexistent|doesn't exist|not exist|unknown mailbox/i.test(e?.responseText ?? "")) {
    return "That folder doesn't exist in this mailbox.";
  }
  return "Something went wrong while checking the mailbox.";
}

export async function testMailboxLogin(login: MailboxLogin) {
  const client = createClient(login);
  try {
    await client.connect();
    await client.mailboxOpen(login.folder, { readOnly: true });
    return null;
  } catch (error) {
    return describeMailboxError(error);
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function watchedSenders(userId: string, extraSenders: string) {
  const templates = await db
    .select({ sender: emailTemplates.senderPattern })
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId));
  return parseSenderList([...templates.map((t) => t.sender), extraSenders].join("\n"));
}

export type SyncResult = { ok: true; found: number; added: number; autoAdded: number } | { ok: false; error: string };

const running = new Set<string>();

export async function syncMailbox(userId: string): Promise<SyncResult> {
  if (running.has(userId)) return { ok: false, error: "A check is already running." };
  running.add(userId);
  try {
    return await runSync(userId);
  } finally {
    running.delete(userId);
  }
}

async function runSync(userId: string): Promise<SyncResult> {
  const [conn] = await db.select().from(mailboxConnections).where(eq(mailboxConnections.userId, userId)).limit(1);
  if (!conn) return { ok: false, error: "No mailbox is connected." };

  const record = (values: Partial<typeof mailboxConnections.$inferInsert>) =>
    db
      .update(mailboxConnections)
      .set({ lastCheckedAt: new Date(), ...values })
      .where(eq(mailboxConnections.id, conn.id));

  const senders = await watchedSenders(userId, conn.extraSenders);
  if (senders.length === 0) {
    const error = "No senders to watch yet. Add your bank's sender address or create a template.";
    await record({ lastError: error });
    return { ok: false, error };
  }

  let password: string;
  try {
    password = decryptSecret(conn.encryptedPassword);
  } catch {
    const error = "The saved app password couldn't be decrypted. Reconnect the mailbox.";
    await record({ lastError: error });
    return { ok: false, error };
  }

  const client = createClient({ host: conn.host, port: conn.port, email: conn.email, password });
  let found = 0;
  let added = 0;
  let autoAdded = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(conn.folder, { readOnly: true });
    try {
      const mailbox = client.mailbox;
      if (!mailbox) throw new Error("Mailbox did not open.");
      const uidValidity = String(mailbox.uidValidity);
      const resume = conn.uidValidity === uidValidity && conn.lastUid !== null ? conn.lastUid : null;

      const fromQuery = senders.length === 1 ? { from: senders[0] } : { or: senders.map((from) => ({ from })) };
      const position =
        resume === null
          ? { since: new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) }
          : { uid: `${resume + 1}:*` };
      const result = await client.search({ ...position, ...fromQuery }, { uid: true });
      // "N:*" always matches the newest message even when its UID is below N.
      const uids = (result || [])
        .filter((uid) => resume === null || uid > resume)
        .sort((a, b) => a - b)
        .slice(-MAX_EMAILS_PER_SYNC);
      found = uids.length;

      for (const uid of uids) {
        const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!message || !message.source) continue;
        const parsed = await simpleParser(message.source);
        const html = typeof parsed.html === "string" ? parsed.html : "";
        const text = parsed.text?.trim() ? parsed.text : "";
        const outcome = await processEmail({
          userId,
          source: "mailbox",
          messageId: parsed.messageId ?? `imap:${uidValidity}:${uid}`,
          fromAddress: parsed.from?.text ?? "",
          subject: parsed.subject ?? "",
          body: text || html,
          isHtml: !text && Boolean(html),
          receivedAt: parsed.date ?? new Date(),
        });
        if (outcome.status === "parsed") {
          added++;
          if (outcome.autoApproved) autoAdded++;
        }
      }

      const highest = Math.max(mailbox.uidNext - 1, resume ?? 0, ...uids);
      await record({ uidValidity, lastUid: highest, lastError: null });
    } finally {
      lock.release();
    }
  } catch (error) {
    const message = describeMailboxError(error);
    await record({ lastError: message });
    return { ok: false, error: message };
  } finally {
    await client.logout().catch(() => {});
  }

  return { ok: true, found, added, autoAdded };
}

export async function syncAllMailboxes() {
  const rows = await db.select({ userId: mailboxConnections.userId }).from(mailboxConnections);
  for (const row of rows) {
    await syncMailbox(row.userId).catch(() => {});
  }
}
