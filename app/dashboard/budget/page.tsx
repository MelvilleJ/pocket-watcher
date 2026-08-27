import { requireUser } from "@/lib/auth/dal";
import { ensureDraftBudget, lockBudget, unlockBudget } from "@/lib/actions/budgets";
import { getBudgetForPeriod } from "@/lib/queries/budgets";
import { getBudgetActuals } from "@/lib/queries/summary";
import { listSubscriptions } from "@/lib/queries/entries";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listGoalsForUser } from "@/lib/queries/goals";
import { calcMonthlyCost } from "@/lib/finance/subscriptions";
import { BudgetLineRow } from "@/components/forms/budget-line-row";
import { SubscriptionBudgetLineRow } from "@/components/forms/subscription-budget-line-row";
import SaveAllButton from "@/components/save-all-button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const monthIndex = params.month ? Number(params.month) : now.getMonth();
  const month = monthIndex + 1;

  await ensureDraftBudget(year, month);
  const data = await getBudgetForPeriod(user.id, year, month);
  const { incomeBySource, expenseByCategory, subscriptionByName, debtPaymentsByName, goalPaymentsByName } =
    await getBudgetActuals(user.id, year, monthIndex);

  if (!data) return null;
  const { budget, lines } = data;
  const isLocked = budget.status === "locked";

  const incomeLines = lines.filter((l) => l.kind === "income");
  const expenseLines = lines.filter((l) => l.kind === "expense");
  const [subscriptions, debts, goals] = await Promise.all([
    listSubscriptions(user.id),
    getDebtsWithBalances(user.id),
    listGoalsForUser(user.id),
  ]);
  const activeDebtNames = new Set(debts.map((debt) => debt.name));
  const activeGoalNames = new Set(goals.map((goal) => goal.name));
  const debtLines = lines.filter((line) => line.kind === "debt" && activeDebtNames.has(line.label));
  const goalLines = lines.filter((line) => line.kind === "goal" && activeGoalNames.has(line.label));
  const subscriptionMonthlyCostByName = new Map(
    subscriptions.map((s) => [s.name, calcMonthlyCost(s.billingCycle, Number(s.billedAmount))])
  );

  let subscriptionLines = lines.filter((l) => l.kind === "subscription");
  if (!isLocked) {
    const activeSubscriptionNames = new Set(
      subscriptions.filter((s) => s.status === "active").map((s) => s.name)
    );
    subscriptionLines = subscriptionLines.filter((l) => activeSubscriptionNames.has(l.label));
  }

  const plannedIncome = incomeLines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const plannedExpense = expenseLines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const plannedSubscriptions = subscriptionLines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const plannedDebt = debtLines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const plannedGoals = goalLines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const actualIncome = Array.from(incomeBySource.values()).reduce((s, v) => s + v, 0);
  const actualExpense = Array.from(expenseByCategory.values()).reduce((s, v) => s + v, 0);
  const actualSubscriptions = Array.from(subscriptionByName.values()).reduce((s, v) => s + v, 0);
  const actualDebt = Array.from(debtPaymentsByName.values()).reduce((s, v) => s + v, 0);
  const actualGoals = Array.from(goalPaymentsByName.values()).reduce((s, v) => s + v, 0);
  const totalPlannedExpenses = plannedExpense + plannedSubscriptions;
  const totalActualExpenses = actualExpense + actualSubscriptions;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Budget — {MONTH_NAMES[monthIndex]} {year}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLocked
              ? "This budget is locked. Actuals are tracked against the amounts you committed to."
              : "Plan your budget before the month starts, then lock it in."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2 text-sm" action="/dashboard/budget">
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
            <SaveAllButton />
          </form>
          {isLocked ? (
            <form action={unlockBudget.bind(null, budget.id)}>
              <button
                type="submit"
                className="rounded-md border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm font-medium"
              >
                Unlock to edit
              </button>
            </form>
          ) : (
            <form action={lockBudget.bind(null, budget.id)}>
              <button
                type="submit"
                className="rounded-md bg-[color:var(--status-good)] px-3 py-1.5 text-sm font-medium text-white"
              >
                Lock budget
              </button>
            </form>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
          <p className="text-sm text-zinc-500">Planned income</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(plannedIncome, user.currency)}</p>
          <p className="text-xs text-zinc-500">Actual: {formatCurrency(actualIncome, user.currency)}</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
          <p className="text-sm text-zinc-500">Total planned expenses</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totalPlannedExpenses, user.currency)}</p>
          <p className="text-xs text-zinc-500">Actual: {formatCurrency(totalActualExpenses, user.currency)}</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
          <p className="text-sm text-zinc-500">Planned subscriptions</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(plannedSubscriptions, user.currency)}</p>
          <p className="text-xs text-zinc-500">Actual: {formatCurrency(actualSubscriptions, user.currency)}</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
          <p className="text-sm text-zinc-500">Planned debt payments</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(plannedDebt, user.currency)}</p>
          <p className="text-xs text-zinc-500">Actual: {formatCurrency(actualDebt, user.currency)}</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
          <p className="text-sm text-zinc-500">Planned goal payments</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(plannedGoals, user.currency)}</p>
          <p className="text-xs text-zinc-500">Actual: {formatCurrency(actualGoals, user.currency)}</p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Income</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium text-right">Budgeted</th>
              <th className="px-4 py-3 font-medium text-right">Actual</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {incomeLines.map((l) => (
              <BudgetLineRow
                key={l.id}
                lineId={l.id}
                label={l.label}
                plannedAmount={Number(l.plannedAmount)}
                actual={incomeBySource.get(l.label) ?? 0}
                currency={user.currency}
                disabled={isLocked}
                kind="income"
              />
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Expenses by category
          </h2>
          <p className="text-xs text-zinc-500">Day-to-day spending only — subscriptions, debt payments, and goal payments are tracked separately below.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Budgeted</th>
              <th className="px-4 py-3 font-medium text-right">Actual</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {expenseLines.map((l) => (
              <BudgetLineRow
                key={l.id}
                lineId={l.id}
                label={l.label}
                plannedAmount={Number(l.plannedAmount)}
                actual={expenseByCategory.get(l.label) ?? 0}
                currency={user.currency}
                disabled={isLocked}
                kind="expense"
              />
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Subscriptions</h2>
          <p className="text-xs text-zinc-500">
            Every active subscription is added here automatically at its known cost — just say
            whether you&apos;re paying it this month. Cancelled ones drop off once you unlock or
            re-plan a budget.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium text-right">Paying?</th>
              <th className="px-4 py-3 font-medium text-right">Actual</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionLines.map((l) => {
              const monthlyCost = subscriptionMonthlyCostByName.get(l.label) ?? Number(l.plannedAmount);
              return (
                <SubscriptionBudgetLineRow
                  key={l.id}
                  lineId={l.id}
                  label={l.label}
                  monthlyCost={monthlyCost}
                  included={Number(l.plannedAmount) > 0}
                  actual={subscriptionByName.get(l.label) ?? 0}
                  currency={user.currency}
                  disabled={isLocked}
                />
              );
            })}
            {subscriptionLines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  No active subscriptions to budget for.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Debt payments</h2>
          <p className="text-xs text-zinc-500">Every debt with an outstanding balance is added here automatically.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Debt</th>
              <th className="px-4 py-3 font-medium text-right">Budgeted</th>
              <th className="px-4 py-3 font-medium text-right">Actual</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {debtLines.map((l) => (
              <BudgetLineRow
                key={l.id}
                lineId={l.id}
                label={l.label}
                plannedAmount={Number(l.plannedAmount)}
                actual={debtPaymentsByName.get(l.label) ?? 0}
                currency={user.currency}
                disabled={isLocked}
                kind="debt"
              />
            ))}
            {debtLines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  No outstanding debts to budget for.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Goal payments</h2>
          <p className="text-xs text-zinc-500">Every unfinished goal is added here automatically at its minimum monthly contribution.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Goal</th>
              <th className="px-4 py-3 font-medium text-right">Budgeted</th>
              <th className="px-4 py-3 font-medium text-right">Actual</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {goalLines.map((line) => (
              <BudgetLineRow
                key={line.id}
                lineId={line.id}
                label={line.label}
                plannedAmount={Number(line.plannedAmount)}
                actual={goalPaymentsByName.get(line.label) ?? 0}
                currency={user.currency}
                disabled={isLocked}
                kind="goal"
              />
            ))}
            {goalLines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  No unfinished goals to budget for.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
