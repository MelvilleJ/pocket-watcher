import "server-only";
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

export type PushAction = "add" | "dismiss";

// Stands in for a review item in test notifications, so their buttons can be pressed without touching data.
export const TEST_PENDING_ID = "test";

const TTL_MS = 14 * 24 * 60 * 60 * 1000;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return Buffer.from(hkdfSync("sha256", secret, "pocket-watcher", "push-actions", 32));
}

// Lets a notification button act on exactly one review item without a browser session, which may have expired.
export function signPushAction(userId: string, pendingId: string, action: PushAction) {
  const payload = Buffer.from(JSON.stringify({ u: userId, p: pendingId, a: action, e: Date.now() + TTL_MS })).toString("base64url");
  const signature = createHmac("sha256", key()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPushAction(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", key()).update(payload).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.e !== "number" || data.e < Date.now()) return null;
    if (data.a !== "add" && data.a !== "dismiss") return null;
    return { userId: String(data.u), pendingId: String(data.p), action: data.a as PushAction };
  } catch {
    return null;
  }
}
