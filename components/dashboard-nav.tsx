"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

type NavIconName =
  | "home"
  | "calendar"
  | "budget"
  | "transactions"
  | "subscription"
  | "debt"
  | "goal"
  | "history"
  | "settings"
  | "more";

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

const ALL_LINKS = NAV_GROUPS.flatMap((group) => group.links);
const TAB_HREFS = ["/dashboard", "/dashboard/transactions", "/dashboard/budget", "/dashboard/calendar"];
const TAB_LINKS = TAB_HREFS.map((href) => ALL_LINKS.find((link) => link.href === href)!);
const MORE_GROUPS = NAV_GROUPS.map((group) => ({
  ...group,
  links: group.links.filter((link) => !TAB_HREFS.includes(link.href)),
})).filter((group) => group.links.length > 0);

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/dashboard/debts") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ userName, logoutControl }: { userName: string; logoutControl: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_GROUPS.some((group) => group.links.some((link) => isCurrentPath(pathname, link.href)));

  const renderLink = (link: NavLinkItem) => {
    const active = isCurrentPath(pathname, link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`nav-link ${active ? "is-active" : ""}`}
      >
        {active && (
          <motion.span
            layoutId="active-nav-desktop"
            className="nav-active-pill"
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34 }}
          />
        )}
        <NavIcon name={link.icon} />
        <span className="relative z-10 whitespace-nowrap">{link.label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden w-72 flex-col px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-1.5">
          <BrandMark className="h-10 w-10" />
          <span className="brand-wordmark block truncate text-[18px] text-[color:var(--foreground)]">
            Pocket Watcher
          </span>
        </Link>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <div className="flex flex-col gap-0.5">{group.links.map(renderLink)}</div>
            </div>
          ))}
        </nav>

        <ProfileCard userName={userName} logoutControl={logoutControl} />
      </aside>

      <header className="mobile-dashboard-header fixed inset-x-0 top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="brand-wordmark text-[17px] text-[color:var(--foreground)]">Pocket Watcher</span>
          </Link>
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--surface-inset)] text-xs font-bold text-[color:var(--primary-deep)]"
          >
            {userName.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>

      <nav aria-label="Main" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TAB_LINKS.map((link) => {
            const active = !moreOpen && isCurrentPath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={`mobile-tab ${active ? "is-active" : ""}`}
              >
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-sheet"
            onClick={() => setMoreOpen((open) => !open)}
            className={`mobile-tab ${moreOpen || moreActive ? "is-active" : ""}`}
          >
            <NavIcon name="more" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <MoreSheet
            pathname={pathname}
            userName={userName}
            logoutControl={logoutControl}
            reduceMotion={Boolean(reduceMotion)}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ProfileCard({ userName, logoutControl }: { userName: string; logoutControl: ReactNode }) {
  return (
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
  );
}

function MoreSheet({
  pathname,
  userName,
  logoutControl,
  reduceMotion,
  onClose,
}: {
  pathname: string;
  userName: string;
  logoutControl: ReactNode;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      <motion.div
        className="mobile-sheet-backdrop fixed inset-0 z-40 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        onClick={onClose}
      />
      <motion.div
        ref={sheetRef}
        id="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="More pages"
        className="mobile-sheet fixed inset-x-0 bottom-0 z-40 lg:hidden"
        initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40 }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-4 pt-3">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[color:var(--border)]" />
          {MORE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.links.map((link) => {
                  const active = isCurrentPath(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`mobile-sheet-link ${active ? "is-active" : ""}`}
                    >
                      <NavIcon name={link.icon} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <ProfileCard userName={userName} logoutControl={logoutControl} />
        </div>
      </motion.div>
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
    more: (
      <>
        <circle cx="5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="19" cy="12" r="1.4" />
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
