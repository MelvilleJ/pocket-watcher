import { requireUser } from "@/lib/auth/dal";
import { listAuditLogs } from "@/lib/queries/audit";
import { PageHero } from "@/components/page-hero";

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
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

export default async function AuditPage() {
  const user = await requireUser();
  const logs = await listAuditLogs(user.id);

  return (
    <div className="page-accent-history flex flex-col gap-6">
      <PageHero
        title="History & audit log"
        description="Every change made to your data, from either the web dashboard or the mobile app."
        iconPath="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"
        stats={[{ label: "Recorded changes", value: logs.length.toLocaleString() }]}
      />

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
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
                <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2">{ENTITY_LABELS[log.entityType] ?? log.entityType}</td>
                <td className="px-4 py-2">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-4 py-2 capitalize text-zinc-500">{log.source}</td>
                <td className="px-4 py-2">
                  <details>
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:underline">
                      View
                    </summary>
                    <pre className="mt-2 max-w-md overflow-x-auto rounded-md bg-zinc-100 dark:bg-zinc-900 p-2 text-xs">
                      {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
