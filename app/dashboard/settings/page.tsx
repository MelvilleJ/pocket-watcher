import { requireUser } from "@/lib/auth/dal";
import { StackedItem, StackedList } from "@/components/stacked-list";
import { listSessions } from "@/lib/queries/audit";
import { SettingsForm } from "@/components/forms/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { revokeSession } from "@/lib/actions/settings";
import { PageHero } from "@/components/page-hero";
import { DeleteAccountButton, ImportDataButton } from "@/components/data-tools";

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await listSessions(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Settings"
        description="Profile, currency, savings rate, and device sessions."
        stats={[
          { label: "Currency", value: user.currency },
          { label: "Savings rate", value: `${(Number(user.savingsRate) * 100).toFixed(0)}%` },
        ]}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Profile</h2>
        <SettingsForm
          name={user.name}
          currency={user.currency}
          savingsRate={Number(user.savingsRate)}
        />
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your data</h2>
        <p className="mb-4 text-xs text-[color:var(--muted)]">
          Export downloads a full backup (including your audit history) as a JSON file. Import replaces all your
          current data with the contents of a backup file. Every export and import is recorded in your audit log.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export"
            className="inline-flex min-h-[38px] items-center rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900"
          >
            Export data
          </a>
          <ImportDataButton />
        </div>
      </section>

      <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Active sessions
          </h2>
          <p className="text-xs text-[color:var(--muted)]">
            Web and mobile devices signed in to your account.
          </p>
        </div>
        <table className="hidden w-full text-sm @2xl:table">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[color:var(--muted)]">
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const isRevoked = Boolean(s.revokedAt) || s.expiresAt < new Date();
              return (
                <tr key={s.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-4 py-2">{s.deviceName}</td>
                  <td className="px-4 py-2 capitalize text-[color:var(--muted)]">{s.platform}</td>
                  <td className="px-4 py-2 text-[color:var(--muted)]">{s.lastUsedAt.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {isRevoked ? (
                      <span className="text-[color:var(--muted)]">Signed out</span>
                    ) : (
                      <span className="text-[color:var(--status-good)]">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!isRevoked && (
                      <form action={revokeSession.bind(null, s.id)}>
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                          Sign out
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <StackedList className="@2xl:hidden">
          {sessions.map((s) => {
            const isRevoked = Boolean(s.revokedAt) || s.expiresAt < new Date();
            return (
              <StackedItem
                key={s.id}
                title={s.deviceName}
                value={
                  isRevoked ? (
                    <span className="font-normal text-[color:var(--muted)]">Signed out</span>
                  ) : (
                    <span className="font-normal text-[color:var(--status-good)]">Active</span>
                  )
                }
                meta={[
                  <span key="platform" className="capitalize">{s.platform}</span>,
                  `Last used ${s.lastUsedAt.toLocaleString()}`,
                ]}
                actions={
                  !isRevoked && (
                    <form action={revokeSession.bind(null, s.id)}>
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Sign out
                      </button>
                    </form>
                  )
                }
              />
            );
          })}
        </StackedList>
      </section>

      <section className="rounded-xl border border-red-300/60 dark:border-red-500/30 bg-white p-5 dark:bg-zinc-950">
        <h2 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
        <p className="mb-4 text-xs text-[color:var(--muted)]">
          Deleting your account permanently erases your account and all data (transactions, budgets, goals, and
          sessions) and can&rsquo;t be undone. The server keeps a record of the deletion, including a summary of what
          was removed. If you want to keep anything, export a backup first, then re-import it after signing up again.
        </p>
        <DeleteAccountButton email={user.email} />
      </section>
    </div>
  );
}
