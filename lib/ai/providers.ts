type ProviderInfo = {
  value: string;
  label: string;
  defaultModel: string;
  keyHint: string;
  local?: boolean;
};

export const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-haiku-5-5", keyHint: "sk-ant-..." },
  { value: "openai", label: "OpenAI", defaultModel: "gpt-5-mini", keyHint: "sk-..." },
  { value: "google", label: "Google Gemini", defaultModel: "gemini-flash-latest", keyHint: "AIza..." },
  { value: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-5-mini", keyHint: "sk-or-..." },
  { value: "local", label: "Local model (Ollama, LM Studio)", defaultModel: "llama3.2", keyHint: "Usually not needed", local: true },
] as const satisfies readonly ProviderInfo[];

export const LOCAL_BASE_URLS = [
  { label: "Ollama", url: "http://localhost:11434/v1" },
  { label: "LM Studio", url: "http://localhost:1234/v1" },
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number]["value"];

export const AI_PROVIDER_VALUES = AI_PROVIDERS.map((p) => p.value) as [AiProvider, ...AiProvider[]];

export function providerLabel(provider: AiProvider) {
  return AI_PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}
