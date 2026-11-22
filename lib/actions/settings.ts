"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { revokeUserSession, updateUserSettings } from "@/lib/settings";
import { SettingsSchema } from "@/lib/validation/entities";

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

  await updateUserSettings(user.id, parsed.data);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function revokeSession(sessionId: string) {
  const user = await requireUser();
  await revokeUserSession(user.id, sessionId);
  revalidatePath("/dashboard/settings");
}
