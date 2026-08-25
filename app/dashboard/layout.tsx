import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/actions/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Summary" },
  { href: "/dashboard/budget", label: "Budget" },
  { href: "/dashboard/income", label: "Income" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/subscriptions", label: "Subscriptions" },
  { href: "/dashboard/debts", label: "Debts" },
  { href: "/dashboard/debts/roadmap", label: "Debt Roadmap" },
  { href: "/dashboard/audit", label: "History" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Pocket Watcher
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Hi, {user.name}</p>
          </div>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
