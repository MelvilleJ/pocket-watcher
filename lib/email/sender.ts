import "server-only";
import { asc, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { appSecrets, users } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";

const KEY = "smtp_settings";

export type SmtpSettings = { host: string; port: number; user: string; from: string };
type StoredSmtp = SmtpSettings & { password: string };

async function readStored(): Promise<StoredSmtp | null> {
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.key, KEY)).limit(1);
  if (!row) return null;
  try {
    return JSON.parse(decryptSecret(row.value)) as StoredSmtp;
  } catch {
    return null;
  }
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const stored = await readStored();
  if (!stored) return null;
  return { host: stored.host, port: stored.port, user: stored.user, from: stored.from };
}

export async function saveSmtpSettings(settings: SmtpSettings & { password?: string }) {
  const existing = await readStored();
  const password = settings.password || existing?.password;
  if (!password) throw new Error("An SMTP password is required.");
  const value = encryptSecret(JSON.stringify({ ...settings, password }));
  await db
    .insert(appSecrets)
    .values({ key: KEY, value })
    .onConflictDoUpdate({ target: appSecrets.key, set: { value } });
}

export async function clearSmtpSettings() {
  await db.delete(appSecrets).where(eq(appSecrets.key, KEY));
}

function transport(settings: StoredSmtp) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: 15_000,
  });
}

export async function testSmtp(settings: SmtpSettings & { password?: string }) {
  const existing = await readStored();
  const password = settings.password || existing?.password;
  if (!password) throw new Error("An SMTP password is required.");
  await transport({ ...settings, password }).verify();
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const settings = await readStored();
  if (!settings) throw new Error("Email sending isn't set up on this server yet.");
  await transport(settings).sendMail({ from: settings.from || settings.user, ...message });
}

// The first account on the server owns server-wide settings like the email sender.
export async function isServerOwner(userId: string) {
  const [first] = await db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt)).limit(1);
  return first?.id === userId;
}
