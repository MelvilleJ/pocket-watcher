"use client";

import { useActionState } from "react";
import { createDebtPayment } from "@/lib/actions/debts";

export function DebtPaymentForm({ debts }: { debts: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createDebtPayment, undefined);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <select
        name="debtId"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      >
        <option value="">Select debt</option>
        {debts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="date"
        required
        defaultValue={new Date().toISOString().slice(0, 10)}
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
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
        {pending ? "Recording..." : "Record payment"}
      </button>
      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
