"use client";

import { useEffect, useRef, useState } from "react";
import { BudgetFigure, budgetRowGrid } from "@/components/budget-section";

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
  kind: "income" | "expense" | "debt" | "goal" | "subscription";
}) {
  const [value, setValue] = useState(plannedAmount);
  const variance = actual - value;
  const isGood = kind === "income" ? variance >= 0 : variance <= 0;

  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function saveNow(amount: number) {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      await fetch("/api/budget/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, plannedAmount: amount }),
        signal: abortRef.current.signal,
      });
    } catch (e) {
      // best-effort autosave; ignore failures
    }
  }

  function scheduleSave(next: number) {
    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => saveNow(next), 5000);
  }

  useEffect(() => {
    const handler = () => {
      if (savingTimer.current) {
        clearTimeout(savingTimer.current);
        savingTimer.current = null;
      }
      saveNow(value);
    };
    window.addEventListener("budget-save-now", handler as EventListener);
    return () => window.removeEventListener("budget-save-now", handler as EventListener);
  }, [value]);

  const varianceTone =
    variance === 0
      ? "text-[color:var(--muted)]"
      : isGood
        ? "text-[color:var(--status-good)]"
        : "text-[color:var(--status-critical)]";

  return (
    <li className={`${budgetRowGrid} border-b border-black/5 py-2.5 last:border-b-0 dark:border-white/5`}>
      <span className="min-w-0 break-words">{label}</span>
      <span className="text-right">
        {disabled ? (
          <span className="tabular-nums">
            {currency}
            {value.toFixed(2)}
          </span>
        ) : (
          <input
            type="number"
            step="0.01"
            name="plannedAmount"
            aria-label={`Budgeted for ${label}`}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              setValue(next);
              scheduleSave(next);
            }}
            className="w-28 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right text-sm tabular-nums"
          />
        )}
      </span>
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
