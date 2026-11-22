export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function splitCurrency(value: number, currency: string, fractionDigits = 2) {
  return {
    sign: value < 0 ? "-" : "",
    currency,
    number: Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }),
  };
}

export function formatCurrency(value: number, currency: string, fractionDigits = 2) {
  const parts = splitCurrency(value, currency, fractionDigits);
  return `${parts.sign}${parts.currency}${parts.number}`;
}

export function formatCompactCurrency(value: number, currency: string) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${currency}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${currency}${abs.toFixed(0)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function monthKeyOf(dateKey: string) {
  return dateKey.slice(0, 7);
}

// Stored dates are UTC midnight of the chosen day, so the first ten characters are the calendar date.
export function dateKeyOf(stored: string) {
  return stored.slice(0, 10);
}

export function dateFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(key: string) {
  return dateFromKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(key: string) {
  return dateFromKey(key).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}

// Income received on the last day of a month is usually meant for the next month (e.g. salary paid on the 31st).
export function appliedMonthFor(receivedKey: string) {
  const date = dateFromKey(receivedKey);
  const isLastDay = date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (isLastDay) date.setMonth(date.getMonth() + 1, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthsFromNowLabel(months: number | null) {
  if (months === null) return "-";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

export function parseAmount(raw: string) {
  const value = Number(raw.replace(/,/g, "").trim());
  return raw.trim() === "" || !Number.isFinite(value) ? null : value;
}
