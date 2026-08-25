import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { signSessionToken, verifySessionToken } from "@/lib/auth/tokens";
import { sha256 } from "@/lib/auth/hash";

const MOBILE_SESSION_TTL = "30d";
const MOBILE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createMobileSession(userId: string, deviceName?: string) {
  const expiresAt = new Date(Date.now() + MOBILE_SESSION_TTL_MS);

  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      refreshTokenHash: "pending",
      platform: "mobile",
      deviceName: deviceName ?? "Mobile device",
      expiresAt,
    })
    .returning({ id: sessions.id });

  const token = await signSessionToken(
    { sessionId: row.id, userId },
    MOBILE_SESSION_TTL
  );

  await db
    .update(sessions)
    .set({ refreshTokenHash: sha256(token) })
    .where(eq(sessions.id, row.id));

  return { token, expiresAt };
}

export async function verifyMobileToken(token: string) {
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, payload.sessionId))
    .limit(1);

  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  if (row.refreshTokenHash !== sha256(token)) return null;

  db.update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, row.id))
    .then(() => {});

  return { userId: payload.userId, sessionId: payload.sessionId };
}

export async function revokeMobileSession(sessionId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
