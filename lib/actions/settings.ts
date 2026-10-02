"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import * as z from "zod";

const SettingsSchema = z.object({
  name: z.string().min(2),
  currency: z.string().min(1).max(8),
  savingsRatePercent: z.coerce.number().min(0).max(100),
});

export type SettingsFormState = { error?: string } | undefined;

export async function updateSettings(
  _state: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const user = await requireUser();
  const parsed = SettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check your inputs." };
  }

  const [before] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  const [after] = await db
    .update(users)
    .set({
      name: parsed.data.name,
      currency: parsed.data.currency,
      savingsRate: (parsed.data.savingsRatePercent / 100).toFixed(3),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "update",
    before,
    after,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function revokeSession(sessionId: string) {
  const user = await requireUser();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)));
  revalidatePath("/dashboard/settings");
}
