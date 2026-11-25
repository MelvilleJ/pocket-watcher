"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";

// The bare /dashboard/settings URL shows Account, so it counts as Account here.
function activeSlug(pathname: string) {
  const match = SETTINGS_SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  return match?.slug ?? "account";
}

export function SettingsNav() {
  const active = activeSlug(usePathname());
  return (
    <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-black/10 dark:border-white/10">
        {SETTINGS_SECTIONS.map((section) => {
          const current = section.slug === active;
          return (
            <li key={section.slug}>
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={`-mb-px block border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  current
                    ? "border-[color:var(--foreground)] font-semibold text-[color:var(--foreground)]"
                    : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
