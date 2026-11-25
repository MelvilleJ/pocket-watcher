import "server-only";
import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db";
import { depos, pendingTransactions, pushSubscriptions, users } from "@/lib/db/schema";
import { getAppOrigin, getVapidKeys } from "@/lib/push/keys";
import { signPushAction } from "@/lib/push/tokens";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url: string;
  actions?: { action: "add" | "dismiss"; title: string; token: string }[];
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const result = { total: subscriptions.length, delivered: 0, errors: [] as string[] };
  if (subscriptions.length === 0) return result;
  const { publicKey, privateKey } = await getVapidKeys();
  // Push services only accept an https: or mailto: contact; anything else makes every send fail.
  const origin = await getAppOrigin();
  const subject = origin?.startsWith("https://") ? origin : "mailto:notifications@pocket-watcher.invalid";
  const body = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 24 * 60 * 60, urgency: "normal" }
      );
      result.delivered++;
    } catch (error) {
      // 404/410 mean the browser dropped this subscription (uninstalled, permission revoked); forget it.
      const { statusCode, body: responseBody, message } = error as { statusCode?: number; body?: string; message?: string };
      if (statusCode === 404 || statusCode === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      const detail = `${sub.deviceName ?? "Device"}: ${statusCode ? `${statusCode} ` : ""}${(responseBody || message || "unknown error").trim().slice(0, 160)}`;
      result.errors.push(detail);
      console.error("Push notification failed", detail);
    }
  }
  return result;
}

export async function notifyPendingTransaction(userId: string, pendingId: string) {
  const [row] = await db
    .select({ pending: pendingTransactions, currency: users.currency, depoName: depos.name })
    .from(pendingTransactions)
    .innerJoin(users, eq(users.id, pendingTransactions.userId))
    .leftJoin(depos, eq(depos.id, pendingTransactions.depoId))
    .where(and(eq(pendingTransactions.id, pendingId), eq(pendingTransactions.userId, userId)))
    .limit(1);
  if (!row || row.pending.status !== "pending") return 0;

  const { pending, currency, depoName } = row;
  const sign = pending.kind === "income" ? "+" : "−";
  const details = [
    pending.categoryName ? `${pending.categoryName}${pending.categorySource === "ai" ? " (AI suggestion)" : ""}` : "Needs a category",
    depoName,
    pending.possibleDuplicate ? "Possible duplicate" : null,
  ].filter(Boolean);

  const actions: PushPayload["actions"] = [];
  if (pending.categoryName) actions.push({ action: "add", title: "Add", token: signPushAction(userId, pendingId, "add") });
  actions.push({ action: "dismiss", title: "Dismiss", token: signPushAction(userId, pendingId, "dismiss") });

  return sendPushToUser(userId, {
    title: `${pending.description ?? "New transaction"}  ${sign}${currency}${Number(pending.amount).toFixed(2)}`,
    body: details.join(" · "),
    tag: `pending-${pendingId}`,
    url: `/dashboard/transactions?review=${pendingId}`,
    actions,
  });
}
