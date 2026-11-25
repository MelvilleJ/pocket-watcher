import * as z from "zod";
import { format, isValid, parse } from "date-fns";

const pattern = z.string().trim().max(300, { error: "Patterns must be 300 characters or fewer." });

export const TemplateRulesSchema = z.object({
  // Empty for decline templates, whose amount comes from the card's decline fee.
  amount: pattern.default(""),
  description: pattern.nullable().default(null),
  date: pattern.nullable().default(null),
  dateFormat: z.string().trim().max(40).nullable().default(null),
  card: pattern.nullable().default(null),
});

export type TemplateRules = z.infer<typeof TemplateRulesSchema>;

export type TemplateOutcome = "transaction" | "declined";

export type ParsedValues = {
  amount: number | null;
  description: string | null;
  date: string;
  dateFromEmail: boolean;
  cardLast4: string | null;
};

export type ParseResult = { ok: true; values: ParsedValues } | { ok: false; error: string };

export function compilePattern(source: string) {
  try {
    return new RegExp(source, "i");
  } catch {
    return null;
  }
}

function capture(source: string, text: string) {
  const regex = compilePattern(source);
  if (!regex) return { error: "One of the advanced rules has a typo, so it can't be used." };
  const match = regex.exec(text);
  if (!match) return { value: null };
  return { value: (match[1] ?? match[0]).trim() };
}

export function parseAmount(raw: string) {
  let cleaned = raw.replace(/[^\d.,]/g, "");
  const decimalComma = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") && /,\d{1,2}$/.test(cleaned);
  cleaned = decimalComma ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const CARD_HINT = /(?:ending(?:\s+(?:in|with))?|last\s+(?:4|four)(?:\s+digits)?|card\s+no\.?|[x*•]{2,})\s*:?\s*(\d{4})\b/i;

export function findCardLast4(text: string) {
  return CARD_HINT.exec(text)?.[1] ?? null;
}

const DECLINE_WORDS = /\b(declined|was not approved|not authori[sz]ed|unsuccessful|insufficient funds)\b/i;

export function looksDeclined(text: string) {
  return DECLINE_WORDS.test(text);
}

const DATE_FORMATS = [
  "d MMM yyyy",
  "d MMMM yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "MMM d yyyy",
  "EEE, d MMM yyyy",
  "EEEE, MMMM d, yyyy",
  "EEEE, d MMMM yyyy",
  "d-MMM-yyyy",
  "d-MMM-yy",
  "yyyy-MM-dd",
  "d/M/yyyy",
  "M/d/yyyy",
  "d/M/yy",
  "M/d/yy",
  "d-M-yyyy",
  "d.M.yyyy",
];

const TIME_PART = /,?\s*(?:at\s+)?\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?(?:\s*\(?[A-Z]{2,5}\)?)?/gi;

// Picks the first reading that lands near the day the email arrived, which settles day/month order for
// dates like 03/04/2026 and rejects nonsense parses. Times are dropped because only the day is stored.
export function parseFlexibleDate(raw: string, hintFormat: string | null, receivedAt: Date) {
  const cleaned = raw.replace(/\(.*?\)/g, " ").replace(TIME_PART, " ").replace(/\s+/g, " ").trim().replace(/[.,]$/, "");
  const earliest = receivedAt.getTime() - 400 * 24 * 60 * 60 * 1000;
  const latest = receivedAt.getTime() + 2 * 24 * 60 * 60 * 1000;
  const formats = hintFormat ? [hintFormat, ...DATE_FORMATS] : DATE_FORMATS;
  for (const candidate of [raw.trim(), cleaned]) {
    for (const fmt of formats) {
      const parsed = parse(candidate, fmt, receivedAt);
      if (isValid(parsed) && parsed.getTime() >= earliest && parsed.getTime() <= latest) return parsed;
    }
  }
  return null;
}

export function applyTemplateRules(rules: TemplateRules, text: string, receivedAt: Date): ParseResult {
  let amount: number | null = null;
  if (rules.amount) {
    const amountMatch = capture(rules.amount, text);
    if ("error" in amountMatch) return { ok: false, error: amountMatch.error! };
    if (!amountMatch.value) return { ok: false, error: "The amount couldn't be found in this email." };
    amount = parseAmount(amountMatch.value);
    if (amount === null) return { ok: false, error: `"${amountMatch.value}" doesn't look like an amount.` };
  }

  let description: string | null = null;
  if (rules.description) {
    const result = capture(rules.description, text);
    if ("error" in result) return { ok: false, error: result.error! };
    description = result.value?.replace(/\s+/g, " ").slice(0, 200) ?? null;
  }

  let date = toDateKey(receivedAt);
  let dateFromEmail = false;
  if (rules.date) {
    const result = capture(rules.date, text);
    if ("error" in result) return { ok: false, error: result.error! };
    const parsed = result.value ? parseFlexibleDate(result.value, rules.dateFormat, receivedAt) : null;
    if (parsed) {
      date = toDateKey(parsed);
      dateFromEmail = true;
    }
  }

  let cardLast4: string | null = null;
  if (rules.card) {
    const result = capture(rules.card, text);
    if ("error" in result) return { ok: false, error: result.error! };
    cardLast4 = result.value?.replace(/\D/g, "").slice(-4) || null;
  }
  cardLast4 = cardLast4?.length === 4 ? cardLast4 : findCardLast4(text);

  return { ok: true, values: { amount, description, date, dateFromEmail, cardLast4 } };
}

export function parsePhraseList(value: string) {
  return value
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

function includesInsensitive(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export type MatchableTemplate = { senderPattern: string; subjectPattern: string | null; mustContain: string };

export function templateMatches(template: MatchableTemplate, email: { fromAddress: string; subject: string; text: string }) {
  if (!template.senderPattern.trim() || !includesInsensitive(email.fromAddress, template.senderPattern)) return false;
  if (template.subjectPattern?.trim() && !includesInsensitive(email.subject, template.subjectPattern)) return false;
  return parsePhraseList(template.mustContain).every((phrase) => includesInsensitive(email.text, phrase));
}

// When an approved and a declined template share a sender, the one with more conditions is the better fit.
export function findMatchingTemplate<T extends MatchableTemplate>(
  templates: T[],
  email: { fromAddress: string; subject: string; text: string }
) {
  const specificity = (t: T) => parsePhraseList(t.mustContain).length * 2 + (t.subjectPattern?.trim() ? 1 : 0);
  return [...templates].sort((a, b) => specificity(b) - specificity(a)).find((t) => templateMatches(t, email));
}
