"use client";

import { useActionState } from "react";
import { createExpense } from "@/lib/actions/expenses";

export function ExpenseForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createExpense, undefined);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <input
        type="date"
        name="date"
        required
        defaultValue={new Date().toISOString().slice(0, 10)}
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <input
        list="expense-categories"
        name="categoryName"
        placeholder="Category"
        required
        className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <datalist id="expense-categories">
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
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
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input type="checkbox" name="paid" defaultChecked value="true" />
        Paid
      </label>
      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add expense"}
      </button>
      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
