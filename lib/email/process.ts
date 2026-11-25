import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cards,
  emailTemplates,
  expenses,
  inboundEmails,
  income,
  pendingTransactions,
} from "@/lib/db/schema";
import { normalizeEmailBody, unwrapForwarded } from "@/lib/email/normalize";
import {
  applyTemplateRules,
  findCardLast4,
  findMatchingTemplate,
  looksDeclined,
  parsePhraseList,
  toDateKey,
  TemplateRulesSchema,
} from "@/lib/email/template";
import { describeAiError, getAvailableModel, isTransientAiError, type ModelAvailability } from "@/lib/ai/model";
import { extractTransaction } from "@/lib/ai/extract";
import { getExpenseCategories } from "@/lib/queries/lists";
import { commitPendingTransaction } from "@/lib/email/commit";
import { suggestCategory } from "@/lib/categorize";
import { cleanMerchantName } from "@/lib/email/merchant";
import { notifyPendingTransaction } from "@/lib/push/send";
import { parseLocalDate } from "@/lib/utils/date";

export type IncomingEmail = {
  userId: string;
  source: "paste" | "forward" | "mailbox";
  messageId?: string | null;
  fromAddress: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  receivedAt?: Date;
};

export type ProcessResult =
  | { status: "duplicate" }
  | { status: "parsed"; pendingId: string; autoApproved: boolean }
  | { status: "unmatched" | "failed" | "skipped"; error: string };

type Kind = "expense" | "income";
type Parsed = { kind: Kind; amount: number; date: string; description: string | null; suggestedCategory: string | null };
type Reading = {
  declined: boolean;
  kind: Kind;
  amount: number | null;
  date: string;
  description: string | null;
  cardLast4: string | null;
  suggestedCategory: string | null;
};

const DEFAULT_FEE_CATEGORY = "Bank fees";
const AI_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_OFFLINE_MESSAGE = "The AI was offline. This email will be read automatically once it's back.";

function senderName(fromAddress: string) {
  const display = /^\s*"?([^"<]+?)"?\s*</.exec(fromAddress)?.[1]?.trim();
  if (display) return display;
  return fromAddress.split("@")[1]?.split(".")[0]?.toUpperCase() || "Card";
}

// Cards are created the first time they appear so the user only has to fill in the depo and decline fee.
async function findOrCreateCard(userId: string, last4: string, nameHint: string) {
  const scope = and(eq(cards.userId, userId), eq(cards.last4, last4));
  const [existing] = await db.select().from(cards).where(scope).limit(1);
  if (existing) return existing;
  await db.insert(cards).values({ userId, last4, name: nameHint.slice(0, 80) }).onConflictDoNothing();
  const [created] = await db.select().from(cards).where(scope).limit(1);
  return created ?? null;
}

function fallbackMessageId(email: IncomingEmail) {
  return `sha256:${createHash("sha256").update(`${email.fromAddress}\n${email.subject}\n${email.body}`).digest("hex")}`;
}

async function looksLikeDuplicate(userId: string, parsed: Parsed) {
  const start = parseLocalDate(parsed.date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const amount = parsed.amount.toFixed(2);
  const table = parsed.kind === "expense" ? expenses : income;

  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.userId, userId), isNull(table.deletedAt), eq(table.amount, amount), gte(table.date, start), lt(table.date, end)))
    .limit(1);
  if (existing) return true;

  const [pending] = await db
    .select({ id: pendingTransactions.id })
    .from(pendingTransactions)
    .where(
      and(
        eq(pendingTransactions.userId, userId),
        eq(pendingTransactions.status, "pending"),
        eq(pendingTransactions.kind, parsed.kind),
        eq(pendingTransactions.amount, amount),
        gte(pendingTransactions.date, start),
        lt(pendingTransactions.date, end)
      )
    )
    .limit(1);
  return Boolean(pending);
}

export async function processEmail(
  email: IncomingEmail,
  options: { templateId?: string; aiRetryUntil?: Date | null } = {}
): Promise<ProcessResult> {
  const { userId } = email;
  const receivedAt = email.receivedAt ?? new Date();
  const unwrapped = unwrapForwarded({
    fromAddress: email.fromAddress,
    subject: email.subject,
    text: normalizeEmailBody(email.body, email.isHtml),
  });
  const { text } = unwrapped;
  email = { ...email, fromAddress: unwrapped.fromAddress, subject: unwrapped.subject };

  const [inbound] = await db
    .insert(inboundEmails)
    .values({
      userId,
      messageId: email.messageId?.trim() || fallbackMessageId(email),
      source: email.source,
      fromAddress: email.fromAddress.slice(0, 500),
      subject: email.subject.slice(0, 500),
      body: text,
      status: "unmatched",
      receivedAt,
    })
    .onConflictDoNothing()
    .returning({ id: inboundEmails.id });
  if (!inbound) return { status: "duplicate" };

  const finish = async (
    status: "unmatched" | "failed" | "skipped",
    error: string,
    templateId: string | null = null,
    retryWhenAiReturns = false
  ) => {
    const aiRetryUntil = retryWhenAiReturns ? (options.aiRetryUntil ?? new Date(Date.now() + AI_RETRY_WINDOW_MS)) : null;
    await db.update(inboundEmails).set({ status, error, templateId, aiRetryUntil }).where(eq(inboundEmails.id, inbound.id));
    return { status, error } as const;
  };

  let availability: ModelAvailability | "undecryptable" | undefined;
  const ai = async () => {
    if (availability === undefined) availability = await getAvailableModel(userId).catch(() => "undecryptable" as const);
    return availability;
  };

  const templates = await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
  const template = options.templateId
    ? templates.find((t) => t.id === options.templateId)
    : findMatchingTemplate(templates, { ...email, text });

  let reading: Reading | null = null;
  let parseMethod: "template" | "ai" = "template";
  let templateError: string | null = null;

  if (template) {
    const rules = TemplateRulesSchema.safeParse(template.rules);
    const result = rules.success
      ? applyTemplateRules(rules.data, text, receivedAt)
      : { ok: false as const, error: "This template's rules are invalid." };
    // A template without distinguishing phrases also catches its bank's decline alerts; never book those as purchases.
    const declined =
      template.outcome === "declined" || (parsePhraseList(template.mustContain).length === 0 && looksDeclined(text));
    if (result.ok && !declined && result.values.amount === null) {
      templateError = `Template "${template.name}" has no amount rule.`;
    } else if (result.ok) {
      reading = { declined, kind: template.kind, ...result.values, suggestedCategory: null };
    } else {
      templateError = `Template "${template.name}" couldn't read this email: ${result.error}`;
    }
    await db
      .update(emailTemplates)
      .set(reading ? { matchCount: sql`${emailTemplates.matchCount} + 1` } : { failCount: sql`${emailTemplates.failCount} + 1` })
      .where(eq(emailTemplates.id, template.id));
  }

  if (!reading) {
    const available = await ai();
    if (available === "undecryptable") {
      return finish("failed", "Your saved AI key couldn't be decrypted. Re-enter it in Settings.", template?.id);
    }
    if (available.status === "offline") return finish("failed", AI_OFFLINE_MESSAGE, template?.id, true);
    if (available.status === "none") {
      return finish(
        templateError ? "failed" : "unmatched",
        templateError ?? "No template matches this email. Create one, or add an AI key in Settings to read it automatically.",
        template?.id
      );
    }

    try {
      const categories = (await getExpenseCategories(userId)).map((c) => c.name);
      const extraction = await extractTransaction(available.model, { fromAddress: email.fromAddress, subject: email.subject, text, receivedAt }, categories);
      if (!extraction.isTransaction && !extraction.declined) {
        return finish("unmatched", "The AI didn't find a transaction in this email.", template?.id);
      }
      if (!extraction.declined && !(extraction.amount && extraction.amount > 0)) {
        return finish("unmatched", "The AI couldn't find an amount in this email.", template?.id);
      }
      const last4 = extraction.cardLast4?.replace(/\D/g, "").slice(-4);
      reading = {
        declined: extraction.declined,
        kind: extraction.kind,
        amount: extraction.amount ? Math.round(extraction.amount * 100) / 100 : null,
        date: extraction.date && /^\d{4}-\d{2}-\d{2}$/.test(extraction.date) ? extraction.date : toDateKey(receivedAt),
        description: extraction.description?.slice(0, 200) || null,
        cardLast4: last4?.length === 4 ? last4 : findCardLast4(text),
        suggestedCategory: extraction.suggestedCategory && categories.includes(extraction.suggestedCategory) ? extraction.suggestedCategory : null,
      };
      parseMethod = "ai";
    } catch (error) {
      if (isTransientAiError(error)) return finish("failed", AI_OFFLINE_MESSAGE, template?.id, true);
      return finish("failed", describeAiError(error), template?.id);
    }
  }

  const card = reading.cardLast4 ? await findOrCreateCard(userId, reading.cardLast4, senderName(email.fromAddress)) : null;
  const cardLabel = reading.cardLast4 ? `card ending ${reading.cardLast4}` : "this card";

  const kind: Kind = reading.declined ? "expense" : reading.kind;
  const rawDescription = reading.description;

  // Known merchants come from memory with no AI call; new ones get a clean name and category from the AI.
  let suggestion = await suggestCategory(userId, kind, rawDescription);
  let categorySource: string | null = suggestion.source;
  let aiCategoryTried = false;
  if (!suggestion.source && rawDescription) {
    const available = await ai();
    if (available !== "undecryptable" && available.status === "ok") {
      try {
        suggestion = await suggestCategory(userId, kind, rawDescription, { model: available.model, amount: reading.amount });
        aiCategoryTried = true;
      } catch {}
    }
    categorySource = null;
  }
  const cleanName = suggestion.displayName?.trim() || cleanMerchantName(rawDescription) || rawDescription;

  let parsed: Parsed;
  let categoryName: string | null;
  if (reading.declined) {
    const what = [cleanName && `at ${cleanName}`, reading.amount && `for ${reading.amount.toFixed(2)}`].filter(Boolean).join(" ");
    const fee = card?.declineFee ? Number(card.declineFee) : 0;
    if (!card || fee <= 0) {
      const reason = card
        ? `Set a decline fee for ${cardLabel} under Cards if your bank charges one.`
        : "No card number was found, so no decline fee could be applied.";
      return finish("skipped", `Declined transaction${what ? ` ${what}` : ""}. Nothing was added. ${reason}`, template?.id);
    }
    parsed = {
      kind: "expense",
      amount: fee,
      date: reading.date,
      description: `Declined fee${cleanName ? `: ${cleanName}` : ""}`.slice(0, 200),
      suggestedCategory: null,
    };
    categoryName = template?.defaultCategoryName ?? DEFAULT_FEE_CATEGORY;
    categorySource = "template";
  } else {
    parsed = {
      kind: reading.kind,
      amount: reading.amount!,
      date: reading.date,
      description: cleanName,
      suggestedCategory: reading.suggestedCategory,
    };
    if (categorySource) {
      categoryName = suggestion.categoryName;
    } else if (template?.defaultCategoryName) {
      categoryName = template.defaultCategoryName;
      categorySource = "template";
    } else {
      categoryName = suggestion.categoryName ?? reading.suggestedCategory;
      categorySource = categoryName ? "ai" : null;
    }
  }

  const possibleDuplicate = await looksLikeDuplicate(userId, parsed);
  const depoId = card?.depoId ?? template?.defaultDepoId ?? null;
  const originalDescription = rawDescription && rawDescription !== parsed.description ? rawDescription : null;

  const [pending] = await db
    .insert(pendingTransactions)
    .values({
      userId,
      inboundEmailId: inbound.id,
      templateId: template?.id ?? null,
      kind: parsed.kind,
      date: parseLocalDate(parsed.date),
      amount: parsed.amount.toFixed(2),
      description: parsed.description,
      originalDescription,
      categoryName,
      categorySource,
      aiCategoryTried,
      depoId,
      parseMethod,
      possibleDuplicate,
    })
    .returning({ id: pendingTransactions.id });

  await db
    .update(inboundEmails)
    .set({ status: "parsed", templateId: template?.id ?? null, error: templateError })
    .where(eq(inboundEmails.id, inbound.id));

  // An AI guess always goes to review; only categories the user has chosen before are trusted automatically.
  const canAutoApprove =
    template?.autoApprove && parseMethod === "template" && categoryName && categorySource !== "ai" && !possibleDuplicate;
  if (canAutoApprove && categoryName) {
    await commitPendingTransaction(userId, pending.id, {
      kind: parsed.kind,
      date: parsed.date,
      amount: parsed.amount,
      description: parsed.description,
      categoryName,
      depoId,
    });
  }
  // A failed notification must never block the import itself.
  if (!canAutoApprove) await notifyPendingTransaction(userId, pending.id).catch(() => {});


  return { status: "parsed", pendingId: pending.id, autoApproved: Boolean(canAutoApprove) };
}

const RETENTION_DAYS = 30;

export async function purgeOldEmailBodies() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const purged = await db
    .update(inboundEmails)
    .set({ body: null })
    .where(and(lt(inboundEmails.receivedAt, cutoff), sql`${inboundEmails.body} is not null`))
    .returning({ id: inboundEmails.id });
  return purged.length;
}
