import { requireUser } from "@/lib/auth/dal";
import { StackedItem, StackedList } from "@/components/stacked-list";
import { listAuditLogs } from "@/lib/queries/audit";
import { PageHero } from "@/components/page-hero";
import { AuditChanges } from "@/components/audit-changes";

const ENTITY_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  depo: "Depo",
  depo_transfer: "Depo transfer",
  subscription: "Subscription",
  debt: "Debt",
  debt_payment: "Debt payment",
  goal: "Goal",
  goal_payment: "Goal payment",
  budget: "Budget",
  user: "Profile",
  account: "Account",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  export: "Data exported",
  import: "Data imported",
  account_deletion: "Account deleted",
};

export default async function AuditPage() {
  const user = await requireUser();
  const { logs, total } = await listAuditLogs(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="History & audit log"
        description="Every change made to your data, from either the web dashboard or the mobile app."
        stats={[{ label: "Recorded changes", value: total.toLocaleString() }]}
      />

      {total > logs.length && (
        <p className="text-sm text-[color:var(--muted)]">
          Showing the latest {logs.length.toLocaleString()} of {total.toLocaleString()} changes.
        </p>
      )}

      <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="hidden w-full text-sm @3xl:table">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[color:var(--muted)]">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-black/5 dark:border-white/5 align-top">
                <td className="px-4 py-2 whitespace-nowrap text-[color:var(--muted)]">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2">{ENTITY_LABELS[log.entityType] ?? log.entityType}</td>
                <td className="px-4 py-2">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-4 py-2 capitalize text-[color:var(--muted)]">{log.source}</td>
                <td className="px-4 py-2">
                  <AuditChanges action={log.action} before={log.before} after={log.after} />
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[color:var(--muted)]">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <StackedList className="@3xl:hidden" isEmpty={logs.length === 0} emptyMessage="No activity recorded yet.">
          {logs.map((log) => (
            <StackedItem
              key={log.id}
              title={ENTITY_LABELS[log.entityType] ?? log.entityType}
              value={<span className="font-normal">{ACTION_LABELS[log.action] ?? log.action}</span>}
              meta={[log.createdAt.toLocaleString(), <span key="source" className="capitalize">{log.source}</span>]}
            >
              <AuditChanges action={log.action} before={log.before} after={log.after} />
            </StackedItem>
          ))}
        </StackedList>
      </section>
    </div>
  );
}
