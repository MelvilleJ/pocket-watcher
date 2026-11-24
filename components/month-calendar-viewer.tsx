"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonthCompareChart } from "@/components/charts/month-compare-chart";
import { YearPicker } from "@/components/year-picker";
import type { CalendarMonth } from "@/lib/queries/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CARD_WIDTH = 248; // w-[15.5rem]
const CARD_GAP = 12; // gap-3
const STRIP_PADDING = 16; // p-4

function formatCurrency(value: number, currency: string, compact = false) {
  return `${currency}${value.toLocaleString(undefined, {
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(value) >= 1000 ? "compact" : "standard",
  })}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function firstWeekday(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).getDay();
}

const SUMMARY_ROWS: Array<[string, keyof CalendarMonth]> = [
  ["Income", "income"],
  ["Expenses", "expenses"],
  ["Subscriptions", "subscriptions"],
  ["Debt payments", "debtPayments"],
  ["Goal contributions", "goalPayments"],
  ["Cash committed", "totalOut"],
  ["Net cash", "net"],
];

function initialMonthIndex(year: number, months: CalendarMonth[]): number | null {
  const now = new Date();
  if (year === now.getFullYear()) return now.getMonth();
  const active = months.filter((month) => month.income + month.totalOut > 0);
  return active.length > 0 ? active[active.length - 1].monthIndex : null;
}

export function MonthCalendarViewer({
  year,
  years,
  currency,
  months,
}: {
  year: number;
  years: number[];
  currency: string;
  months: CalendarMonth[];
}) {
  const initial = useMemo(() => initialMonthIndex(year, months), [year, months]);
  const [comparison, setComparison] = useState<number[]>(() => (initial === null ? [] : [initial]));
  const scrollerRef = useRef<HTMLDivElement>(null);
  const comparedMonths = comparison
    .map((monthIndex) => months.find((month) => month.monthIndex === monthIndex))
    .filter((month): month is CalendarMonth => Boolean(month));

  // On load, make the pre-selected month visible in the strip.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || initial === null) return;
    const right = STRIP_PADDING + initial * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH;
    if (right > el.clientWidth) el.scrollLeft = right - el.clientWidth;
  }, [initial]);

  function toggleComparison(monthIndex: number) {
    setComparison((current) => {
      if (current.includes(monthIndex)) return current.filter((value) => value !== monthIndex);
      return [...current.slice(-1), monthIndex];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[color:var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Month by month</h2>
          <YearPicker year={year} years={years} />
        </div>
        <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain">
          <div className="flex w-max gap-3 p-4">
            {months.map((month) => {
              const isSelected = comparison.includes(month.monthIndex);
              const days = new Map(month.days.map((day) => [day.day, day]));
              const blanks = Array.from({ length: firstWeekday(year, month.monthIndex) });
              const dayNumbers = Array.from({ length: daysInMonth(year, month.monthIndex) }, (_, index) => index + 1);
              const dayRows = Math.ceil((blanks.length + dayNumbers.length) / 7);
              const padRows = 6 - dayRows;

              return (
                <button
                  key={month.monthIndex}
                  type="button"
                  onClick={() => toggleComparison(month.monthIndex)}
                  aria-pressed={isSelected}
                  className={`w-[15.5rem] shrink-0 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary-deep)] ${
                    isSelected
                      ? "border-[color:var(--series-1)] bg-[color:var(--surface-inset)] ring-2 ring-[color:var(--series-1)]/25"
                      : "border-[color:var(--border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-inset)]"
                  }`}
                >
                  <h3 className="font-semibold text-[color:var(--foreground)]">{MONTH_NAMES[month.monthIndex]}</h3>
                  <p
                    className={`mt-0.5 text-xs tabular-nums ${
                      month.net >= 0 ? "text-[color:var(--status-good)]" : "text-[color:var(--status-critical)]"
                    }`}
                  >
                    Net {formatCurrency(month.net, currency, true)}
                  </p>

                  <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-[color:var(--muted)]">
                    {WEEKDAYS.map((day) => (
                      <span key={day} className="flex h-5 items-center justify-center">
                        {day.slice(0, 1)}
                      </span>
                    ))}
                    {blanks.map((_, index) => (
                      <span key={`blank-${index}`} className="h-5" />
                    ))}
                    {dayNumbers.map((day) => {
                      const value = days.get(day);
                      const incoming = value?.income ?? 0;
                      const outgoing =
                        (value?.expenses ?? 0) + (value?.subscriptions ?? 0) + (value?.debtPayments ?? 0) + (value?.goalPayments ?? 0);
                      return (
                        <span
                          key={day}
                          title={
                            value ? `${day}: +${formatCurrency(incoming, currency)} · -${formatCurrency(outgoing, currency)}` : undefined
                          }
                          className={`flex h-5 items-center justify-center rounded ${
                            incoming > 0 && outgoing > 0
                              ? "bg-[color:var(--status-warning)]/25 text-zinc-900 dark:text-zinc-50"
                              : incoming > 0
                                ? "bg-[color:var(--status-good)]/20 text-[color:var(--status-good)]"
                                : outgoing > 0
                                  ? "bg-[color:var(--status-critical)]/15 text-[color:var(--status-critical)]"
                                  : ""
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                    {Array.from({ length: padRows * 7 }, (_, index) => (
                      <span key={`pad-${index}`} className="h-5" />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
            {comparedMonths.length > 1 ? "Month comparison" : "Month summary"}
          </h2>
          {comparedMonths.length > 0 && (
            <button
              type="button"
              onClick={() => setComparison([])}
              className="text-xs font-medium text-[color:var(--muted)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary-deep)]"
            >
              Clear
            </button>
          )}
        </div>
        {comparedMonths.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[color:var(--muted)]">Select a month above to see its summary.</p>
        ) : (
          <>
            <div className="px-4 pt-4">
              <MonthCompareChart months={comparedMonths} currency={currency} year={year} />
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--muted)]">
                  <th className="px-4 py-3 font-medium">Measure</th>
                  {comparedMonths.map((month) => (
                    <th key={month.monthIndex} className="px-4 py-3 text-right font-medium">
                      {MONTH_NAMES[month.monthIndex]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUMMARY_ROWS.map(([label, key]) => (
                  <tr key={key} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2 text-[color:var(--muted)]">{label}</td>
                    {comparedMonths.map((month) => {
                      const value = month[key] as number;
                      return (
                        <td
                          key={month.monthIndex}
                          className={`px-4 py-2 text-right tabular-nums ${
                            key === "net"
                              ? value >= 0
                                ? "text-[color:var(--status-good)]"
                                : "text-[color:var(--status-critical)]"
                              : ""
                          }`}
                        >
                          {formatCurrency(value, currency)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
