"use server";

import * as z from "zod";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import {
  aiSettings,
  depos,
  emailTemplates,
  cards,
  inboundEmails,
  mailboxConnections,
  pendingTransactions,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/ai/crypto";
import { buildModel, describeAiError, getUserModel } from "@/lib/ai/model";
import { generateTemplate, testConnection, type GeneratedTemplate } from "@/lib/ai/extract";
import { AI_PROVIDER_VALUES } from "@/lib/ai/providers";
import { normalizeEmailBody } from "@/lib/email/normalize";
import { TemplateRulesSchema } from "@/lib/email/template";
import { commitPendingTransaction } from "@/lib/email/commit";
import { syncMailbox, testMailboxLogin } from "@/lib/email/mailbox";
import { reprocessInboundEmail, runAiCatchUp } from "@/lib/email/ai-catchup";
import { approvePendingById, commitPendingAsIs, dismissPendingById } from "@/lib/email/review";
import { parseSenderList, presetForEmail } from "@/lib/email/mailbox-presets";

export type ActionResult = { ok?: string; error?: string } | undefined;

function revalidateImportPages() {
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/settings", "layout");
}

function revalidateMoneyPages() {
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}

async function ownsDepo(userId: string, depoId: string | null) {
  if (!depoId) return true;
  const [row] = await db
    .select({ id: depos.id })
    .from(depos)
    .where(and(eq(depos.id, depoId), eq(depos.userId, userId), isNull(depos.deletedAt)))
    .limit(1);
  return Boolean(row);
}

const AiSettingsSchema = z.object({
  provider: z.enum(AI_PROVIDER_VALUES, { error: "Choose a provider." }),
  model: z.string().trim().min(1, { error: "Model is required." }).max(120),
  apiKey: z.string().trim().max(500).optional(),
  baseUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((value) => !value || /^https?:\/\/[^\s/]+/i.test(value), { error: "Server address must start with http:// or https://." })
    .transform((value) => value?.replace(/\/+$/, "") || null),
});

export async function saveAiSettings(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!isEncryptionConfigured()) {
    return { error: "The server has no secret to encrypt keys with, so they can't be stored safely yet." };
  }
  const parsed = AiSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { provider, model } = parsed.data;
  const isLocal = provider === "local";
  const baseUrl = isLocal ? parsed.data.baseUrl : null;
  if (isLocal && !baseUrl) return { error: "Enter your local model server's address." };

  const [existing] = await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1);
  let apiKey = parsed.data.apiKey ?? "";
  if (!apiKey && existing?.provider === provider && existing.keyLast4) {
    try {
      apiKey = decryptSecret(existing.encryptedKey);
    } catch {
      return { error: "Your saved key couldn't be decrypted. Enter it again." };
    }
  }
  if (!apiKey && !isLocal) return { error: "Enter an API key for this provider." };

  try {
    await testConnection(buildModel(provider, model, apiKey, baseUrl));
  } catch (error) {
    return { error: `${describeAiError(error)} Nothing was saved.` };
  }

  const values = {
    provider,
    model,
    baseUrl,
    encryptedKey: encryptSecret(apiKey),
    keyLast4: apiKey.slice(-4),
    verifiedAt: new Date(),
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(aiSettings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: aiSettings.userId, set: values })
    .returning({ id: aiSettings.id });

  const summary = (s: { provider: string; model: string; keyLast4: string }) => ({
    provider: s.provider,
    model: s.model,
    keyLast4: s.keyLast4,
  });
  await recordAudit({
    userId: user.id,
    entityType: "ai_settings",
    entityId: row.id,
    action: existing ? "update" : "create",
    before: existing ? summary(existing) : undefined,
    after: summary(values),
  });

  revalidateImportPages();
  return { ok: isLocal ? "Connected to your local model." : "Connected. Your key is saved and encrypted." };
}

export async function removeAiSettings() {
  const user = await requireUser();
  const [existing] = await db.delete(aiSettings).where(eq(aiSettings.userId, user.id)).returning();
  if (!existing) return;
  await recordAudit({
    userId: user.id,
    entityType: "ai_settings",
    entityId: existing.id,
    action: "delete",
    before: { provider: existing.provider, model: existing.model, keyLast4: existing.keyLast4 },
  });
  revalidateImportPages();
}

export type TemplateDraftResult = { draft: GeneratedTemplate } | { error: string };

const SampleSchema = z.object({
  fromAddress: z.string().max(500),
  subject: z.string().max(500),
  text: z.string().min(1).max(200_000),
});

export async function generateTemplateDraft(sample: z.input<typeof SampleSchema>): Promise<TemplateDraftResult> {
  const user = await requireUser();
  const parsed = SampleSchema.safeParse(sample);
  if (!parsed.success) return { error: "Paste a sample email first." };

  let model;
  try {
    model = await getUserModel(user.id);
  } catch {
    return { error: "Your saved AI key couldn't be decrypted. Re-enter it in Settings." };
  }
  if (!model) return { error: "Add an AI key in Settings first, or write the rules by hand." };

  try {
    const draft = await generateTemplate(model, {
      fromAddress: parsed.data.fromAddress,
      subject: parsed.data.subject,
      text: normalizeEmailBody(parsed.data.text, false),
      receivedAt: new Date(),
    });
    return { draft };
  } catch (error) {
    return { error: describeAiError(error) };
  }
}

const TemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, { error: "Name is required." }).max(120),
  kind: z.enum(["expense", "income"]),
  senderPattern: z.string().trim().min(3, { error: "Sender match must be at least 3 characters." }).max(200),
  subjectPattern: z.string().trim().max(200).nullable(),
  outcome: z.enum(["transaction", "declined"]),
  mustContain: z.array(z.string().trim().max(100)).max(5),
  rules: TemplateRulesSchema,
  defaultDepoId: z.string().uuid().nullable(),
  defaultCategoryName: z.string().trim().max(120).nullable(),
  autoApprove: z.boolean(),
}).refine((t) => t.outcome === "declined" || t.rules.amount.length > 0, { error: "An amount pattern is required." });

export async function saveTemplate(input: z.input<typeof TemplateSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = TemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid template." };
  const { id, ...data } = parsed.data;
  if (!(await ownsDepo(user.id, data.defaultDepoId))) return { error: "Depo not found." };

  const values = {
    ...data,
    kind: data.outcome === "declined" ? ("expense" as const) : data.kind,
    mustContain: data.mustContain.filter(Boolean).join("\n"),
    subjectPattern: data.subjectPattern || null,
    defaultCategoryName: data.defaultCategoryName || null,
    updatedAt: new Date(),
  };

  if (id) {
    const scope = and(eq(emailTemplates.id, id), eq(emailTemplates.userId, user.id));
    const [existing] = await db.select().from(emailTemplates).where(scope).limit(1);
    if (!existing) return { error: "Template not found." };
    const [row] = await db.update(emailTemplates).set(values).where(scope).returning();
    await recordAudit({ userId: user.id, entityType: "email_template", entityId: id, action: "update", before: existing, after: row });
  } else {
    const [row] = await db.insert(emailTemplates).values({ userId: user.id, ...values }).returning();
    await recordAudit({ userId: user.id, entityType: "email_template", entityId: row.id, action: "create", after: row });
  }

  revalidateImportPages();
  return { ok: "Template saved." };
}

export async function setTemplateAutoApprove(id: string, autoApprove: boolean) {
  const user = await requireUser();
  await db
    .update(emailTemplates)
    .set({ autoApprove, updatedAt: new Date() })
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, user.id)));
  revalidateImportPages();
}

export async function deleteTemplate(id: string) {
  const user = await requireUser();
  const [existing] = await db
    .delete(emailTemplates)
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, user.id)))
    .returning();
  if (!existing) return;
  await recordAudit({ userId: user.id, entityType: "email_template", entityId: id, action: "delete", before: existing });
  revalidateImportPages();
}

const ApproveSchema = z.object({
  kind: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date is required." }),
  amount: z.coerce.number().positive({ error: "Amount must be more than zero." }).max(100_000_000),
  description: z.string().trim().max(200).optional(),
  categoryName: z.string().trim().min(1, { error: "Choose a category." }).max(120),
  depoId: z.string().optional().transform((v) => v || null),
});

export async function approvePending(id: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ApproveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (!(await ownsDepo(user.id, parsed.data.depoId))) return { error: "Depo not found." };

  const created = await commitPendingTransaction(user.id, id, {
    ...parsed.data,
    description: parsed.data.description || null,
  });
  if (!created) return { error: "This item was already handled." };

  revalidateImportPages();
  revalidateMoneyPages();
  return { ok: "Added." };
}

export async function dismissPending(id: string) {
  const user = await requireUser();
  await dismissPendingById(user.id, id);
  revalidateImportPages();
}

export async function deleteInboundEmail(id: string) {
  const user = await requireUser();
  await db.delete(inboundEmails).where(and(eq(inboundEmails.id, id), eq(inboundEmails.userId, user.id)));
  revalidateImportPages();
}

export async function retryInboundEmails(ids: string[]): Promise<ActionResult> {
  const user = await requireUser();
  if (ids.length === 0) return;
  const rows = await db
    .select()
    .from(inboundEmails)
    .where(and(eq(inboundEmails.userId, user.id), inArray(inboundEmails.id, ids)));

  let parsed = 0;
  for (const row of rows) {
    const result = await reprocessInboundEmail(row);
    if (result?.status === "parsed") parsed++;
  }

  revalidateImportPages();
  revalidateMoneyPages();
  return parsed ? { ok: `Read ${parsed} of ${rows.length} email${rows.length === 1 ? "" : "s"}.` } : { error: "Still couldn't read these emails." };
}

const MailboxSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z.string().max(200).optional(),
  host: z.string().trim().max(200).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  folder: z.string().trim().min(1).max(200).default("INBOX"),
  extraSenders: z.string().max(2000).default(""),
});

export async function saveMailbox(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!isEncryptionConfigured()) return { error: "The server has no secret to encrypt the password with." };
  const parsed = MailboxSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { email, folder } = parsed.data;

  const preset = presetForEmail(email);
  if (preset?.unsupported) return { error: preset.unsupported };
  const host = preset?.host ?? parsed.data.host;
  const port = preset?.port ?? parsed.data.port ?? 993;
  if (!host) return { error: "Enter your mail server's IMAP address." };

  const [existing] = await db.select().from(mailboxConnections).where(eq(mailboxConnections.userId, user.id)).limit(1);
  // App passwords are often shown with spaces (e.g. "abcd efgh ijkl mnop") but sent without them.
  let password = parsed.data.password?.replace(/\s+/g, "") ?? "";
  if (!password) {
    if (!existing || existing.email !== email) return { error: "Enter the app password for this mailbox." };
    try {
      password = decryptSecret(existing.encryptedPassword);
    } catch {
      return { error: "The saved app password couldn't be decrypted. Enter it again." };
    }
  }

  const loginError = await testMailboxLogin({ host, port, email, password, folder });
  if (loginError) return { error: `${loginError} Nothing was saved.` };

  const sameFolder = existing && existing.email === email && existing.host === host && existing.folder === folder;
  const values = {
    email,
    host,
    port,
    folder,
    encryptedPassword: encryptSecret(password),
    extraSenders: parseSenderList(parsed.data.extraSenders).join("\n"),
    uidValidity: sameFolder ? existing.uidValidity : null,
    lastUid: sameFolder ? existing.lastUid : null,
    lastError: null,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(mailboxConnections)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: mailboxConnections.userId, set: values })
    .returning({ id: mailboxConnections.id });

  const summary = (c: { email: string; host: string; folder: string }) => ({ email: c.email, host: c.host, folder: c.folder });
  await recordAudit({
    userId: user.id,
    entityType: "mailbox_connection",
    entityId: row.id,
    action: existing ? "update" : "create",
    before: existing ? summary(existing) : undefined,
    after: summary(values),
  });

  after(async () => {
    await syncMailbox(user.id);
    revalidateImportPages();
    revalidateMoneyPages();
  });

  revalidateImportPages();
  return { ok: "Connected. Checking for bank emails now; refresh in a minute to see them." };
}

export async function disconnectMailbox() {
  const user = await requireUser();
  const [existing] = await db.delete(mailboxConnections).where(eq(mailboxConnections.userId, user.id)).returning();
  if (!existing) return;
  await recordAudit({
    userId: user.id,
    entityType: "mailbox_connection",
    entityId: existing.id,
    action: "delete",
    before: { email: existing.email, host: existing.host, folder: existing.folder },
  });
  revalidateImportPages();
}

export async function checkMailboxNow(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await syncMailbox(user.id);
  await runAiCatchUp(user.id).catch(() => {});
  revalidateImportPages();
  if (!result.ok) return { error: result.error };
  revalidateMoneyPages();
  if (result.found === 0) return { ok: "No new bank emails." };
  const parts = [`Found ${result.found} new email${result.found === 1 ? "" : "s"}`];
  if (result.added > 0) parts.push(`${result.added} transaction${result.added === 1 ? "" : "s"} read`);
  if (result.autoAdded > 0) parts.push(`${result.autoAdded} added automatically`);
  return { ok: `${parts.join(", ")}.` };
}

export type LocalModel = { id: string; loaded: boolean | null };
export type LocalModelsResult = { models: LocalModel[] } | { error: string };

// Ollama, LM Studio and llama.cpp all serve the OpenAI-style GET /models listing.
export async function listLocalModels(baseUrl: string, apiKey?: string): Promise<LocalModelsResult> {
  const user = await requireUser();
  const url = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/i.test(url)) return { error: "Server address must start with http:// or https://." };

  let key = apiKey?.trim() ?? "";
  if (!key) {
    const [saved] = await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1);
    if (saved?.provider === "local" && saved.keyLast4) {
      try {
        key = decryptSecret(saved.encryptedKey);
      } catch {}
    }
  }

  try {
    const response = await fetch(`${url}/models`, {
      headers: key ? { authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return { error: `The server answered ${response.status} when asked for its models.` };
    const body: unknown = await response.json();
    const data = (body as { data?: unknown })?.data;
    // llama.cpp's router mode reports status.value "loaded"/"unloaded"; other servers omit it.
    const models: LocalModel[] = Array.isArray(data)
      ? data
          .filter((m) => typeof m?.id === "string")
          .map((m) => {
            const status = m.status?.value;
            return { id: m.id as string, loaded: typeof status === "string" ? status === "loaded" : null };
          })
      : [];
    if (models.length === 0) return { error: "The server is running but has no models. Pull one first, e.g. ollama pull llama3.2." };
    const rank = (m: LocalModel) => (m.loaded === false ? 1 : 0);
    return { models: models.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)) };
  } catch {
    return { error: "Couldn't reach a model server at that address." };
  }
}

const CardSchema = z.object({
  id: z.string().uuid().optional(),
  last4: z.string().trim().regex(/^\d{4}$/, { error: "Enter the card's last 4 digits." }),
  name: z.string().trim().min(1, { error: "Give the card a name." }).max(80),
  depoId: z.string().optional().transform((v) => v || null),
  declineFee: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100_000), { error: "Enter a valid decline fee." }),
});

export async function saveCard(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid card." };
  const { id, declineFee, ...data } = parsed.data;
  if (!(await ownsDepo(user.id, data.depoId))) return { error: "Depo not found." };

  const values = { ...data, declineFee: declineFee === null ? null : declineFee.toFixed(2), updatedAt: new Date() };
  const clash = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.last4, data.last4)))
    .limit(1);
  if (clash[0] && clash[0].id !== id) return { error: `You already have a card ending ${data.last4}.` };

  if (id) {
    const scope = and(eq(cards.id, id), eq(cards.userId, user.id));
    const [existing] = await db.select().from(cards).where(scope).limit(1);
    if (!existing) return { error: "Card not found." };
    const [row] = await db.update(cards).set(values).where(scope).returning();
    await recordAudit({ userId: user.id, entityType: "card", entityId: id, action: "update", before: existing, after: row });
  } else {
    const [row] = await db.insert(cards).values({ userId: user.id, ...values }).returning();
    await recordAudit({ userId: user.id, entityType: "card", entityId: row.id, action: "create", after: row });
  }

  revalidateImportPages();
  return { ok: "Card saved." };
}

export async function deleteCard(id: string) {
  const user = await requireUser();
  const [existing] = await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id))).returning();
  if (!existing) return;
  await recordAudit({ userId: user.id, entityType: "card", entityId: id, action: "delete", before: existing });
  revalidateImportPages();
}

export async function approvePendingAsIs(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const outcome = await approvePendingById(user.id, id);
  if (outcome === "already-handled") return { error: "This item was already handled." };
  if (outcome === "needs-category") return { error: "Pick a category first." };
  revalidateImportPages();
  revalidateMoneyPages();
  return { ok: "Added." };
}

export async function approveAllReady(): Promise<ActionResult> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(pendingTransactions)
    .where(
      and(
        eq(pendingTransactions.userId, user.id),
        eq(pendingTransactions.status, "pending"),
        eq(pendingTransactions.possibleDuplicate, false),
        isNotNull(pendingTransactions.categoryName)
      )
    );
  let added = 0;
  for (const row of rows) if (await commitPendingAsIs(user.id, row)) added++;
  revalidateImportPages();
  revalidateMoneyPages();
  return { ok: `Added ${added} transaction${added === 1 ? "" : "s"}.` };
}
