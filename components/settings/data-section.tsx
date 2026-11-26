import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authPasskeys } from "@/lib/db/schema";
import { getSession, requireUser } from "@/lib/auth/dal";
import { listSessions } from "@/lib/queries/audit";
import { revokeSession } from "@/lib/actions/settings";
import { deviceFrom } from "@/lib/utils/device";
import { StackedItem, StackedList } from "@/components/stacked-list";
import { DeleteAccountButton, ImportDataButton } from "@/components/data-tools";
import { SecurityCard } from "@/components/settings/security-card";

export async function DataSection() {
  const user = await requireUser();
  const [sessions, current, passkeys] = await Promise.all([
    listSessions(user.id),
    getSession(),
    db
      .select({ id: authPasskeys.id, name: authPasskeys.name, createdAt: authPasskeys.createdAt })
      .from(authPasskeys)
      .where(eq(authPasskeys.userId, user.id)),
  ]);
  const currentId = current?.session.id;

  return (
    <div className="flex flex-col gap-6">
      <SecurityCard
        passkeys={passkeys.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString() ?? null }))}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Signed-in devices</h2>
        </div>
        <StackedList>
          {sessions.map((s) => (
            <StackedItem
              key={s.id}
              title={deviceFrom(s.userAgent)}
              value={
                s.id === currentId ? (
                  <span className="font-normal text-[color:var(--status-good)]">This device</span>
                ) : null
              }
              meta={[
                `Last active ${s.updatedAt.toLocaleString()}`,
                ...(s.ipAddress ? [s.ipAddress] : []),
              ]}
              actions={
                s.id !== currentId && (
                  <form action={revokeSession.bind(null, s.id)}>
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Sign out
                    </button>
                  </form>
                )
              }
            />
          ))}
        </StackedList>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your data</h2>
        <p className="mb-4 text-xs text-[color:var(--muted)]">Export a backup, or import one to replace everything.</p>
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

      <section className="rounded-xl border border-red-300/60 dark:border-red-500/30 bg-white p-5 dark:bg-zinc-950">
        <h2 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
        <p className="mb-4 text-xs text-[color:var(--muted)]">
          Permanently deletes your account and all data. Export a backup first.
        </p>
        <DeleteAccountButton email={user.email} />
      </section>
    </div>
  );
}
