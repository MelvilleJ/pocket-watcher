import { requireUser } from "@/lib/auth/dal";
import { listSessions } from "@/lib/queries/audit";
import { SettingsForm } from "@/components/forms/settings-form";
import { revokeSession } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await listSessions(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Profile, currency, savings rate, and device sessions.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Profile</h2>
        <SettingsForm
          name={user.name}
          currency={user.currency}
          savingsRate={Number(user.savingsRate)}
        />
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
