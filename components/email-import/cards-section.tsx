"use client";

import { useActionState, useState, useTransition, type CSSProperties } from "react";
import { deleteCard, saveCard } from "@/lib/actions/email-import";
import { DepoIcon } from "@/components/depo-icon";
import {
  hintClass,
  inputClass,
  linkButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
} from "@/components/email-import/ui";

export type CardRow = { id: string; last4: string; name: string; depoId: string | null; declineFee: string | null };

export type CardDepo = { id: string; name: string; color: string; icon: string };

const NEUTRAL_FACE = "#1e2433";

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

// Picks whichever of near-black or white reads better on the depo's color.
function inkFor(face: string) {
  const l = luminance(face);
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? "#10141f" : "#ffffff";
}

function CardChip() {
  return (
    <svg viewBox="0 0 40 30" className="h-7 w-9" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="29" rx="5" fill="#d8b45c" stroke="#a9852f" />
      <g fill="none" stroke="#a9852f" strokeWidth="1">
        <path d="M0.5 10.5h11M0.5 19.5h11M28.5 10.5h11M28.5 19.5h11" />
        <path d="M14.5 0.5v6M25.5 0.5v6M14.5 23.5v6M25.5 23.5v6" />
        <rect x="11.5" y="6.5" width="17" height="17" rx="3" />
      </g>
    </svg>
  );
}

function CardFace({
  card,
  depo,
  currency,
  selected,
  onSelect,
}: {
  card: CardRow;
  depo: CardDepo | undefined;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const face = depo?.color ?? NEUTRAL_FACE;
  const ink = inkFor(face);
  const fee = card.declineFee && Number(card.declineFee) > 0 ? Number(card.declineFee) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${card.name}, card ending ${card.last4}. Edit`}
      style={{ backgroundColor: face, color: ink } as CSSProperties}
      className={`relative flex aspect-[1.586] w-64 shrink-0 snap-start flex-col justify-between rounded-2xl p-4 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-72 ${
        selected ? "outline-2 outline-offset-2 outline-[color:var(--foreground)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 text-sm font-semibold leading-tight">{card.name}</span>
        {depo && <DepoIcon name={depo.icon} className="h-5 w-5 shrink-0 opacity-80" />}
      </div>

      <CardChip />

      <div className="grid gap-1">
        <span className="flex items-center gap-3 font-mono text-base">
          {[0, 1, 2].map((group) => (
            <span key={group} aria-hidden="true" className="tracking-[-0.05em] opacity-80">
              ••••
            </span>
          ))}
          <span className="tracking-[0.12em]">
            <span className="sr-only">ending </span>
            {card.last4}
          </span>
        </span>
        <div className="flex items-end justify-between gap-2 text-[11px] opacity-80">
          <span className="truncate">{depo?.name ?? "No depo"}</span>
          <span className="shrink-0">{fee ? `Decline fee ${currency}${fee.toFixed(2)}` : "No decline fee"}</span>
        </div>
      </div>
    </button>
  );
}

function CardEditor({
  card,
  depos,
  currency,
  onDone,
}: {
  card?: CardRow;
  depos: CardDepo[];
  currency: string;
  onDone: () => void;
}) {
  const [state, action, saving] = useActionState(async (prev: Awaited<ReturnType<typeof saveCard>>, formData: FormData) => {
    const result = await saveCard(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10 sm:grid-cols-[6rem_1fr_1fr_8rem]">
      {card && <input type="hidden" name="id" value={card.id} />}
      <label className="flex flex-col gap-1">
        <span className={hintClass}>Last 4</span>
        <input
          name="last4"
          defaultValue={card?.last4}
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          placeholder="1234"
          className={`${inputClass} font-mono`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={hintClass}>Name</span>
        <input name="name" defaultValue={card?.name} required placeholder="JMMB Visa debit" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={hintClass}>Depo</span>
        <select name="depoId" defaultValue={card?.depoId ?? ""} className={inputClass}>
          <option value="">None</option>
          {depos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={hintClass}>Decline fee ({currency})</span>
        <input
          name="declineFee"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={card?.declineFee ?? ""}
          placeholder="0.00"
          className={inputClass}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button type="submit" disabled={saving || deleting} className={primaryButtonClass}>
          {saving ? "Saving..." : card ? "Save card" : "Add card"}
        </button>
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          Cancel
        </button>
        {card && (
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => {
              if (confirm(`Remove the card ending ${card.last4}?`)) startDelete(async () => {
                await deleteCard(card.id);
                onDone();
              });
            }}
            className={`${linkButtonClass} text-red-600`}
          >
            Remove
          </button>
        )}
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

export function CardsSection({ cards, depos, currency }: { cards: CardRow[]; depos: CardDepo[]; currency: string }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const editingCard = cards.find((c) => c.id === editing);

  return (
    <section className={`${sectionClass} grid gap-4`}>
      <div>
        <h2 className={`${sectionTitleClass} mb-1`}>Cards</h2>
        <p className={hintClass}>New cards appear here automatically. Tap one to edit.</p>
      </div>

      <div
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pt-1 pb-3"
        role="list"
        aria-label="Your cards"
      >
        {cards.map((card) => (
          <div key={card.id} role="listitem" className="snap-start">
            <CardFace
              card={card}
              depo={depos.find((d) => d.id === card.depoId)}
              currency={currency}
              selected={editing === card.id}
              onSelect={() => setEditing(editing === card.id ? null : card.id)}
            />
          </div>
        ))}
        <div role="listitem" className="snap-start">
          <button
            type="button"
            onClick={() => setEditing(editing === "new" ? null : "new")}
            aria-pressed={editing === "new"}
            className="flex aspect-[1.586] w-64 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/15 text-sm font-medium text-[color:var(--muted)] hover:border-black/30 dark:border-white/15 dark:hover:border-white/30 sm:w-72"
          >
            <span aria-hidden="true" className="text-2xl leading-none">+</span>
            Add card
          </button>
        </div>
      </div>

      {editing && (
        <CardEditor
          key={editing}
          card={editingCard}
          depos={depos}
          currency={currency}
          onDone={() => setEditing(null)}
        />
      )}
    </section>
  );
}
