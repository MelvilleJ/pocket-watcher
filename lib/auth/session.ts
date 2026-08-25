import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { signSessionToken, verifySessionToken } from "@/lib/auth/tokens";

const WEB_SESSION_TTL = "7d";
const WEB_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "session";

export async function createWebSession(userId: string, deviceName?: string) {
  const expiresAt = new Date(Date.now() + WEB_SESSION_TTL_MS);

  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      refreshTokenHash: "n/a-web",
      platform: "web",
      deviceName: deviceName ?? "Web browser",
      expiresAt,
    })
    .returning({ id: sessions.id });

  const token = await signSessionToken(
    { sessionId: row.id, userId },
    WEB_SESSION_TTL
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroyWebSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.id, payload.sessionId));
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getWebSessionPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, payload.sessionId))
    .limit(1);

  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;

  db.update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, row.id))
    .then(() => {});

  return { userId: payload.userId, sessionId: payload.sessionId };
}
