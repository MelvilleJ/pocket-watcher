"use client";

import { useActionState } from "react";
import { createDebt } from "@/lib/actions/debts";

export function DebtForm() {
  const [state, action, pending] = useActionState(createDebt, undefined);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <input
        name="name"
        placeholder="Debt name"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        name="lenderType"
        placeholder="Lender / type"
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="number"
        step="0.01"
        name="originalAmount"
        placeholder="Original amount"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="number"
        step="0.0001"
        name="interestRate"
        placeholder="Interest rate (0.18 = 18%)"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="number"
        step="0.01"
        name="minMonthlyPayment"
        placeholder="Min. monthly payment"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add debt"}
      </button>
      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
