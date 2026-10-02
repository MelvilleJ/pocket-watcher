import { requireUser } from "@/lib/auth/dal";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { deleteDebt, deleteDebtPayment } from "@/lib/actions/debts";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
import { DebtRoadmapPlanner } from "@/components/debt-roadmap-planner";
import { PageHero } from "@/components/page-hero";
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
    <div className="page-accent-debt flex flex-col gap-6">
      <PageHero
        title="Debts Roadmap"
        description="Track what you owe and compare strategies for paying it off."
        iconPath="M3 7h18v10H3zM3 11h18M7 15h3"
        stats={[
          { label: "Outstanding", value: formatCurrency(totalBalance, user.currency) },
          { label: "Min. monthly", value: formatCurrency(minTotalPayment, user.currency) },
        ]}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add a debt</h2>
        <div className="mt-3">
          <DebtForm />
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
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
                <td className="px-4 py-2 text-zinc-500">{d.lenderType}</td>
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
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  No debts logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Record a payment</h2>
        <DebtPaymentForm debts={debts.map((d) => ({ id: d.id, name: d.name }))} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
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
                <td className="px-4 py-2 text-zinc-500">{p.description}</td>
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
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <DebtRoadmapPlanner debts={roadmapInput} currency={user.currency} minTotalPayment={minTotalPayment} />
    </div>
  );
}
