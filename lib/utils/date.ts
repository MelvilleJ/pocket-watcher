export function parseLocalDate(dateStr: string): Date {
  // Expect a date string in YYYY-MM-DD format (from <input type="date">)
  const parts = dateStr.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(dateStr);
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}
