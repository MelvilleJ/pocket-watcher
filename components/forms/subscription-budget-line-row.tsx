"use client";

import { useState } from "react";
import { BudgetFigure, budgetRowGrid } from "@/components/budget-section";

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

  const varianceTone =
    variance === 0
      ? "text-[color:var(--muted)]"
      : variance < 0
        ? "text-[color:var(--status-good)]"
        : "text-[color:var(--status-critical)]";

  return (
    <li className={`${budgetRowGrid} border-b border-black/5 py-2.5 last:border-b-0 dark:border-white/5`}>
      <span className="min-w-0 break-words">
        {label}
        <span className="ml-2 text-xs text-[color:var(--muted)]">
          ({currency}
          {monthlyCost.toFixed(2)}/mo)
        </span>
      </span>
      <label className="inline-flex items-center justify-end gap-2 text-sm">
        <span className="text-[color:var(--muted)]">{checked ? "Paying" : "Skipping"}</span>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || saving}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </label>
      <BudgetFigure label="Actual" className="@lg:text-right">
        {currency}
        {actual.toFixed(2)}
      </BudgetFigure>
      <BudgetFigure label="Variance" className={`text-right ${varianceTone}`}>
        {variance >= 0 ? "+" : ""}
        {currency}
        {variance.toFixed(2)}
      </BudgetFigure>
    </li>
  );
}
