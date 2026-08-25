import { requireUser } from "@/lib/auth/dal";
import { listSubscriptions } from "@/lib/queries/entries";
import { getExpenseCategories } from "@/lib/queries/lists";
import { cancelSubscription, deleteSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { DeleteButton } from "@/components/delete-button";
import { BILLING_CYCLE_LABELS, calcMonthlyCost } from "@/lib/finance/subscriptions";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const [rows, categories] = await Promise.all([
    listSubscriptions(user.id),
    getExpenseCategories(user.id),
  ]);

  const totalMonthly = rows
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + calcMonthlyCost(r.billingCycle, Number(r.billedAmount)), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Subscriptions</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            One row per subscription. Billed in every month it was active.
          </p>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Active monthly total:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalMonthly, user.currency)}
          </span>
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <SubscriptionForm categories={categories} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Billing cycle</th>
              <th className="px-4 py-3 font-medium text-right">Billed amount</th>
              <th className="px-4 py-3 font-medium text-right">Monthly cost</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-zinc-500">{row.categoryName}</td>
                <td className="px-4 py-2">{BILLING_CYCLE_LABELS[row.billingCycle]}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(Number(row.billedAmount), user.currency)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(calcMonthlyCost(row.billingCycle, Number(row.billedAmount)), user.currency)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      row.status === "active"
                        ? "text-[color:var(--status-good)]"
                        : "text-zinc-400"
                    }
                  >
                    {row.status === "active" ? "Active" : "Cancelled"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  {row.status === "active" && (
                    <form action={cancelSubscription.bind(null, row.id)} className="inline">
                      <button type="submit" className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:underline">
                        Cancel
                      </button>
                    </form>
                  )}
                  <DeleteButton action={deleteSubscription.bind(null, row.id)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No subscriptions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
