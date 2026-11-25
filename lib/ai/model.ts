import "server-only";
import { eq } from "drizzle-orm";
import type { LanguageModel } from "ai";
import { APICallError } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogle } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/ai/crypto";
import type { AiProvider } from "@/lib/ai/providers";

// Reasoning models (Qwen3, DeepSeek-R1 distills) otherwise spend minutes "thinking" before answering, which
// reading a bank alert doesn't need. llama.cpp and vLLM honour chat_template_kwargs; Ollama reads "think".
// Servers ignore fields they don't know.
const withoutThinking: typeof fetch = (input, init) => {
  if (typeof init?.body !== "string") return fetch(input, init);
  try {
    const body = JSON.parse(init.body);
    body.chat_template_kwargs = { ...body.chat_template_kwargs, enable_thinking: false };
    body.think = false;
    return fetch(input, { ...init, body: JSON.stringify(body) });
  } catch {
    return fetch(input, init);
  }
};

export function buildModel(provider: AiProvider, model: string, apiKey: string, baseUrl?: string | null): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogle({ apiKey })(model);
    case "openrouter":
      return createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", name: "openrouter" }).chat(model);
    case "local":
      // OpenAI-compatible servers ignore the key, but the SDK requires a non-empty one.
      return createOpenAI({ apiKey: apiKey || "local", baseURL: baseUrl ?? undefined, name: "local", fetch: withoutThinking }).chat(model);
  }
}

export async function getUserModel(userId: string): Promise<LanguageModel | null> {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1);
  if (!row) return null;
  return buildModel(row.provider, row.model, decryptSecret(row.encryptedKey), row.baseUrl);
}

function providerMessage(error: APICallError) {
  try {
    const body = JSON.parse(error.responseBody ?? "");
    const message = body?.error?.message ?? body?.message ?? body?.error;
    if (typeof message === "string" && message.trim()) return message.trim().slice(0, 200);
  } catch {}
  return null;
}

export function describeAiError(error: unknown) {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) return "The AI provider rejected your API key.";
    if (error.statusCode === 429) return "The AI provider's rate limit or quota was hit. Check your plan or try again later.";
    const detail = providerMessage(error);
    if (error.statusCode === 404 && !detail) return "The AI provider doesn't recognise that model name.";
    const status = error.statusCode ? ` (${error.statusCode})` : "";
    return detail ? `The AI provider said${status}: "${detail}".` : `The AI provider returned an error${status}.`;
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "The AI model took too long to answer (over 2 minutes). Try a smaller or faster model.";
  }
  return "Couldn't reach the AI provider. For a local model, check that its server is running and the address is right.";
}

export type ModelAvailability =
  | { status: "none" }
  | { status: "offline" }
  | { status: "ok"; model: LanguageModel };

const HEALTH_TTL_MS = 60_000;
const healthCache = new Map<string, { ok: boolean; at: number }>();

// Local servers go down far more often than hosted APIs, and a stuck one would otherwise make every email wait
// out the full request timeout. Hosted providers are assumed up; their failures are classified after the call.
async function localServerUp(baseUrl: string) {
  const cached = healthCache.get(baseUrl);
  if (cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.ok;
  let ok = false;
  try {
    const response = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(2_000), cache: "no-store" });
    ok = response.ok;
  } catch {
    ok = false;
  }
  healthCache.set(baseUrl, { ok, at: Date.now() });
  return ok;
}

export async function getAvailableModel(userId: string): Promise<ModelAvailability> {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1);
  if (!row) return { status: "none" };
  const apiKey = decryptSecret(row.encryptedKey);
  if (row.provider === "local" && row.baseUrl && !(await localServerUp(row.baseUrl))) return { status: "offline" };
  return { status: "ok", model: buildModel(row.provider, row.model, apiKey, row.baseUrl) };
}

// Outages are worth retrying later; a bad key, unknown model or rejected request won't fix itself.
export function isTransientAiError(error: unknown) {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 0;
    return status === 429 || status >= 500 || status === 0 || Boolean(error.isRetryable);
  }
  return true;
}
