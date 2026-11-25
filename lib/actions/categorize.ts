"use server";

import * as z from "zod";
import { requireUser } from "@/lib/auth/dal";
import { getUserModel } from "@/lib/ai/model";
import { suggestCategory, type Suggestion } from "@/lib/categorize";

const Input = z.object({ kind: z.enum(["expense", "income"]), description: z.string().trim().min(3).max(200) });

export async function suggestCategoryFor(kind: "expense" | "income", description: string): Promise<Suggestion | null> {
  const user = await requireUser();
  const parsed = Input.safeParse({ kind, description });
  if (!parsed.success) return null;
  const model = await getUserModel(user.id).catch(() => null);
  try {
    const suggestion = await suggestCategory(user.id, parsed.data.kind, parsed.data.description, { model });
    return suggestion.categoryName ? suggestion : null;
  } catch {
    return null;
  }
}
