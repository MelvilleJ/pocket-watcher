"use client";

import { startTransition, useActionState, useState } from "react";
import { createTransaction } from "@/lib/actions/transactions";
import { DepoBadge } from "@/components/depo-icon";
import { CreatableSelect } from "@/components/forms/creatable-select";

type DepoOption = { id: string; name: string; color: string; icon: string };
type Mode = "expense" | "income" | "transfer";

const MODES: { value: Mode; label: string }[] = [
  { value: "expense", label: "Money out" },
  { value: "income", label: "Money in" },
  { value: "transfer", label: "Transfer" },
];

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Income received on the last day of a month is usually meant for the next month (e.g. salary paid on the 31st).
function appliedMonthFor(receivedDate: string) {
  const date = new Date(`${receivedDate}T00:00:00`);
  const isLastDay = date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (isLastDay) date.setMonth(date.getMonth() + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function DepoSelect({
  name,
  label,
  depos,
  value,
  onChange,
  allowNone,
}: {
  name: string;
  label: string;
  depos: DepoOption[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
}) {
  const selected = depos.find((d) => d.id === value);
  return (
    <label className="txn-field">
      <span className="txn-label">{label}</span>
      <span className="txn-depo-select">
        {selected && <DepoBadge icon={selected.icon} color={selected.color} size="sm" />}
        <select name={name} value={value} onChange={(e) => onChange(e.target.value)} required={!allowNone}>
          {allowNone && <option value="">No depo</option>}
          {depos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function TransactionForm({
  depos,
  categories,
  sources,
  defaultDepoId,
}: {
  depos: DepoOption[];
  categories: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  defaultDepoId?: string;
}) {
  const [entryKey, setEntryKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof createTransaction>>, formData: FormData) => {
      const result = await createTransaction(prev, formData);
      if (!result?.error) {
        setEntryKey((k) => k + 1);
        setAmount("");
        setFee("");
      }
      return result;
    },
    undefined
  );
  const [mode, setMode] = useState<Mode>("expense");
  const [date, setDate] = useState(todayLocal);
  const [appliedMonth, setAppliedMonth] = useState(() => appliedMonthFor(todayLocal()));
  const [depoId, setDepoId] = useState<string | null>(defaultDepoId ?? null);
  const [toDepoId, setToDepoId] = useState<string | null>(null);

  const canTransfer = depos.length >= 2;
  const isDepo = (id: string | null) => depos.some((d) => d.id === id);
  const firstDepoId = depos[0]?.id ?? "";
  const singleId = depoId === null ? firstDepoId : isDepo(depoId) ? depoId : "";
  const fromId = isDepo(depoId) ? (depoId as string) : firstDepoId;
  const toId =
    isDepo(toDepoId) && toDepoId !== fromId ? (toDepoId as string) : (depos.find((d) => d.id !== fromId)?.id ?? "");

  return (
    // Submitting manually avoids React's automatic form reset, which would desync the controlled depo selects.
    <form
      className="txn-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <input type="hidden" name="type" value={mode} />

      <div className="txn-modes" role="radiogroup" aria-label="Transaction type">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            className={`txn-mode txn-mode-${m.value} ${mode === m.value ? "is-active" : ""}`}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "transfer" && !canTransfer ? (
        <p className="text-sm text-[color:var(--muted)]">Add at least two depos to move money between them.</p>
      ) : (
        <div className="txn-grid">
          <label className="txn-field txn-amount">
            <span className="txn-label">{mode === "transfer" ? "Amount sent" : "Amount"}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              placeholder="0.00"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          {mode === "transfer" && (
            <label className="txn-field">
              <span className="txn-label">Fee / tax</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="fee"
                placeholder="0.00"
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </label>
          )}

          {mode === "transfer" ? (
            <>
              <DepoSelect name="fromDepoId" label="From" depos={depos} value={fromId} onChange={setDepoId} />
              <DepoSelect name="toDepoId" label="To" depos={depos} value={toId} onChange={setToDepoId} />
            </>
          ) : (
            <>
              <DepoSelect
                name="depoId"
                label={mode === "income" ? "Into depo" : "Out of depo"}
                depos={depos}
                value={singleId}
                onChange={setDepoId}
                allowNone
              />
              {mode === "income" ? (
                <label className="txn-field">
                  <span className="txn-label">Source</span>
                  <CreatableSelect
                    key="sourceName"
                    name="sourceName"
                    options={sources.map((s) => ({ value: s.name }))}
                    placeholder="Choose source"
                    newPlaceholder="New source"
                    required
                  />
                </label>
              ) : (
                <label className="txn-field">
                  <span className="txn-label">Category</span>
                  <CreatableSelect
                    key="categoryName"
                    name="categoryName"
                    options={categories.map((c) => ({ value: c.name }))}
                    placeholder="Choose category"
                    newPlaceholder="New category"
                    required
                  />
                </label>
              )}
            </>
          )}

          <label className="txn-field">
            <span className="txn-label">{mode === "income" ? "Received" : "Date"}</span>
            <input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setAppliedMonth(appliedMonthFor(e.target.value));
              }}
            />
          </label>

          {mode === "income" && (
            <label className="txn-field">
              <span className="txn-label">Applies to</span>
              <input
                type="month"
                name="appliedMonth"
                required
                value={appliedMonth}
                onChange={(e) => setAppliedMonth(e.target.value)}
              />
            </label>
          )}

          <label className="txn-field txn-description">
            <span className="txn-label">Description</span>
            <input key={entryKey} name="description" placeholder="Optional note" />
          </label>

          {mode === "expense" && (
            <label className="txn-paid">
              <input type="checkbox" name="paid" defaultChecked value="true" />
              Paid
            </label>
          )}

          {mode === "transfer" && Number(fee) > 0 && (
            <p className="txn-fee-note">
              {depos.find((d) => d.id === fromId)?.name} pays{" "}
              <strong>{(Number(amount || 0) + Number(fee)).toFixed(2)}</strong> ·{" "}
              {depos.find((d) => d.id === toId)?.name} receives <strong>{Number(amount || 0).toFixed(2)}</strong>
            </p>
          )}

          <button disabled={pending} type="submit" className={`txn-submit txn-submit-${mode}`}>
            {pending ? "Saving…" : mode === "income" ? "Log income" : mode === "expense" ? "Log expense" : "Move money"}
          </button>
        </div>
      )}

      {state?.error && <p className="text-sm text-[color:var(--status-critical)]">{state.error}</p>}
    </form>
  );
}
