"use client";

import { useActionState, useEffect, useState } from "react";
import { listLocalModels, removeAiSettings, saveAiSettings, type LocalModel } from "@/lib/actions/email-import";
import { AI_PROVIDERS, LOCAL_BASE_URLS, type AiProvider } from "@/lib/ai/providers";
import {
  hintClass,
  inputClass,
  labelClass,
  linkButtonClass,
  primaryButtonClass,
} from "@/components/email-import/ui";

type Current = { provider: AiProvider; model: string; baseUrl: string | null; keyLast4: string } | null;

function providerInfo(provider: AiProvider) {
  return AI_PROVIDERS.find((p) => p.value === provider)!;
}

export function AiSettingsForm({ current, encryptionReady }: { current: Current; encryptionReady: boolean }) {
  const [state, action, pending] = useActionState(saveAiSettings, undefined);
  const [provider, setProvider] = useState<AiProvider>(current?.provider ?? "anthropic");
  const [model, setModel] = useState(current?.model ?? providerInfo(provider).defaultModel);
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? LOCAL_BASE_URLS[0].url);
  const isLocal = provider === "local";
  const hasSavedKey = current?.provider === provider && Boolean(current.keyLast4);
  const [localModels, setLocalModels] = useState<{ url: string; models: LocalModel[]; error?: string } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!isLocal) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await listLocalModels(baseUrl);
      if (cancelled) return;
      if ("error" in result) {
        setLocalModels({ url: baseUrl, models: [], error: result.error });
        return;
      }
      setLocalModels({ url: baseUrl, models: result.models });
      setModel((m) => (result.models.some((x) => x.id === m) ? m : result.models[0].id));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLocal, baseUrl, refreshCount]);

  const loadingModels = isLocal && localModels?.url !== baseUrl;
  const servedModels = isLocal && !loadingModels ? (localModels?.models ?? []) : [];

  function changeProvider(next: AiProvider) {
    setProvider(next);
    setModel(next === current?.provider ? current.model : providerInfo(next).defaultModel);
  }

  if (!encryptionReady) {
    return (
      <p className={hintClass}>
        AI keys are disabled because the server has no <code>SESSION_SECRET</code> to encrypt them with.
      </p>
    );
  }

  return (
    <div className="grid max-w-md gap-4">
      {current && (
        <p className="text-sm">
          Using <span className="font-medium">{providerInfo(current.provider).label}</span>{" "}
          <span className="font-mono text-xs">{current.model}</span>
          {current.baseUrl && (
            <>
              {" "}at <span className="font-mono text-xs">{current.baseUrl}</span>
            </>
          )}
          {current.keyLast4 && (
            <>
              {" "}with key ending <span className="font-mono text-xs">{current.keyLast4}</span>
            </>
          )}
          .
        </p>
      )}
      <form action={action} className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Provider</span>
          <select
            name="provider"
            value={provider}
            onChange={(e) => changeProvider(e.target.value as AiProvider)}
            className={inputClass}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {isLocal && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Server address</span>
            <input
              name="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
            <span className={`${hintClass} flex flex-wrap gap-x-3`}>
              {LOCAL_BASE_URLS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => setBaseUrl(preset.url)} className="font-medium hover:underline">
                  Use {preset.label}
                </button>
              ))}
            </span>
            <span className={hintClass}>
              Any OpenAI-compatible server. &ldquo;localhost&rdquo; is the Pocket Watcher server.
            </span>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Model</span>
          {servedModels.length > 0 ? (
            <select name="model" value={model} onChange={(e) => setModel(e.target.value)} className={`${inputClass} font-mono`}>
              {servedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                  {m.loaded === false ? " (not loaded)" : m.loaded ? " (loaded)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
          )}
          {isLocal ? (
            <span className={`${hintClass} flex flex-wrap gap-x-3`} aria-live="polite">
              {loadingModels ? (
                <span>Looking for models on the server...</span>
              ) : localModels?.error ? (
                <span className="text-red-600">{localModels.error}</span>
              ) : (
                <span>
                  {servedModels.length} model{servedModels.length === 1 ? "" : "s"} on this server.
                  {servedModels.find((m) => m.id === model)?.loaded === false &&
                    " Not loaded on the server."}
                </span>
              )}
              {!loadingModels && (
                <button type="button" onClick={() => setRefreshCount((n) => n + 1)} className="font-medium hover:underline">
                  Refresh
                </button>
              )}
            </span>
          ) : (
            <span className={hintClass}>A small, fast model is enough.</span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>API key{isLocal && " (optional)"}</span>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={hasSavedKey ? `Saved key ending ${current?.keyLast4}` : providerInfo(provider).keyHint}
            required={!isLocal && !hasSavedKey}
            className={`${inputClass} font-mono`}
          />
          {!isLocal && (
            <span className={hintClass}>
              Stored encrypted. Billed by your provider.
            </span>
          )}
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-[color:var(--status-good)]">{state.ok}</p>}
        <button disabled={pending} type="submit" className={`w-fit ${primaryButtonClass}`}>
          {pending ? "Testing connection..." : current ? "Save and test" : "Connect"}
        </button>
      </form>
      {current && (
        <form action={removeAiSettings}>
          <button type="submit" className={`${linkButtonClass} text-red-600`}>
            Remove
          </button>
        </form>
      )}
    </div>
  );
}
