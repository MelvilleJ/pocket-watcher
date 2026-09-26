"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { MotionButton } from "@/components/motion-ui";
import type { CalendarMonth } from "@/lib/queries/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export function MonthCalendarViewer({
  year,
  currency,
  months,
}: {
  year: number;
  currency: string;
  months: CalendarMonth[];
}) {
  const [comparison, setComparison] = useState<number[]>([]);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const comparedMonths = comparison
    .map((monthIndex) => months.find((month) => month.monthIndex === monthIndex))
    .filter((month): month is CalendarMonth => Boolean(month));

  function toggleComparison(monthIndex: number) {
    setComparison((current) => {
      if (current.includes(monthIndex)) return current.filter((value) => value !== monthIndex);
      return [...current.slice(-1), monthIndex];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Hover or focus a month to expand it. Select up to two months to compare their cash activity.
      </p>

      {comparedMonths.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Month comparison</h2>
            <MotionButton
              type="button"
              onClick={() => setComparison([])}
              className="text-xs font-medium text-zinc-500 hover:underline"
            >
              Clear
            </MotionButton>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Measure</th>
                {comparedMonths.map((month) => (
                  <th key={month.monthIndex} className="px-4 py-3 text-right font-medium">
                    {MONTH_NAMES[month.monthIndex]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Income", "income"],
                ["Expenses", "expenses"],
                ["Subscriptions", "subscriptions"],
                ["Debt payments", "debtPayments"],
                ["Goal contributions", "goalPayments"],
                ["Cash committed", "totalOut"],
                ["Net cash", "net"],
              ].map(([label, key]) => (
                <tr key={key} className="border-t border-black/5 dark:border-white/5">
                  <td className="px-4 py-2 text-zinc-500">{label}</td>
                  {comparedMonths.map((month) => (
                    <td key={month.monthIndex} className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(month[key as keyof CalendarMonth] as number, currency)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="grid auto-rows-[11rem] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => {
          const isSelected = comparison.includes(month.monthIndex);
          const isExpanded = expandedMonth === month.monthIndex;
          const days = new Map(month.days.map((day) => [day.day, day]));
          const blanks = Array.from({ length: firstWeekday(year, month.monthIndex) });
          const dayNumbers = Array.from({ length: daysInMonth(year, month.monthIndex) }, (_, index) => index + 1);

          return (
            <motion.button
              layout={!reduceMotion}
              key={month.monthIndex}
              type="button"
              onClick={() => toggleComparison(month.monthIndex)}
              onHoverStart={() => setExpandedMonth(month.monthIndex)}
              onHoverEnd={() => setExpandedMonth(null)}
              onFocus={() => setExpandedMonth(month.monthIndex)}
              onBlur={() => setExpandedMonth(null)}
              aria-pressed={isSelected}
              className={`group relative overflow-hidden rounded-xl border bg-white p-4 text-left shadow-sm dark:bg-zinc-950 ${isExpanded ? "z-10 row-span-2" : "row-span-1"} ${
                isSelected
                  ? "border-[color:var(--series-1)] ring-2 ring-[color:var(--series-1)]/25"
                  : "border-black/10 dark:border-white/10"
              }`}
              whileHover={reduceMotion ? undefined : { y: -3, boxShadow: "0 20px 44px rgba(43, 50, 91, 0.13)" }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ layout: { type: "spring", stiffness: 340, damping: 32 }, duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{MONTH_NAMES[month.monthIndex]}</h2>
                  <p className={`mt-0.5 text-xs tabular-nums ${month.net >= 0 ? "text-[color:var(--status-good)]" : "text-[color:var(--status-critical)]"}`}>
                    Net {formatCurrency(month.net, currency, true)}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {isSelected ? "Selected" : "Compare"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500">
                {WEEKDAYS.map((day) => <span key={day}>{day.slice(0, 1)}</span>)}
                {blanks.map((_, index) => <span key={`blank-${index}`} />)}
                {dayNumbers.map((day) => {
                  const value = days.get(day);
                  const incoming = value?.income ?? 0;
                  const outgoing = (value?.expenses ?? 0) + (value?.debtPayments ?? 0) + (value?.goalPayments ?? 0);
                  return (
                    <span
                      key={day}
                      title={value ? `${day}: +${formatCurrency(incoming, currency)} · -${formatCurrency(outgoing, currency)}` : undefined}
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
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.dl
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: 5 }}
                    transition={{ duration: 0.18 }}
                    className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
                  >
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Income</dt><dd className="tabular-nums">{formatCurrency(month.income, currency)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Expenses</dt><dd className="tabular-nums">{formatCurrency(month.expenses, currency)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Subscriptions</dt><dd className="tabular-nums">{formatCurrency(month.subscriptions, currency)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Debt</dt><dd className="tabular-nums">{formatCurrency(month.debtPayments, currency)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Goals</dt><dd className="tabular-nums">{formatCurrency(month.goalPayments, currency)}</dd></div>
                    <div className="flex justify-between gap-2 font-medium"><dt>Committed</dt><dd className="tabular-nums">{formatCurrency(month.totalOut, currency)}</dd></div>
                  </motion.dl>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">Green days include income, red days include cash outflows, and amber days include both.</p>
    </div>
  );
}
