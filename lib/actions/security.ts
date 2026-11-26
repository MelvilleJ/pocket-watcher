"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { clearSmtpSettings, isServerOwner, saveSmtpSettings, sendEmail, testSmtp } from "@/lib/email/sender";

export type SecurityResult = { ok?: string; error?: string } | undefined;

const SmtpSchema = z.object({
  host: z.string().trim().min(3, { error: "Enter the SMTP server, e.g. smtp.gmail.com." }).max(200),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1, { error: "Enter the SMTP username." }).max(200),
  password: z.string().max(200).optional(),
  from: z.string().trim().max(200).default(""),
});

async function requireOwner() {
  const user = await requireUser();
  if (!(await isServerOwner(user.id))) throw new Error("Only the server owner can change email sending.");
  return user;
}

export async function saveEmailSending(_state: SecurityResult, formData: FormData): Promise<SecurityResult> {
  const user = await requireOwner();
  const parsed = SmtpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const settings = { ...parsed.data, password: parsed.data.password?.replace(/\s+/g, "") || undefined };

  try {
    await testSmtp(settings);
  } catch (error) {
    return { error: `The mail server refused the login: ${(error as Error).message}. Nothing was saved.` };
  }
  await saveSmtpSettings(settings);
  try {
    await sendEmail({
      to: user.email,
      subject: "Pocket Watcher can send email",
      text: "Email sending is set up. Sign-in codes will come from this address.",
    });
  } catch {
    return { ok: "Saved, but the test email couldn't be sent. Check the From address." };
  }
  revalidatePath("/dashboard/settings", "layout");
  return { ok: `Saved. A test email was sent to ${user.email}.` };
}

export async function removeEmailSending() {
  await requireOwner();
  await clearSmtpSettings();
  revalidatePath("/dashboard/settings", "layout");
}
