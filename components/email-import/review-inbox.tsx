"use client";

import { useState, useTransition } from "react";
import { approveAllReady, approvePendingAsIs, dismissPending, type ActionResult } from "@/lib/actions/email-import";
import { PendingCard, type PendingItem } from "@/components/email-import/pending-card";
import { hintClass, secondaryButtonClass } from "@/components/email-import/ui";

type Option = { id: string; name: string };

function formatDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Tag({ tone, children }: { tone: "muted" | "warn"; children: React.ReactNode }) {
  const tones = {
    muted: "border-black/10 text-[color:var(--muted)] dark:border-white/10",
    warn: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>{children}</span>;
}

function InboxRow({
  item,
  depoName,
  currency,
  onEdit,
}: {
  item: PendingItem;
  depoName: string | null;
  currency: string;
  onEdit: () => void;
}) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amount = Number(item.amount);
  const ready = Boolean(item.categoryName);

  function approve() {
    setError(null);
    startBusy(async () => {
      const result = await approvePendingAsIs(item.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 border-b border-black/5 px-4 py-3 last:border-b-0 dark:border-white/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.description || item.emailSubject || "Transaction"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--muted)]">
          <span>{formatDay(item.date)}</span>
          {depoName && <span>· {depoName}</span>}
          {item.categoryName ? (
            <Tag tone="muted">
              {item.categoryName}
              {item.categorySource === "ai" && " · AI"}
            </Tag>
          ) : (
            <Tag tone="warn">Needs a category</Tag>
          )}
          {item.possibleDuplicate && <Tag tone="warn">Possible duplicate</Tag>}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <p
        className={`text-sm font-semibold tabular-nums ${item.kind === "income" ? "text-[color:var(--status-good)]" : ""}`}
      >
        {item.kind === "income" ? "+" : "−"}
        {currency}
        {amount.toFixed(2)}
      </p>
      <div className="flex items-center gap-1">
        {ready && (
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            aria-label={`Add ${item.description ?? "transaction"}`}
            title="Add"
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-[color:var(--status-good)] hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className={`h-9 rounded-full px-3 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 ${
            ready ? "text-[color:var(--muted)]" : "border border-black/10 dark:border-white/15"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => startBusy(() => dismissPending(item.id))}
          disabled={busy}
          aria-label={`Dismiss ${item.description ?? "transaction"}`}
          title="Dismiss"
          className="grid h-9 w-9 place-items-center rounded-full text-[color:var(--muted)] hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}

export function ReviewInbox({
  items,
  depos,
  categories,
  sources,
  currency,
  initialEditing,
}: {
  initialEditing?: string;
  items: PendingItem[];
  depos: Option[];
  categories: Option[];
  sources: Option[];
  currency: string;
}) {
  const [editing, setEditing] = useState<string | null>(initialEditing ?? null);
  const [bulk, startBulk] = useTransition();
  const [bulkResult, setBulkResult] = useState<ActionResult>(undefined);
  const readyCount = items.filter((i) => i.categoryName && !i.possibleDuplicate).length;

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">To review ({items.length})</h2>
          <p className={hintClass}>From your bank emails.</p>
        </div>
        {readyCount > 1 && (
          <button
            type="button"
            disabled={bulk}
            onClick={() => startBulk(async () => setBulkResult(await approveAllReady()))}
            className={secondaryButtonClass}
          >
            {bulk ? "Adding..." : `Add all ${readyCount} ready`}
          </button>
        )}
      </div>
      {bulkResult?.ok && <p className="px-4 pt-3 text-sm text-[color:var(--status-good)]">{bulkResult.ok}</p>}
      <ul>
        {items.map((item) =>
          editing === item.id ? (
            <PendingCard key={item.id} item={item} depos={depos} categories={categories} sources={sources} />
          ) : (
            <InboxRow
              key={item.id}
              item={item}
              depoName={depos.find((d) => d.id === item.depoId)?.name ?? null}
              currency={currency}
              onEdit={() => setEditing(item.id)}
            />
          )
        )}
      </ul>
    </section>
  );
}
