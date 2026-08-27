"use client";

import { useEffect, useRef, useState } from "react";

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
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              step="0.01"
              name="plannedAmount"
              value={value}
              onChange={(e) => {
                const next = Number(e.target.value);
                setValue(next);
                scheduleSave(next);
              }}
              className="w-28 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-right text-sm tabular-nums"
            />
          </div>
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
