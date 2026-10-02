"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function YearPicker({ year, years }: { year: number; years: number[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const hrefFor = (value: number) => `${pathname}?year=${value}`;
  const hasPrevious = years.includes(year - 1);
  const hasNext = years.includes(year + 1);

  return (
    <div className="year-picker" role="group" aria-label="Choose year">
      <StepLink href={hasPrevious ? hrefFor(year - 1) : null} label="Previous year" direction="previous" />
      <select value={year} onChange={(event) => router.push(hrefFor(Number(event.target.value)))} aria-label="Year">
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <StepLink href={hasNext ? hrefFor(year + 1) : null} label="Next year" direction="next" />
    </div>
  );
}

export function StepLink({
  href,
  label,
  direction,
}: {
  href: string | null;
  label: string;
  direction: "previous" | "next";
}) {
  const icon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );

  if (!href) {
    return (
      <span className="period-step is-disabled" aria-label={label} aria-disabled="true">
        {icon}
      </span>
    );
  }

  return (
    <Link href={href} className="period-step" aria-label={label}>
      {icon}
    </Link>
  );
}
