"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { depos } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { DepoSchema, type FormState } from "@/lib/validation/entities";

function revalidateDepoPages() {
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
}

async function nameTaken(userId: string, name: string, exceptId?: string) {
  const [clash] = await db
    .select({ id: depos.id })
    .from(depos)
    .where(
      and(
        eq(depos.userId, userId),
        eq(depos.name, name),
        isNull(depos.deletedAt),
        exceptId ? ne(depos.id, exceptId) : undefined
      )
    )
    .limit(1);
  return Boolean(clash);
}

export async function createDepo(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = DepoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (await nameTaken(user.id, parsed.data.name)) {
    return { error: `You already have a depo called "${parsed.data.name}".` };
  }

  const [row] = await db
    .insert(depos)
    .values({
      userId: user.id,
      clientId: randomUUID(),
      name: parsed.data.name,
      kind: parsed.data.kind,
      color: parsed.data.color,
      icon: parsed.data.icon,
      openingBalance: parsed.data.openingBalance.toFixed(2),
    })
    .returning();

  await recordAudit({ userId: user.id, entityType: "depo", entityId: row.id, action: "create", after: row });
  revalidateDepoPages();
}

export async function updateDepo(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = DepoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [existing] = await db
    .select()
    .from(depos)
    .where(and(eq(depos.id, id), eq(depos.userId, user.id), isNull(depos.deletedAt)))
    .limit(1);
  if (!existing) return { error: "Depo not found." };
  if (await nameTaken(user.id, parsed.data.name, id)) {
    return { error: `You already have a depo called "${parsed.data.name}".` };
  }

  const [row] = await db
    .update(depos)
    .set({
      name: parsed.data.name,
      kind: parsed.data.kind,
      color: parsed.data.color,
      icon: parsed.data.icon,
      openingBalance: parsed.data.openingBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(and(eq(depos.id, id), eq(depos.userId, user.id)))
    .returning();

  await recordAudit({
    userId: user.id,
    entityType: "depo",
    entityId: id,
    action: "update",
    before: existing,
    after: row,
  });
  revalidateDepoPages();
}

export async function deleteDepo(id: string) {
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(depos)
    .where(and(eq(depos.id, id), eq(depos.userId, user.id), isNull(depos.deletedAt)))
    .limit(1);
  if (!existing) return;

  await db
    .update(depos)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(depos.id, id), eq(depos.userId, user.id)));

  await recordAudit({ userId: user.id, entityType: "depo", entityId: id, action: "delete", before: existing });
  revalidateDepoPages();
}
