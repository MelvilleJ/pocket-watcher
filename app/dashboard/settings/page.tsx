import { requireUser } from "@/lib/auth/dal";
import { listSessions } from "@/lib/queries/audit";
import { SettingsForm } from "@/components/forms/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { revokeSession } from "@/lib/actions/settings";
import { PageHero } from "@/components/page-hero";

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await listSessions(user.id);

  return (
    <div className="page-accent-settings flex flex-col gap-6">
      <PageHero
        title="Settings"
        description="Profile, currency, savings rate, and device sessions."
        iconPath="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
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

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Active sessions
          </h2>
          <p className="text-xs text-zinc-500">
            Web and mobile devices signed in to your account.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
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
                  <td className="px-4 py-2 capitalize text-zinc-500">{s.platform}</td>
                  <td className="px-4 py-2 text-zinc-500">{s.lastUsedAt.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {isRevoked ? (
                      <span className="text-zinc-400">Signed out</span>
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
      </section>
    </div>
  );
}
