import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { LanguageModel } from "ai";
import { db } from "@/lib/db";
import { expenses, income, merchantRules } from "@/lib/db/schema";
import { merchantKey } from "@/lib/email/merchant";
import { categorizeMerchant } from "@/lib/ai/extract";
import { getExpenseCategories, getIncomeSources } from "@/lib/queries/lists";

type Kind = "expense" | "income";

export type CategorySource = "memory" | "history" | "ai";

export type Suggestion = {
  categoryName: string | null;
  displayName: string | null;
  source: CategorySource | null;
  isNewCategory: boolean;
};

const EMPTY: Suggestion = { categoryName: null, displayName: null, source: null, isNewCategory: false };

async function fromHistory(userId: string, kind: Kind, description: string) {
  if (kind === "expense") {
    const [row] = await db
      .select({ name: expenses.categoryName })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), isNull(expenses.deletedAt), sql`lower(${expenses.description}) = lower(${description})`))
      .orderBy(desc(expenses.date))
      .limit(1);
    return row?.name ?? null;
  }
  const [row] = await db
    .select({ name: income.sourceName })
    .from(income)
    .where(and(eq(income.userId, userId), isNull(income.deletedAt), sql`lower(${income.description}) = lower(${description})`))
    .orderBy(desc(income.date))
    .limit(1);
  return row?.name ?? null;
}

// Memory and history are free and instant; the AI is only asked about merchants the user hasn't categorised yet.
export async function suggestCategory(
  userId: string,
  kind: Kind,
  description: string | null,
  options: { model?: LanguageModel | null; amount?: number | null } = {}
): Promise<Suggestion> {
  if (!description?.trim()) return EMPTY;
  const key = merchantKey(description);
  if (key) {
    const [rule] = await db
      .select()
      .from(merchantRules)
      .where(and(eq(merchantRules.userId, userId), eq(merchantRules.kind, kind), eq(merchantRules.merchantKey, key)))
      .limit(1);
    if (rule) return { categoryName: rule.categoryName, displayName: rule.displayName, source: "memory", isNewCategory: false };
  }

  const historical = await fromHistory(userId, kind, description);
  if (historical) return { categoryName: historical, displayName: null, source: "history", isNewCategory: false };

  if (!options.model) return EMPTY;
  const lists = kind === "expense" ? await getExpenseCategories(userId) : await getIncomeSources(userId);
  const result = await categorizeMerchant(options.model, {
    description,
    kind,
    amount: options.amount ?? null,
    categories: lists.map((c) => c.name),
  });
  return { categoryName: result.category, displayName: result.cleanName, source: result.category ? "ai" : null, isNewCategory: result.isNew };
}

export async function learnMerchant(
  userId: string,
  kind: Kind,
  values: { originalDescription: string | null; description: string | null; categoryName: string }
) {
  const keys = new Set([merchantKey(values.originalDescription), merchantKey(values.description)].filter(Boolean) as string[]);
  for (const key of keys) {
    const set = { categoryName: values.categoryName, displayName: values.description, updatedAt: new Date() };
    await db
      .insert(merchantRules)
      .values({ userId, kind, merchantKey: key, ...set })
      .onConflictDoUpdate({ target: [merchantRules.userId, merchantRules.kind, merchantRules.merchantKey], set });
  }
}
