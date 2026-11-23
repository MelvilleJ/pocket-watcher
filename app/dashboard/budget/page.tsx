import { requireUser } from "@/lib/auth/dal";
import { lockBudget, unlockBudget } from "@/lib/actions/budgets";
import { getBudgetView } from "@/lib/budgets";
import { BudgetSection } from "@/components/budget-section";
import { BudgetLineRow } from "@/components/forms/budget-line-row";
import { SubscriptionBudgetLineRow } from "@/components/forms/subscription-budget-line-row";
import SaveAllButton from "@/components/save-all-button";
import { StatTile } from "@/components/stat-tile";
import { StepLink } from "@/components/year-picker";
import { PageHero } from "@/components/page-hero";

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
  const requestedYear = Number(params.year);
  const requestedMonth = Number(params.month);
  const year = params.year && Number.isInteger(requestedYear) ? requestedYear : now.getFullYear();
  const monthIndex =
    params.month && Number.isInteger(requestedMonth) && requestedMonth >= 0 && requestedMonth <= 11
      ? requestedMonth
      : now.getMonth();
  const previousPeriod = new Date(year, monthIndex - 1, 1);
  const nextPeriod = new Date(year, monthIndex + 1, 1);
  const periodHref = (date: Date) => `/dashboard/budget?year=${date.getFullYear()}&month=${date.getMonth()}`;

  const view = await getBudgetView(user.id, year, monthIndex);
  if (!view) return null;

  const { budget, totals } = view;
  const { isLocked } = budget;
  const { income: incomeLines, expenses: expenseLines, subscriptions: subscriptionLines, debts: debtLines, goals: goalLines } =
    view.lines;
  const totalPlannedExpenses = totals.plannedExpense + totals.plannedSubscriptions;
  const totalActualExpenses = totals.actualExpense + totals.actualSubscriptions;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={`Budget: ${MONTH_NAMES[monthIndex]} ${year}`}
        description={
          isLocked
            ? "This budget is locked. Actuals are tracked against the amounts you committed to."
            : "Plan your budget before the month starts, then lock it in."
        }
        actions={
          <>
            <div className="year-picker" role="group" aria-label="Choose month">
              <StepLink href={periodHref(previousPeriod)} label="Previous month" direction="previous" />
              <span className="period-label">
                {MONTH_NAMES[monthIndex].slice(0, 3)} {year}
              </span>
              <StepLink href={periodHref(nextPeriod)} label="Next month" direction="next" />
            </div>
            <SaveAllButton />
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
                  className="rounded-md bg-[color:var(--fill-good)] px-3 py-1.5 text-sm font-medium text-white"
                >
                  Lock budget
                </button>
              </form>
            )}
          </>
        }
      />

      <section className="stat-grid grid">
        <StatTile
          label="Planned income"
          value={formatCurrency(totals.plannedIncome, user.currency)}
          detail={`Actual: ${formatCurrency(totals.actualIncome, user.currency)}`}
        />
        <StatTile
          label="Total planned expenses"
          value={formatCurrency(totalPlannedExpenses, user.currency)}
          detail={`Actual: ${formatCurrency(totalActualExpenses, user.currency)}`}
        />
        <StatTile
          label="Planned subscriptions"
          value={formatCurrency(totals.plannedSubscriptions, user.currency)}
          detail={`Actual: ${formatCurrency(totals.actualSubscriptions, user.currency)}`}
        />
        <StatTile
          label="Planned debt payments"
          value={formatCurrency(totals.plannedDebt, user.currency)}
          detail={`Actual: ${formatCurrency(totals.actualDebt, user.currency)}`}
        />
        <StatTile
          label="Planned goal payments"
          value={formatCurrency(totals.plannedGoals, user.currency)}
          detail={`Actual: ${formatCurrency(totals.actualGoals, user.currency)}`}
        />
      </section>

      <BudgetSection title="Income" labelHeading="Source">
        {incomeLines.map((l) => (
          <BudgetLineRow
            key={l.id}
            lineId={l.id}
            label={l.label}
            plannedAmount={l.plannedAmount}
            actual={l.actual}
            currency={user.currency}
            disabled={isLocked}
            kind="income"
          />
        ))}
      </BudgetSection>

      <BudgetSection
        title="Expenses by category"
        description="Day-to-day spending only. Subscriptions, debt payments, and goal payments are tracked separately below."
        labelHeading="Category"
      >
        {expenseLines.map((l) => (
          <BudgetLineRow
            key={l.id}
            lineId={l.id}
            label={l.label}
            plannedAmount={l.plannedAmount}
            actual={l.actual}
            currency={user.currency}
            disabled={isLocked}
            kind="expense"
          />
        ))}
      </BudgetSection>

      <BudgetSection
        title="Subscriptions"
        description={
          <>
            Every active subscription is added here automatically at its known cost. Just say
            whether you&apos;re paying it this month. Cancelled ones drop off once you unlock or
            re-plan a budget.
          </>
        }
        labelHeading="Subscription"
        plannedHeading="Paying?"
        isEmpty={subscriptionLines.length === 0}
        emptyMessage="No active subscriptions to budget for."
      >
        {subscriptionLines.map((l) => (
          <SubscriptionBudgetLineRow
            key={l.id}
            lineId={l.id}
            label={l.label}
            monthlyCost={l.monthlyCost ?? l.plannedAmount}
            included={l.plannedAmount > 0}
            actual={l.actual}
            currency={user.currency}
            disabled={isLocked}
          />
        ))}
      </BudgetSection>

      <BudgetSection
        title="Debt payments"
        description="Every debt with an outstanding balance is added here automatically."
        labelHeading="Debt"
        isEmpty={debtLines.length === 0}
        emptyMessage="No outstanding debts to budget for."
      >
        {debtLines.map((l) => (
          <BudgetLineRow
            key={l.id}
            lineId={l.id}
            label={l.label}
            plannedAmount={l.plannedAmount}
            actual={l.actual}
            currency={user.currency}
            disabled={isLocked}
            kind="debt"
          />
        ))}
      </BudgetSection>

      <BudgetSection
        title="Goal payments"
        description="Every unfinished goal is added here automatically at its minimum monthly contribution."
        labelHeading="Goal"
        isEmpty={goalLines.length === 0}
        emptyMessage="No unfinished goals to budget for."
      >
        {goalLines.map((line) => (
          <BudgetLineRow
            key={line.id}
            lineId={line.id}
            label={line.label}
            plannedAmount={line.plannedAmount}
            actual={line.actual}
            currency={user.currency}
            disabled={isLocked}
            kind="goal"
          />
        ))}
      </BudgetSection>
    </div>
  );
}
