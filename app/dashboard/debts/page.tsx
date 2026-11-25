import { requireUser } from "@/lib/auth/dal";
import { StackedItem, StackedList } from "@/components/stacked-list";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { deleteDebt, deleteDebtPayment } from "@/lib/actions/debts";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
import { DebtRoadmapPlanner } from "@/components/debt-roadmap-planner";
import { FocalPanel } from "@/components/focal-panel";
import { PageHero } from "@/components/page-hero";
import { Money } from "@/components/money";
import { DeleteButton } from "@/components/delete-button";
import { db } from "@/lib/db";
import { debtPayments } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DebtsPage() {
  const user = await requireUser();
  const debts = await getDebtsWithBalances(user.id);

  const paymentRows = await db
    .select()
    .from(debtPayments)
    .where(and(eq(debtPayments.userId, user.id), isNull(debtPayments.deletedAt)))
    .orderBy(desc(debtPayments.date))
    .limit(100);

  const debtNameById = new Map(debts.map((d) => [d.id, d.name]));
  const payments = paymentRows.filter((payment) => debtNameById.has(payment.debtId));
  const totalBalance = debts.reduce((sum, d) => sum + d.currentBalance, 0);

  const activeDebts = debts.filter((d) => d.currentBalance > 0);
  const minTotalPayment = activeDebts.reduce((sum, d) => sum + d.minMonthlyPayment, 0);
  const roadmapInput = activeDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.currentBalance,
    interestRate: d.interestRate,
    minMonthlyPayment: d.minMonthlyPayment,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Debts Roadmap"
        description="What you owe and how to pay it off."
      />

      <FocalPanel
        label="Still to pay off"
        value={
          <Money
            currency={user.currency}
            amount={totalBalance}
            className={`money-display ${totalBalance > 0 ? "text-[color:var(--status-critical)]" : "text-[color:var(--status-good)]"}`}
          />
        }
        rows={[
          { label: "Minimum each month", value: <Money currency={user.currency} amount={minTotalPayment} /> },
          { label: "Debts", value: String(debts.length) },
        ]}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add a debt</h2>
        <div className="mt-3">
          <DebtForm />
        </div>
      </section>

      <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="hidden w-full text-sm @3xl:table">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[color:var(--muted)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Original</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
              <th className="px-4 py-3 font-medium text-right">Min. payment</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
              <th className="px-4 py-3 font-medium text-right">% paid</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2 text-[color:var(--muted)]">{d.lenderType}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(d.originalAmount, user.currency)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {(d.interestRate * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(d.minMonthlyPayment, user.currency)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatCurrency(d.currentBalance, user.currency)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {(d.percentPaidOff * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-right">
                  <DeleteButton action={deleteDebt.bind(null, d.id)} />
                </td>
              </tr>
            ))}
            {debts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[color:var(--muted)]">
                  No debts logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <StackedList className="@3xl:hidden" isEmpty={debts.length === 0} emptyMessage="No debts logged yet.">
          {debts.map((d) => (
            <StackedItem
              key={d.id}
              title={d.name}
              value={formatCurrency(d.currentBalance, user.currency)}
              meta={[
                d.lenderType,
                `${(d.interestRate * 100).toFixed(2)}% rate`,
                `Min. ${formatCurrency(d.minMonthlyPayment, user.currency)}/mo`,
              ]}
              progress={d.percentPaidOff}
              actions={<DeleteButton action={deleteDebt.bind(null, d.id)} />}
            >
              <p className="text-xs text-[color:var(--muted)]">
                {(d.percentPaidOff * 100).toFixed(0)}% paid of {formatCurrency(d.originalAmount, user.currency)}
              </p>
            </StackedItem>
          ))}
        </StackedList>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Record a payment</h2>
        <DebtPaymentForm debts={debts.map((d) => ({ id: d.id, name: d.name }))} />
      </section>

      <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="hidden w-full text-sm @2xl:table">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-[color:var(--muted)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Debt</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2">{p.date.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2">{debtNameById.get(p.debtId) ?? "-"}</td>
                <td className="px-4 py-2 text-[color:var(--muted)]">{p.description}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(Number(p.amount), user.currency)}
                </td>
                <td className="px-4 py-2 text-right">
                  <DeleteButton action={deleteDebtPayment.bind(null, p.id)} />
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[color:var(--muted)]">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <StackedList className="@2xl:hidden" isEmpty={payments.length === 0} emptyMessage="No payments recorded yet.">
          {payments.map((p) => (
            <StackedItem
              key={p.id}
              title={debtNameById.get(p.debtId) ?? "-"}
              value={formatCurrency(Number(p.amount), user.currency)}
              meta={[p.date.toISOString().slice(0, 10), p.description]}
              actions={<DeleteButton action={deleteDebtPayment.bind(null, p.id)} />}
            />
          ))}
        </StackedList>
      </section>

      <DebtRoadmapPlanner debts={roadmapInput} currency={user.currency} minTotalPayment={minTotalPayment} />
    </div>
  );
}
