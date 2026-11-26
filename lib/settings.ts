import "server-only";
import { and, eq } from "drizzle-orm";
import type * as z from "zod";
import { db } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit";
import type { SettingsSchema } from "@/lib/validation/entities";

export async function updateUserSettings(
  userId: string,
  input: z.infer<typeof SettingsSchema>,
  source: "web" | "mobile" = "web"
) {
  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  const [after] = await db
    .update(users)
    .set({
      name: input.name,
      currency: input.currency,
      savingsRate: (input.savingsRatePercent / 100).toFixed(3),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      currency: users.currency,
      savingsRate: users.savingsRate,
    });

  await recordAudit({ userId, entityType: "user", entityId: userId, action: "update", before, after, source });
  return after;
}

export async function revokeUserSession(userId: string, sessionId: string) {
  await db.delete(authSessions).where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)));
}
