"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MotionButton } from "@/components/motion-ui";

const STORAGE_KEY = "pocket-watcher-dashboard-date";
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDefaultMonth() {
  return new Date().getMonth();
}

function getDefaultYear() {
  return new Date().getFullYear();
}

function readStoredDate() {
  if (typeof window === "undefined") {
    return { month: getDefaultMonth(), year: getDefaultYear() };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { month: getDefaultMonth(), year: getDefaultYear() };
    }

    const parsed = JSON.parse(raw) as { month?: number; year?: number };
    const month = Number(parsed.month);
    const year = Number(parsed.year);
    return {
      month: Number.isFinite(month) ? Math.min(11, Math.max(0, month)) : getDefaultMonth(),
      year: Number.isFinite(year) ? year : getDefaultYear(),
    };
  } catch {
    return { month: getDefaultMonth(), year: getDefaultYear() };
  }
}

function setStoredDate(date: { month: number; year: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(date));
  window.dispatchEvent(new Event("dashboard-date-changed"));
}

function getCurrentMonthString(searchParams: URLSearchParams) {
  const stored = readStoredDate();
  const value = searchParams.get("month");
  if (value === null || Number.isNaN(Number(value))) return String(stored.month);
  return String(Math.min(11, Math.max(0, Number(value))));
}

function getCurrentYearString(searchParams: URLSearchParams) {
  const stored = readStoredDate();
  const value = searchParams.get("year");
  if (value === null || Number.isNaN(Number(value))) return String(stored.year);
  return String(Number(value));
}

export function DashboardDatePicker() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCalendarPage = pathname === "/dashboard/calendar" || pathname.startsWith("/dashboard/calendar/");

  const currentMonth = getCurrentMonthString(new URLSearchParams(searchParams.toString()));
  const currentYear = getCurrentYearString(new URLSearchParams(searchParams.toString()));

  const updateDate = (month: number, year: number) => {
    const normalizedMonth = Math.min(11, Math.max(0, month));
    const normalizedYear = Number.isFinite(year) ? year : getDefaultYear();
    const nextDate = { month: normalizedMonth, year: normalizedYear };
    setStoredDate(nextDate);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("year", String(normalizedYear));

    if (!isCalendarPage) {
      nextParams.set("month", String(normalizedMonth));
    } else {
      nextParams.delete("month");
    }

    router.push(nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateDate(Number(currentMonth), Number(currentYear));
  };

  return (
    <form onSubmit={handleSubmit} className="dashboard-date-form grid gap-2 text-sm">
      {!isCalendarPage && (
        <select
          value={currentMonth}
          onChange={(event) => updateDate(Number(event.target.value), Number(currentYear))}
          className="min-w-0 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-zinc-700 dark:border-white/15 dark:text-zinc-200"
          aria-label="Select month"
        >
          {MONTH_NAMES.map((month, index) => (
            <option key={month} value={index}>
              {month}
            </option>
          ))}
        </select>
      )}

      <input
        type="number"
        value={currentYear}
        onChange={(event) => updateDate(Number(currentMonth), Number(event.target.value))}
        className="w-full min-w-0 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-zinc-700 dark:border-white/15 dark:text-zinc-200"
        aria-label="Select year"
      />

      <MotionButton
        type="submit"
        className="col-span-2 rounded-md bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        View
      </MotionButton>
    </form>
  );
}
