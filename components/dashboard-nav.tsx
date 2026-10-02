"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

const MotionLink = motion.create(Link);

type NavIconName =
  | "home"
  | "calendar"
  | "budget"
  | "transactions"
  | "subscription"
  | "debt"
  | "goal"
  | "history"
  | "settings";

type NavLinkItem = { href: string; label: string; icon: NavIconName };

const NAV_GROUPS: { label: string; links: NavLinkItem[] }[] = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Summary", icon: "home" },
      { href: "/dashboard/calendar", label: "Calendar", icon: "calendar" },
      { href: "/dashboard/budget", label: "Budget", icon: "budget" },
    ],
  },
  {
    label: "Money",
    links: [
      { href: "/dashboard/transactions", label: "Transactions", icon: "transactions" },
      { href: "/dashboard/subscriptions", label: "Subscriptions", icon: "subscription" },
    ],
  },
  {
    label: "Planning",
    links: [
      { href: "/dashboard/debts", label: "Debts", icon: "debt" },
      { href: "/dashboard/goals", label: "Goals", icon: "goal" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/dashboard/audit", label: "History", icon: "history" },
      { href: "/dashboard/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const MOBILE_LINKS = NAV_GROUPS.flatMap((group) => group.links);

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/dashboard/debts") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ userName, logoutControl }: { userName: string; logoutControl: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const renderLink = (link: NavLinkItem, variant: "desktop" | "mobile") => {
    const active = isCurrentPath(pathname, link.href);
    return (
      <MotionLink
        key={`${variant}-${link.href}`}
        href={link.href}
        className={`nav-link ${variant === "mobile" ? "nav-link-mobile" : ""} ${active ? "is-active" : ""}`}
        whileHover={reduceMotion ? undefined : { x: variant === "desktop" ? 3 : 0, y: variant === "mobile" ? -2 : 0 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        {active && (
          <motion.span
            layoutId={`active-nav-${variant}`}
            className="nav-active-pill"
            transition={{ type: "spring", stiffness: 430, damping: 34 }}
          />
        )}
        <NavIcon name={link.icon} />
        <span className="relative z-10 whitespace-nowrap">{link.label}</span>
      </MotionLink>
    );
  };

  return (
    <>
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden w-72 flex-col px-4 py-5 lg:flex"
      >
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-1.5">
          <BrandMark className="h-10 w-10" />
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-bold tracking-[-0.02em] text-[color:var(--foreground)]">
              Pocket Watcher
            </span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-soft)]">
              Finance studio
            </span>
          </span>
        </Link>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted-soft)]">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">{group.links.map((link) => renderLink(link, "desktop"))}</div>
            </div>
          ))}
        </nav>

        <div className="sidebar-profile mt-auto flex items-center gap-3 rounded-xl p-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--surface-inset)] text-sm font-bold text-[color:var(--primary-deep)]">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[color:var(--foreground)]">{userName}</p>
            <p className="truncate text-[11px] text-[color:var(--muted-soft)]">Personal account</p>
          </div>
          {logoutControl}
        </div>
      </motion.aside>

      <header className="mobile-dashboard-header fixed inset-x-0 top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="font-bold tracking-[-0.02em] text-[color:var(--foreground)]">Pocket Watcher</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--surface-inset)] text-xs font-bold text-[color:var(--primary-deep)]">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            {logoutControl}
          </div>
        </div>
        <nav className="mobile-nav-scroll flex gap-1 overflow-x-auto px-3 pb-3">
          {MOBILE_LINKS.map((link) => renderLink(link, "mobile"))}
        </nav>
      </header>
    </>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    budget: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M7 9h10M7 14h4M15 14h2" />
      </>
    ),
    transactions: (
      <>
        <path d="m7 4-4 4 4 4" />
        <path d="M3 8h14" />
        <path d="m17 20 4-4-4-4" />
        <path d="M21 16H7" />
      </>
    ),
    subscription: (
      <>
        <path d="M20 7h-9" />
        <path d="m15 3-4 4 4 4" />
        <path d="M4 17h9" />
        <path d="m9 13 4 4-4 4" />
      </>
    ),
    debt: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5c-.7-.8-1.8-1.2-3.2-1.2-1.8 0-3.1.9-3.1 2.3 0 3.5 6.2 1.5 6.2 4.9 0 1.4-1.3 2.4-3.3 2.4-1.5 0-2.8-.5-3.6-1.5M12 5.5v13" />
      </>
    ),
    goal: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative z-10 h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
