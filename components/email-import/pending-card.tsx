"use client";

import { useActionState, useState, useTransition } from "react";
import { approvePending, dismissPending } from "@/lib/actions/email-import";
import { hintClass, inputClass, labelClass, linkButtonClass, primaryButtonClass } from "@/components/email-import/ui";

export type PendingItem = {
  id: string;
  kind: "expense" | "income";
  date: string;
  amount: string;
  description: string | null;
  originalDescription: string | null;
  categoryName: string | null;
  categorySource: string | null;
  depoId: string | null;
  parseMethod: "template" | "ai";
  possibleDuplicate: boolean;
  emailSubject: string;
  emailFrom: string;
  templateName: string | null;
};

type Option = { id: string; name: string };

export function PendingCard({
  item,
  depos,
  categories,
  sources,
}: {
  item: PendingItem;
  depos: Option[];
  categories: Option[];
  sources: Option[];
}) {
  const [state, action, pending] = useActionState(approvePending.bind(null, item.id), undefined);
  const [dismissing, startDismiss] = useTransition();
  const [kind, setKind] = useState(item.kind);
  const listId = `pending-${item.id}-names`;
  const names = kind === "expense" ? categories : sources;

  return (
    <li className="flex flex-col gap-3 border-b border-black/5 dark:border-white/5 px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
        <span className="truncate">{item.emailSubject || item.emailFrom || "Pasted email"}</span>
        <span className="rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5">
          {item.parseMethod === "ai" ? "Read by AI" : `Template: ${item.templateName ?? "deleted"}`}
        </span>
        {item.possibleDuplicate && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Possible duplicate
          </span>
        )}
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Type</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as PendingItem["kind"])} className={inputClass}>
            <option value="expense">Money out</option>
            <option value="income">Money in</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Date</span>
          <input name="date" type="date" defaultValue={item.date} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Amount</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            defaultValue={item.amount}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Description</span>
          <input name="description" defaultValue={item.description ?? ""} className={inputClass} />
          {item.originalDescription && <span className={hintClass}>Bank text: {item.originalDescription}</span>}
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>{kind === "expense" ? "Category" : "Source"}</span>
          <input
            name="categoryName"
            list={listId}
            defaultValue={item.categoryName ?? ""}
            placeholder={kind === "expense" ? "e.g. Groceries" : "e.g. Salary"}
            required
            className={inputClass}
          />
          {item.categoryName && item.categorySource && (
            <span className={hintClass}>
              {item.categorySource === "ai"
                ? "AI suggestion"
                : item.categorySource === "template"
                  ? "From template"
                  : "From your history"}
            </span>
          )}
          <datalist id={listId}>
            {names.map((n) => (
              <option key={n.id} value={n.name} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Depo</span>
          <select name="depoId" defaultValue={item.depoId ?? ""} className={inputClass}>
            <option value="">No depo</option>
            {depos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={pending || dismissing} className={primaryButtonClass}>
            {pending ? "Adding..." : "Add transaction"}
          </button>
          <button
            type="button"
            disabled={pending || dismissing}
            onClick={() => startDismiss(() => dismissPending(item.id))}
            className={`${linkButtonClass} text-[color:var(--muted)]`}
          >
            Dismiss
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {kind === "income" && <p className={hintClass}>Applied to the month of the date above.</p>}
        </div>
      </form>
    </li>
  );
}
