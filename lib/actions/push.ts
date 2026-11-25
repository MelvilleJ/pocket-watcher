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

const SubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

function deviceFrom(userAgent: string) {
  const os = /Android/i.test(userAgent) ? "Android" : /Windows/i.test(userAgent) ? "Windows" : /Mac OS/i.test(userAgent) ? "Mac" : /Linux/i.test(userAgent) ? "Linux" : /iPhone|iPad/i.test(userAgent) ? "iOS" : "Device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "browser";
  return `${browser} on ${os}`;
}

export async function savePushSubscription(input: unknown) {
  const user = await requireUser();
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "This browser returned an invalid subscription." };
  const requestHeaders = await headers();
  const deviceName = deviceFrom(requestHeaders.get("user-agent") ?? "");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  if (host && !host.startsWith("localhost")) await rememberAppOrigin(`${proto}://${host}`);

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
    title: "Notifications are on",
    body: "You'll get one when a bank email needs a look.",
    tag: "test",
    url: "/dashboard/transactions",
  });
  return sent > 0 ? { ok: `Sent to ${sent} device${sent === 1 ? "" : "s"}.` } : { error: "No devices have notifications turned on." };
}
