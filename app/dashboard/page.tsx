import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getCategoryBreakdown, getMoneyInOutSummary, getMonthByMonthSummary } from "@/lib/queries/summary";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { StatTile } from "@/components/stat-tile";
import { MoneyFlowChart } from "@/components/charts/money-flow-chart";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const monthIndex = params.month ? Number(params.month) : now.getMonth();

  const [{ selected, ytd }, months, categories, debts] = await Promise.all([
    getMoneyInOutSummary(user.id, year, monthIndex),
    getMonthByMonthSummary(user.id, year),
    getCategoryBreakdown(user.id, year, monthIndex),
    getDebtsWithBalances(user.id),
  ]);

  const savingsRate = Number(user.savingsRate);
  const net = selected.net;
  const savings = net > 0 ? net * savingsRate : 0;
  const funMoney = net > 0 ? net - savings : 0;
  const outstandingDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);

  const chartData = months.map((m) => ({
    label: MONTH_NAMES[m.month.getMonth()].slice(0, 3),
    income: m.income,
    expenses: m.expenses,
    subscriptions: m.subscriptions,
    debtPayments: m.debtPayments,
  }));

  const categoryChartData = categories
    .filter((c) => c.month > 0)
    .map((c) => ({ category: c.category, value: c.month }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {MONTH_NAMES[monthIndex]} {year}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Everything here is calculated from your Income, Expenses, Subscriptions, and Debts logs.
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm" action="/dashboard">
          <select
            name="month"
            defaultValue={monthIndex}
            className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <input
            name="year"
            type="number"
            defaultValue={year}
            className="w-24 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-1.5 text-white dark:text-zinc-900"
          >
            View
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Income (month)" value={formatCurrency(selected.income, user.currency)} />
        <StatTile label="Total money out" value={formatCurrency(selected.totalOut, user.currency)} />
        <StatTile
          label="Net"
          value={formatCurrency(net, user.currency)}
          tone={net >= 0 ? "good" : "critical"}
        />
        <StatTile label="Savings" value={formatCurrency(savings, user.currency)} />
        <StatTile label="Fun money" value={formatCurrency(funMoney, user.currency)} />
        <StatTile
          label="Outstanding debt"
          value={formatCurrency(outstandingDebt, user.currency)}
          tone={outstandingDebt > 0 ? "critical" : "good"}
        />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {year} money in / money out, by month
        </h2>
        <div className="mt-4">
          <MoneyFlowChart data={chartData} currency={user.currency} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Expenses by category — {MONTH_NAMES[monthIndex]}
          </h2>
          {categoryChartData.length > 0 ? (
            <div className="mt-4">
              <CategoryBreakdownChart data={categoryChartData} currency={user.currency} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No expenses logged this month yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Year to date
          </h2>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <dt className="text-zinc-500">Income</dt>
              <dd className="tabular-nums">{formatCurrency(ytd.income, user.currency)}</dd>
            </div>
            <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <dt className="text-zinc-500">Expenses</dt>
              <dd className="tabular-nums">{formatCurrency(ytd.expenses, user.currency)}</dd>
            </div>
            <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <dt className="text-zinc-500">Subscriptions</dt>
              <dd className="tabular-nums">{formatCurrency(ytd.subscriptions, user.currency)}</dd>
            </div>
            <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <dt className="text-zinc-500">Debt payments</dt>
              <dd className="tabular-nums">{formatCurrency(ytd.debtPayments, user.currency)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-medium">
              <dt>Net</dt>
              <dd className="tabular-nums">{formatCurrency(ytd.net, user.currency)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-1">
            <Link
              href="/dashboard/budget"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-50 underline"
            >
              Plan next month&apos;s budget →
            </Link>
            <Link
              href="/dashboard/debts/roadmap"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-50 underline"
            >
              Plan your debt payoff roadmap →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
