import { requireUser } from "@/lib/auth/dal";
import { StackedItem, StackedList } from "@/components/stacked-list";
import { listSubscriptions } from "@/lib/queries/entries";
import { getExpenseCategories } from "@/lib/queries/lists";
import { cancelSubscription, deleteSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { DeleteButton } from "@/components/delete-button";
import { BILLING_CYCLE_LABELS, calcMonthlyCost } from "@/lib/finance/subscriptions";
import { FocalPanel } from "@/components/focal-panel";
import { PageHero } from "@/components/page-hero";
import { Money } from "@/components/money";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const [rows, categories] = await Promise.all([
    listSubscriptions(user.id),
    getExpenseCategories(user.id),
  ]);

  const activeCount = rows.filter((r) => r.status === "active").length;
  const totalMonthly = rows
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + calcMonthlyCost(r.billingCycle, Number(r.billedAmount)), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Subscriptions"
        description="Recurring charges."
      />

      <FocalPanel
        label="Each month"
        value={<Money currency={user.currency} amount={totalMonthly} className="money-display" />}
        rows={[
          { label: "Each year", value: <Money currency={user.currency} amount={totalMonthly * 12} /> },
          { label: "Active subscriptions", value: String(activeCount) },
        ]}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add a subscription</h2>
        <div className="mt-3">
          <SubscriptionForm categories={categories} />
        </div>
      </section>

      <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="hidden w-full text-sm @3xl:table">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[color:var(--muted)]">
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
                <td className="px-4 py-2 text-[color:var(--muted)]">{row.categoryName}</td>
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
                        : "text-[color:var(--muted)]"
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
                <td colSpan={7} className="px-4 py-6 text-center text-[color:var(--muted)]">
                  No subscriptions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <StackedList className="@3xl:hidden" isEmpty={rows.length === 0} emptyMessage="No subscriptions logged yet.">
          {rows.map((row) => {
            const isActive = row.status === "active";
            return (
              <StackedItem
                key={row.id}
                title={row.name}
                value={
                  <>
                    {formatCurrency(calcMonthlyCost(row.billingCycle, Number(row.billedAmount)), user.currency)}
                    <span className="text-xs font-normal text-[color:var(--muted)]">/mo</span>
                  </>
                }
                meta={[
                  <span key="status" className={isActive ? "text-[color:var(--status-good)]" : undefined}>
                    {isActive ? "Active" : "Cancelled"}
                  </span>,
                  row.categoryName,
                  `${formatCurrency(Number(row.billedAmount), user.currency)} ${BILLING_CYCLE_LABELS[row.billingCycle].toLowerCase()}`,
                ]}
                actions={
                  <>
                    {isActive && (
                      <form action={cancelSubscription.bind(null, row.id)}>
                        <button type="submit" className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:underline">
                          Cancel
                        </button>
                      </form>
                    )}
                    <DeleteButton action={deleteSubscription.bind(null, row.id)} />
                  </>
                }
              />
            );
          })}
        </StackedList>
      </section>
    </div>
  );
}
