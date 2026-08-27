"use client";

import { useActionState, useState } from "react";
import { createIncome } from "@/lib/actions/income";

function appliedMonthFor(receivedDate: string) {
  const date = new Date(`${receivedDate}T00:00:00`);
  const isLastDay = date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (isLastDay) date.setMonth(date.getMonth() + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function IncomeForm({ sources }: { sources: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const [receivedDate, setReceivedDate] = useState(today);
  const [appliedMonth, setAppliedMonth] = useState(() => appliedMonthFor(today));

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <input
        type="date"
        name="date"
        required
        value={receivedDate}
        onChange={(event) => {
          setReceivedDate(event.target.value);
          setAppliedMonth(appliedMonthFor(event.target.value));
        }}
        aria-label="Received on"
        title="Received on"
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="month"
        name="appliedMonth"
        required
        value={appliedMonth}
        onChange={(event) => setAppliedMonth(event.target.value)}
        aria-label="Apply to month"
        title="Apply to month"
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        list="income-sources"
        name="sourceName"
        placeholder="Source"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <datalist id="income-sources">
        {sources.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
      <input
        name="description"
        placeholder="Description"
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="number"
        step="0.01"
        name="amount"
        placeholder="Amount"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add income"}
      </button>
      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
