"use client";

import { useActionState } from "react";
import { createSubscription } from "@/lib/actions/subscriptions";
import { BILLING_CYCLE_LABELS } from "@/lib/finance/subscriptions";
import { CreatableSelect } from "@/components/forms/creatable-select";

export function SubscriptionForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createSubscription, undefined);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <input
        name="name"
        placeholder="Subscription name"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <CreatableSelect
        name="categoryName"
        options={categories.map((c) => ({ value: c.name }))}
        placeholder="Category"
        newPlaceholder="New category"
        required
        className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <select
        name="billingCycle"
        defaultValue="monthly"
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      >
        {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        name="billedAmount"
        placeholder="Billed amount"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="date"
        name="startDate"
        required
        defaultValue={new Date().toISOString().slice(0, 10)}
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input type="hidden" name="status" value="active" />
      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add subscription"}
      </button>
      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
