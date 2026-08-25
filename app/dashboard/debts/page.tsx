import { requireUser } from "@/lib/auth/dal";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { deleteDebt, deleteDebtPayment } from "@/lib/actions/debts";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
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

  const payments = await db
    .select()
    .from(debtPayments)
    .where(and(eq(debtPayments.userId, user.id), isNull(debtPayments.deletedAt)))
    .orderBy(desc(debtPayments.date))
    .limit(100);

  const debtNameById = new Map(debts.map((d) => [d.id, d.name]));
  const totalBalance = debts.reduce((sum, d) => sum + d.currentBalance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Debts</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            What you owe, and every payment you make against it.
          </p>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Total outstanding:{" "}
          <span className="font-semibold text-[color:var(--status-critical)]">
            {formatCurrency(totalBalance, user.currency)}
          </span>
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Add a debt</h2>
        <DebtForm />
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Lender / type</th>
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
                <td className="px-4 py-2">{debtNameById.get(p.debtId) ?? "—"}</td>
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
    </div>
  );
}
