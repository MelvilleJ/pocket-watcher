"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { generateTemplateDraft, saveTemplate } from "@/lib/actions/email-import";
import { normalizeEmailBody, unwrapForwarded } from "@/lib/email/normalize";
import { applyTemplateRules, parsePhraseList, templateMatches, type TemplateOutcome, type TemplateRules } from "@/lib/email/template";
import {
  hintClass,
  inputClass,
  labelClass,
  monoInputClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
} from "@/components/email-import/ui";

export type TemplateDraft = {
  id?: string;
  name: string;
  kind: "expense" | "income";
  senderPattern: string;
  subjectPattern: string | null;
  outcome: TemplateOutcome;
  // Newline-separated while editing so the textarea can hold an empty trailing line.
  mustContain: string;
  rules: TemplateRules;
  defaultDepoId: string | null;
  defaultCategoryName: string | null;
  autoApprove: boolean;
};

export type EmailSample = { fromAddress: string; subject: string; text: string };

type Option = { id: string; name: string };

export type CardOption = { last4: string; name: string; declineFee: string | null };

export const EMPTY_RULES: TemplateRules = { amount: "", description: null, date: null, dateFormat: null, card: null };

function prepareSample(sample: EmailSample) {
  return unwrapForwarded({ ...sample, text: normalizeEmailBody(sample.text) });
}

function formatDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ReadRow({ label, ok, children }: { label: string; ok: boolean | null; children: ReactNode }) {
  const tone = ok === false ? "text-red-600" : ok === null ? "text-[color:var(--muted)]" : "";
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-[color:var(--muted)]">{label}</dt>
      <dd className={tone}>{children}</dd>
    </div>
  );
}

function MatchNote({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`text-xs ${ok ? "text-[color:var(--status-good)]" : "text-red-600"}`}>
      {ok ? "✓ " : "✗ "}
      {children}
    </span>
  );
}

export function TemplateEditor({
  initial,
  initialSample,
  autoGenerate,
  depos,
  categories,
  sources,
  cards,
  aiEnabled,
  currency,
  onClose,
}: {
  initial: TemplateDraft;
  initialSample: EmailSample;
  autoGenerate?: boolean;
  depos: Option[];
  categories: Option[];
  sources: Option[];
  cards: CardOption[];
  aiEnabled: boolean;
  currency: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [sample, setSample] = useState(initialSample);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  const autoStarted = useRef(false);

  const prepared = useMemo(() => prepareSample(sample), [sample]);
  const hasSample = prepared.text.trim().length > 0;
  const declined = draft.outcome === "declined";
  const preview = useMemo(
    () => (hasSample && (draft.rules.amount || declined) ? applyTemplateRules(draft.rules, prepared.text, new Date()) : null),
    [draft.rules, prepared.text, hasSample, declined]
  );
  const values = preview?.ok ? preview.values : null;
  const card = values?.cardLast4 ? cards.find((c) => c.last4 === values.cardLast4) : undefined;
  const fee = card?.declineFee && Number(card.declineFee) > 0 ? Number(card.declineFee) : null;
  const senderOk = templateMatches({ senderPattern: draft.senderPattern, subjectPattern: null, mustContain: "" }, prepared);
  const phrases = parsePhraseList(draft.mustContain);
  const missingPhrases = phrases.filter((p) => !prepared.text.toLowerCase().includes(p.toLowerCase()));
  const subjectOk =
    !draft.subjectPattern?.trim() || prepared.subject.toLowerCase().includes(draft.subjectPattern.trim().toLowerCase());
  const amountMissing = !declined && !draft.rules.amount;

  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setRule = <K extends keyof TemplateRules>(key: K, value: string) =>
    setDraft((d) => ({ ...d, rules: { ...d.rules, [key]: key === "amount" ? value : value || null } }));

  function generate() {
    setAiMessage(null);
    startGenerating(async () => {
      const result = await generateTemplateDraft({ ...prepared });
      if ("error" in result) {
        setAiMessage(result.error);
        return;
      }
      const { name, kind, outcome, mustContain, senderPattern, subjectPattern, rules, check } = result.draft;
      setDraft((d) => ({ ...d, name: d.name || name, kind, outcome, mustContain: mustContain.join("\n"), senderPattern, subjectPattern, rules }));
      if (!check.ok) {
        setAiMessage(
          "Couldn't find the amount. Try again or use a larger model."
        );
      }
    });
  }

  useEffect(() => {
    if (autoGenerate && aiEnabled && hasSample && !autoStarted.current) {
      autoStarted.current = true;
      generate();
    }
    // Runs once when the editor opens from an email.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveTemplate({ ...draft, mustContain: parsePhraseList(draft.mustContain) });
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  const names = draft.kind === "expense" || declined ? categories : sources;
  const blockers = [
    !draft.senderPattern.trim() && "Add a sender.",
    amountMissing && "Amount not found yet.",
  ].filter(Boolean) as string[];

  return (
    <section className={`${sectionClass} grid gap-6`} aria-labelledby="template-editor-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="template-editor-title" className={sectionTitleClass}>
            {draft.id ? "Edit template" : "Teach Pocket Watcher this alert"}
          </h2>
          <p className={hintClass}>
            Emails like this are then read automatically.
          </p>
        </div>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>

      <details className="rounded-lg border border-black/10 dark:border-white/10 p-4" open={!hasSample}>
        <summary className={`${labelClass} cursor-pointer`}>
          {hasSample ? `Sample email: ${prepared.subject || "(no subject)"}` : "Paste a sample email"}
        </summary>
        <div className="mt-3 grid gap-3">
          <input
            value={sample.fromAddress}
            onChange={(e) => setSample((s) => ({ ...s, fromAddress: e.target.value }))}
            placeholder="From, e.g. alerts@mybank.com"
            aria-label="Sample sender"
            className={inputClass}
          />
          <input
            value={sample.subject}
            onChange={(e) => setSample((s) => ({ ...s, subject: e.target.value }))}
            placeholder="Subject"
            aria-label="Sample subject"
            className={inputClass}
          />
          <textarea
            value={sample.text}
            onChange={(e) => setSample((s) => ({ ...s, text: e.target.value }))}
            placeholder="Paste the full text of one alert email"
            aria-label="Sample email text"
            rows={8}
            className={monoInputClass}
          />
        </div>
      </details>

      {aiEnabled && (
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <button type="button" onClick={generate} disabled={!hasSample || generating} className={secondaryButtonClass}>
            {generating ? "Reading the email..." : draft.rules.amount || declined ? "Set up again with AI" : "Set up with AI"}
          </button>
          {generating && <p className={hintClass}>Up to a minute on local models.</p>}
          {aiMessage && !generating && <p className="text-sm text-red-600">{aiMessage}</p>}
        </div>
      )}

      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4" aria-live="polite">
        <h3 className={`${labelClass} mb-2`}>What Pocket Watcher will read</h3>
        {!hasSample ? (
          <p className={hintClass}>Add a sample email to see a preview.</p>
        ) : generating ? (
          <p className={hintClass}>Working it out...</p>
        ) : preview && !preview.ok ? (
          <p className="text-sm text-red-600">{preview.error}</p>
        ) : (
          <dl className="divide-y divide-black/5 dark:divide-white/5">
            <ReadRow label="Records" ok={true}>
              {declined ? "Decline fee" : draft.kind === "expense" ? "Money out" : "Money in"}
            </ReadRow>
            <ReadRow label="Amount" ok={declined ? (fee ? true : null) : values?.amount ? true : false}>
              {declined
                ? fee
                  ? `${currency}${fee.toFixed(2)} decline fee`
                  : values?.cardLast4
                    ? `No fee set for card ${values.cardLast4}. Add it under Cards.`
                    : "No card found"
                : values?.amount
                  ? `${currency}${values.amount.toFixed(2)}`
                  : "Not found yet"}
            </ReadRow>
            <ReadRow label="Merchant" ok={values?.description ? true : null}>
              {values?.description ?? "Not found"}
            </ReadRow>
            <ReadRow label="Date" ok={true}>
              {values?.dateFromEmail ? formatDay(values.date) : "The day the email arrives"}
            </ReadRow>
            <ReadRow label="Card" ok={values?.cardLast4 ? true : null}>
              {!values?.cardLast4
                ? "No card number found"
                : card
                  ? `Ending ${card.last4} (${card.name})`
                  : `Ending ${values.cardLast4} (new)`}
            </ReadRow>
          </dl>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <h3 className={labelClass}>Which emails this applies to</h3>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>From an address containing</span>
            <input value={draft.senderPattern} onChange={(e) => set("senderPattern", e.target.value)} placeholder="@mybank.com" className={inputClass} />
            {hasSample && draft.senderPattern.trim() && (
              <MatchNote ok={senderOk}>{senderOk ? "Matches the sample" : "Doesn't match the sample's sender"}</MatchNote>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>And mentioning (one phrase per line)</span>
            <textarea
              value={draft.mustContain}
              onChange={(e) => set("mustContain", e.target.value)}
              rows={2}
              placeholder={declined ? "was declined" : "was approved"}
              className={inputClass}
            />
            {hasSample && phrases.length > 0 && (
              <MatchNote ok={missingPhrases.length === 0}>
                {missingPhrases.length === 0
                  ? "All found in the sample"
                  : `Not in the sample: ${missingPhrases.map((p) => `"${p}"`).join(", ")}`}
              </MatchNote>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>With a subject containing (optional)</span>
            <input
              value={draft.subjectPattern ?? ""}
              onChange={(e) => set("subjectPattern", e.target.value || null)}
              className={inputClass}
            />
            {hasSample && draft.subjectPattern?.trim() && (
              <MatchNote ok={subjectOk}>{subjectOk ? "Matches the sample" : "Doesn't match the sample's subject"}</MatchNote>
            )}
          </label>
        </div>

        <div className="grid content-start gap-4">
          <h3 className={labelClass}>How to record them</h3>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Name</span>
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="JMMB card purchase" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>This alert is</span>
            <select value={draft.outcome} onChange={(e) => set("outcome", e.target.value as TemplateOutcome)} className={inputClass}>
              <option value="transaction">A transaction that went through</option>
              <option value="declined">A declined transaction (records the card&rsquo;s fee)</option>
            </select>
          </label>
          {!declined && (
            <label className="flex flex-col gap-1">
              <span className={hintClass}>Money</span>
              <select value={draft.kind} onChange={(e) => set("kind", e.target.value as TemplateDraft["kind"])} className={inputClass}>
                <option value="expense">Out (purchases, payments)</option>
                <option value="income">In (deposits, refunds)</option>
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={hintClass}>{draft.kind === "income" && !declined ? "Income source" : "Category"} (optional)</span>
            <input
              list="template-default-names"
              value={draft.defaultCategoryName ?? ""}
              onChange={(e) => set("defaultCategoryName", e.target.value || null)}
              placeholder={declined ? "Bank fees" : "Picked from past transactions"}
              className={inputClass}
            />
            <datalist id="template-default-names">
              {names.map((n) => (
                <option key={n.id} value={n.name} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Depo, when the card doesn&rsquo;t have one</span>
            <select value={draft.defaultDepoId ?? ""} onChange={(e) => set("defaultDepoId", e.target.value || null)} className={inputClass}>
              <option value="">None</option>
              {depos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={draft.autoApprove} onChange={(e) => set("autoApprove", e.target.checked)} className="mt-1" />
            <span>
              Add these automatically
              <span className={`block ${hintClass}`}>Skips review, except for possible duplicates.</span>
            </span>
          </label>
        </div>
      </div>

      <details className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <summary className={`${hintClass} cursor-pointer font-medium`}>Advanced: how each value is found</summary>
        <p className={`${hintClass} mt-2`}>
          Regular expressions. The bracketed part is the value.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Amount{declined && " (optional)"}</span>
            <input value={draft.rules.amount} onChange={(e) => setRule("amount", e.target.value)} placeholder="Amount:\s*\$?([\d,]+\.\d{2})" className={monoInputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Merchant</span>
            <input value={draft.rules.description ?? ""} onChange={(e) => setRule("description", e.target.value)} placeholder="at\s+(.+?)\s+for" className={monoInputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Date</span>
            <input value={draft.rules.date ?? ""} onChange={(e) => setRule("date", e.target.value)} placeholder="on\s+(\d{1,2} \w{3} \d{4})" className={monoInputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={hintClass}>Card number</span>
            <input value={draft.rules.card ?? ""} onChange={(e) => setRule("card", e.target.value)} placeholder="ending\s+(\d{4})" className={monoInputClass} />
          </label>
        </div>
      </details>

      <div className="grid gap-2">
        {blockers.map((b) => (
          <p key={b} className={hintClass}>
            {b}
          </p>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving || generating || blockers.length > 0} className={primaryButtonClass}>
            {saving ? "Saving..." : "Save template"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}
