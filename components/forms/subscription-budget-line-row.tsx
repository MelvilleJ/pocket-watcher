"use client";

import { useState, useTransition } from "react";
import { updateBudgetLine } from "@/lib/actions/budgets";

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
  const [pending, startTransition] = useTransition();
  const variance = actual - (checked ? monthlyCost : 0);

  function onToggle(next: boolean) {
    setChecked(next);
    const formData = new FormData();
    formData.set("lineId", lineId);
    formData.set("plannedAmount", next ? monthlyCost.toFixed(2) : "0");
    startTransition(() => {
      updateBudgetLine(formData);
    });
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
            disabled={disabled || pending}
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
