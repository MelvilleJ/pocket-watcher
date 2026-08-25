"use client";

import { useState } from "react";
import { updateBudgetLine } from "@/lib/actions/budgets";

export function BudgetLineRow({
  lineId,
  label,
  plannedAmount,
  actual,
  currency,
  disabled,
  kind,
}: {
  lineId: string;
  label: string;
  plannedAmount: number;
  actual: number;
  currency: string;
  disabled: boolean;
  kind: "income" | "expense" | "debt" | "subscription";
}) {
  const [value, setValue] = useState(plannedAmount);
  const variance = actual - value;
  const isGood = kind === "income" ? variance >= 0 : variance <= 0;

  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-right">
        {disabled ? (
          <span className="tabular-nums">
            {currency}
            {value.toFixed(2)}
          </span>
        ) : (
          <form action={updateBudgetLine} className="flex items-center justify-end gap-2">
            <input type="hidden" name="lineId" value={lineId} />
            <input
              type="number"
              step="0.01"
              name="plannedAmount"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-28 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right text-sm tabular-nums"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-2 py-1 text-xs font-medium text-white dark:text-zinc-900"
            >
              Save
            </button>
          </form>
        )}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {currency}
        {actual.toFixed(2)}
      </td>
      <td
        className={`px-4 py-2 text-right tabular-nums ${
          variance === 0
            ? "text-zinc-500"
            : isGood
              ? "text-[color:var(--status-good)]"
              : "text-[color:var(--status-critical)]"
        }`}
      >
        {variance >= 0 ? "+" : ""}
        {currency}
        {variance.toFixed(2)}
      </td>
    </tr>
  );
}
