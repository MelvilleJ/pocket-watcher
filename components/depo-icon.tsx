import type { ReactNode } from "react";
import type { DepoIconName } from "@/lib/depos";

const PATHS: Record<DepoIconName, ReactNode> = {
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v.01M18 14.5v.01" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-5 9 5" />
      <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8" />
      <path d="M3 20h18" />
    </>
  ),
  "credit-union": (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M10.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h14a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 19.5 7H5.5A2.5 2.5 0 0 1 3 6.5" />
      <path d="M16.5 13.5h.01" />
    </>
  ),
  piggy: (
    <>
      <path d="M19 10.5c1 .4 2 1 2 2.5M5 11a6.5 5.5 0 0 1 12.6-1.8c.9.6 1.4 1.4 1.4 2.3v2.5l-2 1V19h-3v-1.5h-4V19H7v-2.8A5.4 5.4 0 0 1 5 11Z" />
      <path d="M10 7.5h3M15 11.5h.01" />
    </>
  ),
  safe: (
    <>
      <rect x="3" y="3.5" width="18" height="16" rx="2" />
      <circle cx="12" cy="11.5" r="3.5" />
      <path d="M12 8v1M12 14v1M7 21v-1.5M17 21v-1.5" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5" />
      <ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
      <path d="M9.5 13v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
    </>
  ),
  home: (
    <>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />,
};

export function DepoIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name as DepoIconName] ?? PATHS.wallet}
    </svg>
  );
}

export function DepoBadge({
  icon,
  color,
  size = "md",
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`depo-badge depo-badge-${size}`} style={{ "--depo-color": color } as React.CSSProperties}>
      <DepoIcon name={icon} className={size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </span>
  );
}
