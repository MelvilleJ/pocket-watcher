"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteInboundEmail,
  deleteTemplate,
  retryInboundEmails,
  setTemplateAutoApprove,
  type ActionResult,
} from "@/lib/actions/email-import";
import { TemplateRulesSchema } from "@/lib/email/template";
import {
  EMPTY_RULES,
  TemplateEditor,
  type CardOption,
  type EmailSample,
  type TemplateDraft,
} from "@/components/email-import/template-editor";
import {
  hintClass,
  linkButtonClass,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
} from "@/components/email-import/ui";

type Option = { id: string; name: string };

export type UnreadEmail = {
  id: string;
  source: "paste" | "forward" | "mailbox";
  fromAddress: string;
  subject: string;
  body: string | null;
  status: "unmatched" | "failed" | "parsed" | "skipped";
  error: string | null;
  receivedAt: string;
};

export type TemplateRow = {
  id: string;
  name: string;
  kind: "expense" | "income";
  senderPattern: string;
  subjectPattern: string | null;
  outcome: "transaction" | "declined";
  mustContain: string;
  rules: unknown;
  defaultDepoId: string | null;
  defaultCategoryName: string | null;
  autoApprove: boolean;
  matchCount: number;
  failCount: number;
};

type EditorState = { draft: TemplateDraft; sample: EmailSample; autoGenerate?: boolean } | null;

const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  kind: "expense",
  senderPattern: "",
  subjectPattern: null,
  outcome: "transaction",
  mustContain: "",
  rules: EMPTY_RULES,
  defaultDepoId: null,
  defaultCategoryName: null,
  autoApprove: false,
};

function draftFromSample(sample: EmailSample): TemplateDraft {
  const address = /<([^>]+)>/.exec(sample.fromAddress)?.[1] ?? sample.fromAddress.trim();
  return { ...EMPTY_DRAFT, senderPattern: address };
}

function ResultMessage({ result }: { result: ActionResult }) {
  if (result?.error) return <p className="text-sm text-red-600">{result.error}</p>;
  if (result?.ok) return <p className="text-sm text-[color:var(--status-good)]">{result.ok}</p>;
  return null;
}

export function EmailImportWorkspace({
  unread,
  templates,
  depos,
  categories,
  sources,
  cards,
  aiEnabled,
  currency,
}: {
  unread: UnreadEmail[];
  templates: TemplateRow[];
  depos: Option[];
  categories: Option[];
  sources: Option[];
  cards: CardOption[];
  aiEnabled: boolean;
  currency: string;
}) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [retryResult, setRetryResult] = useState<ActionResult>(undefined);
  const [busy, startBusy] = useTransition();
  const editorAnchor = useRef<HTMLDivElement>(null);

  function openEditor(state: NonNullable<EditorState>) {
    setEditor(state);
    requestAnimationFrame(() => editorAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function editTemplate(row: TemplateRow) {
    const rules = TemplateRulesSchema.safeParse(row.rules);
    openEditor({
      draft: {
        id: row.id,
        name: row.name,
        kind: row.kind,
        senderPattern: row.senderPattern,
        subjectPattern: row.subjectPattern,
        outcome: row.outcome,
        mustContain: row.mustContain,
        rules: rules.success ? rules.data : EMPTY_RULES,
        defaultDepoId: row.defaultDepoId,
        defaultCategoryName: row.defaultCategoryName,
        autoApprove: row.autoApprove,
      },
      sample: { fromAddress: "", subject: "", text: "" },
    });
  }

  function retry(ids: string[]) {
    setRetryResult(undefined);
    startBusy(async () => setRetryResult(await retryInboundEmails(ids)));
  }

  const retryable = unread.filter((e) => e.body);

  return (
    <>
      <div ref={editorAnchor} className="scroll-mt-4" />
      {editor && (
        <TemplateEditor
          key={editor.draft.id ?? "new"}
          initial={editor.draft}
          initialSample={editor.sample}
          autoGenerate={editor.autoGenerate}
          depos={depos}
          categories={categories}
          sources={sources}
          cards={cards}
          aiEnabled={aiEnabled}
          currency={currency}
          onClose={() => setEditor(null)}
        />
      )}

      <section className={`${sectionClass} p-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3">
          <div>
            <h2 className={sectionTitleClass}>Templates</h2>
          </div>
          <button
            type="button"
            onClick={() => openEditor({ draft: EMPTY_DRAFT, sample: { fromAddress: "", subject: "", text: "" } })}
            className={secondaryButtonClass}
          >
            New template
          </button>
        </div>
        {templates.length === 0 ? (
          <p className={`${hintClass} px-4 py-4`}>No templates yet.</p>
        ) : (
          <ul>
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className={`${hintClass} truncate`}>
                    {t.outcome === "declined" ? "Declined: card fee" : t.kind === "expense" ? "Money out" : "Money in"} · from{" "}
                    {t.senderPattern}
                    {t.subjectPattern ? ` · subject "${t.subjectPattern}"` : ""}
                    {t.mustContain.trim() ? ` · contains ${t.mustContain.split("\n").filter(Boolean).map((p) => `"${p}"`).join(" + ")}` : ""} · read{" "}
                    {t.matchCount}
                    {t.failCount > 0 ? `, failed ${t.failCount}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={t.autoApprove}
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.checked;
                        startBusy(() => setTemplateAutoApprove(t.id, next));
                      }}
                    />
                    Auto-add
                  </label>
                  <button type="button" className={linkButtonClass} onClick={() => editTemplate(t)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`${linkButtonClass} text-red-600`}
                    onClick={() => {
                      if (confirm(`Delete the "${t.name}" template?`)) startBusy(() => deleteTemplate(t.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unread.length > 0 && (
        <section className={`${sectionClass} p-0`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3">
            <div>
              <h2 className={sectionTitleClass}>Emails that couldn&rsquo;t be read</h2>
              <p className={hintClass}>Make a template, then retry.</p>
            </div>
            {retryable.length > 0 && (
              <button type="button" disabled={busy} onClick={() => retry(retryable.map((e) => e.id))} className={secondaryButtonClass}>
                {busy ? "Retrying..." : "Retry all"}
              </button>
            )}
          </div>
          {retryResult && (
            <div className="px-4 pt-3">
              <ResultMessage result={retryResult} />
            </div>
          )}
          <ul>
            {unread.map((email) => (
              <li key={email.id} className="flex flex-col gap-2 border-b border-black/5 dark:border-white/5 px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{email.subject || "(no subject)"}</p>
                  <p className={hintClass}>
                    {email.fromAddress || "Pasted"} · {new Date(email.receivedAt).toLocaleString()}
                  </p>
                </div>
                {email.error && <p className="text-xs text-red-600">{email.error}</p>}
                {email.body ? (
                  <details>
                    <summary className={`${hintClass} cursor-pointer`}>Show email</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/5 p-3 text-xs dark:bg-white/5">
                      {email.body}
                    </pre>
                  </details>
                ) : (
                  <p className={hintClass}>Email text was deleted after 30 days.</p>
                )}
                <div className="flex flex-wrap gap-4">
                  {email.body && (
                    <>
                      <button
                        type="button"
                        className={linkButtonClass}
                        onClick={() => {
                          const sample = { fromAddress: email.fromAddress, subject: email.subject, text: email.body! };
                          openEditor({ draft: draftFromSample(sample), sample, autoGenerate: true });
                        }}
                      >
                        Make template
                      </button>
                      <button type="button" disabled={busy} className={linkButtonClass} onClick={() => retry([email.id])}>
                        Retry
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    className={`${linkButtonClass} text-red-600`}
                    onClick={() => startBusy(() => deleteInboundEmail(email.id))}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
