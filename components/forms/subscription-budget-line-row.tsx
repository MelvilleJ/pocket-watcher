"use client";

import { useState } from "react";

export function SubscriptionBudgetLineRow({
  lineId,
  label,
  monthlyCost,
  included,
  actual,
  currency,
  disabled,
}: {
  lineId: string;
  label: string;
  monthlyCost: number;
  included: boolean;
  actual: number;
  currency: string;
  disabled: boolean;
}) {
  const [checked, setChecked] = useState(included);
  const [saving, setSaving] = useState(false);
  const variance = actual - (checked ? monthlyCost : 0);

  async function onToggle(next: boolean) {
    setChecked(next);
    setSaving(true);
    try {
      await fetch("/api/budget/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, plannedAmount: next ? monthlyCost.toFixed(2) : "0" }),
      });
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      <td className="px-4 py-2">
        {label}
        <span className="ml-2 text-xs text-zinc-500">
          ({currency}
          {monthlyCost.toFixed(2)}/mo)
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        <label className="inline-flex items-center gap-2 text-sm">
          <span className="text-zinc-500">{checked ? "Paying" : "Skipping"}</span>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled || saving}
            onChange={(e) => onToggle(e.target.checked)}
          />
        </label>
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {currency}
        {actual.toFixed(2)}
      </td>
      <td
        className={`px-4 py-2 text-right tabular-nums ${
          variance === 0
            ? "text-zinc-500"
            : variance < 0
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
