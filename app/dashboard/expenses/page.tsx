import { requireUser } from "@/lib/auth/dal";
import { listExpenses } from "@/lib/queries/entries";
import { getExpenseCategories } from "@/lib/queries/lists";
import { deleteExpense } from "@/lib/actions/expenses";
import { ExpenseForm } from "@/components/forms/expense-form";
import { DeleteButton } from "@/components/delete-button";

function formatCurrency(value: string, currency: string) {
  return `${currency}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ExpensesPage() {
  const user = await requireUser();
  const [rows, categories] = await Promise.all([
    listExpenses(user.id),
    getExpenseCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Expenses</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Day-to-day spending only. Subscriptions and debt payments are tracked separately.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <ExpenseForm categories={categories} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Paid?</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2">{row.date.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2">{row.categoryName}</td>
                <td className="px-4 py-2 text-zinc-500">{row.description}</td>
                <td className="px-4 py-2">{row.paid ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(row.amount, user.currency)}
                </td>
                <td className="px-4 py-2 text-right">
                  <DeleteButton action={deleteExpense.bind(null, row.id)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  No expenses logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
