"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";

export function SettingsForm({
  name,
  currency,
  savingsRate,
}: {
  name: string;
  currency: string;
  savingsRate: number;
}) {
  const [state, action, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={action} className="grid max-w-md gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="currency" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Currency symbol
        </label>
        <input
          id="currency"
          name="currency"
          defaultValue={currency}
          required
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="savingsRate" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Savings rate (share of net income saved, e.g. 0.2 = 20%)
        </label>
        <input
          id="savingsRate"
          name="savingsRate"
          type="number"
          step="0.01"
          min="0"
          max="1"
          defaultValue={savingsRate}
          required
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        type="submit"
        className="mt-2 w-fit rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
