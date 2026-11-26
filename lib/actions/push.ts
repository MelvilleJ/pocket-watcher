"use server";

import * as z from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { rememberAppOrigin } from "@/lib/push/keys";
import { sendPushToUser } from "@/lib/push/send";
import { deviceFrom } from "@/lib/utils/device";
import { signPushAction, TEST_PENDING_ID } from "@/lib/push/tokens";

const SubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown) {
  const user = await requireUser();
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "This browser returned an invalid subscription." };
  const requestHeaders = await headers();
  const deviceName = deviceFrom(requestHeaders.get("user-agent") ?? "");
  // The browser's Origin header is reliable behind reverse proxies, which often drop the forwarded protocol.
  const origin = requestHeaders.get("origin");
  if (origin?.startsWith("https://")) await rememberAppOrigin(origin);

  const values = { userId: user.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, deviceName };
  await db
    .insert(pushSubscriptions)
    .values({ endpoint: parsed.data.endpoint, ...values })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
  revalidatePath("/dashboard/settings", "layout");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
  revalidatePath("/dashboard/settings", "layout");
}

export async function removePushDevice(id: string) {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.id, id)));
  revalidatePath("/dashboard/settings", "layout");
}

export async function sendTestNotification() {
  const user = await requireUser();
  const sent = await sendPushToUser(user.id, {
    title: `Spotify  −${user.currency}64.26`,
    body: "Subscriptions (AI suggestion) · Test notification",
    tag: "test",
    url: "/dashboard/transactions",
    actions: [
      { action: "add", title: "Add", token: signPushAction(user.id, TEST_PENDING_ID, "add") },
      { action: "dismiss", title: "Dismiss", token: signPushAction(user.id, TEST_PENDING_ID, "dismiss") },
    ],
  });
  if (sent.total === 0) return { error: "No devices have notifications turned on." };
  if (sent.delivered === 0) return { error: `Couldn't send: ${sent.errors[0] ?? "the push service refused it"}.` };
  const failed = sent.total - sent.delivered;
  return {
    ok: `Sent to ${sent.delivered} device${sent.delivered === 1 ? "" : "s"}.${failed ? ` ${failed} failed: ${sent.errors[0]}.` : ""}`,
  };
}
