import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getCategoryBreakdown, getMoneyInOutSummary, getMonthByMonthSummary } from "@/lib/queries/summary";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listDeposWithBalances } from "@/lib/queries/depos";
import { depoKindLabel } from "@/lib/depos";
import { DepoBadge } from "@/components/depo-icon";
import { FocalPanel } from "@/components/focal-panel";
import { Money } from "@/components/money";
import { PageHero } from "@/components/page-hero";
import { MoneyFlowChart } from "@/components/charts/money-flow-chart";
import { ExpensePieChart } from "@/components/charts/expense-pie-chart";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[color:var(--border)] px-5 py-3.5">
      <h2 className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">{title}</h2>
      {subtitle && <span className="text-xs font-medium text-[color:var(--muted-soft)]">{subtitle}</span>}
    </div>
  );
}

export default async function SummaryPage() {
  const user = await requireUser();

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const nextMonth = new Date(year, monthIndex + 1, 1);

  const [{ selected, ytd }, months, categories, debts, depos] = await Promise.all([
    getMoneyInOutSummary(user.id, year, monthIndex),
    getMonthByMonthSummary(user.id, year),
    getCategoryBreakdown(user.id, year, monthIndex),
    getDebtsWithBalances(user.id),
    listDeposWithBalances(user.id),
  ]);

  const savingsRate = Number(user.savingsRate);
  const net = selected.net;
  const savings = net > 0 ? net * savingsRate : 0;
  const funMoney = net > 0 ? net - savings : 0;
  const outstandingDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const depoTotal = depos.reduce((sum, d) => sum + d.balance, 0);

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

  const ytdRows: { label: string; value: number; strong?: boolean; positive?: boolean }[] = [
    { label: "Income", value: ytd.income },
    { label: "Expenses", value: ytd.expenses },
    { label: "Subscriptions", value: ytd.subscriptions },
    { label: "Debt payments", value: ytd.debtPayments },
  ];

  const spentShare = selected.income > 0 ? selected.totalOut / selected.income : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={`${MONTH_NAMES[monthIndex]} ${year}`}
        description="Calculated from your transactions, subscriptions and debts. Set aside and fun money split this month's net at your savings rate."
      />

      <FocalPanel
        label="Net this month"
        value={
          <Money
            currency={user.currency}
            amount={net}
            className={`money-display ${net >= 0 ? "text-[color:var(--status-good)]" : "text-[color:var(--status-critical)]"}`}
          />
        }
        rows={[
          {
            label: "Income",
            value: <Money currency={user.currency} amount={selected.income} className="text-[color:var(--status-good)]" />,
          },
          { label: "Money out", value: <Money currency={user.currency} amount={selected.totalOut} /> },
          {
            label: `Set aside (${Math.round(savingsRate * 100)}%)`,
            value: <Money currency={user.currency} amount={savings} />,
          },
          { label: "Fun money", value: <Money currency={user.currency} amount={funMoney} /> },
        ]}
        progress={selected.income > 0 ? Math.min(spentShare, 1) : undefined}
        progressLabel={
          selected.income > 0 ? `${Math.round(spentShare * 100)}% of this month's income spent` : undefined
        }
      />

      <div className="glance-grid">
        <Link href="/dashboard/transactions" className="glance-card">
          <span className="glance-label">Across your depos</span>
          <Money
            currency={user.currency}
            amount={depoTotal}
            className={`money-display glance-value ${depoTotal < 0 ? "text-[color:var(--status-critical)]" : ""}`}
          />
          <span className="glance-detail">
            {depos.length} depo{depos.length === 1 ? "" : "s"}. Open transactions
          </span>
        </Link>
        <Link href="/dashboard/debts" className="glance-card">
          <span className="glance-label">Outstanding debt</span>
          <Money
            currency={user.currency}
            amount={outstandingDebt}
            className={`money-display glance-value ${outstandingDebt > 0 ? "text-[color:var(--status-critical)]" : "text-[color:var(--status-good)]"}`}
          />
          <span className="glance-detail">
            {debts.length > 0 ? `${debts.length} debt${debts.length === 1 ? "" : "s"}. Open the payoff roadmap` : "No debts logged"}
          </span>
        </Link>
        <Link
          href={`/dashboard/budget?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth()}`}
          className="glance-card"
        >
          <span className="glance-label">Next month</span>
          <span className="glance-value glance-text">{MONTH_NAMES[nextMonth.getMonth()]}</span>
          <span className="glance-detail">Plan the budget before it starts</span>
        </Link>
      </div>

      <section>
        <SectionHeader title={`Money in vs money out each month, ${year}`} />
        <div className="p-5">
          <MoneyFlowChart data={chartData} currency={user.currency} year={year} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeader title={`Where ${MONTH_NAMES[monthIndex]}'s spending went`} />
          <div className="p-5">
            {categoryChartData.length > 0 ? (
              <ExpensePieChart data={categoryChartData} currency={user.currency} />
            ) : (
              <p className="text-sm text-[color:var(--muted)]">No expenses logged this month yet.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col">
          <SectionHeader title="Year to date" subtitle={String(year)} />
          <div className="flex flex-1 flex-col">
            <dl className="flex flex-col">
              {ytdRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-2.5 text-sm"
                >
                  <dt className="text-[color:var(--muted)]">{row.label}</dt>
                  <dd className="font-medium tabular-nums text-[color:var(--foreground)]">
                    {formatCurrency(row.value, user.currency)}
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-sm font-semibold text-[color:var(--foreground)]">Net</dt>
                <dd
                  className={`text-[15px] font-bold tabular-nums ${
                    ytd.net >= 0 ? "text-[color:var(--status-good)]" : "text-[color:var(--status-critical)]"
                  }`}
                >
                  {formatCurrency(ytd.net, user.currency)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="Where your money is" subtitle={`${formatCurrency(depoTotal, user.currency)} across ${depos.length} depo${depos.length === 1 ? "" : "s"}`} />
        {depos.length > 0 ? (
          <div className="depo-cards">
            {depos.map((depo) => (
              <Link
                key={depo.id}
                href={`/dashboard/transactions?depo=${depo.id}`}
                className="depo-card"
                style={{ "--depo-color": depo.color } as React.CSSProperties}
              >
                <div className="flex items-center gap-2.5">
                  <DepoBadge icon={depo.icon} color={depo.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{depo.name}</p>
                    <p className="text-[11px] text-[color:var(--muted-soft)]">{depoKindLabel(depo.kind)}</p>
                  </div>
                </div>
                <p
                  className={`depo-card-balance ${depo.balance < 0 ? "text-[color:var(--status-critical)]" : ""}`}
                >
                  {formatCurrency(depo.balance, user.currency)}
                </p>
                <span className="depo-card-share" aria-hidden="true">
                  <span style={{ width: `${depoTotal > 0 ? Math.max(0, Math.min(100, (depo.balance / depoTotal) * 100)) : 0}%` }} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
            <p className="text-sm text-[color:var(--muted)]">
              Add depos like cash in hand, your bank, or a credit union to see where your money sits.
            </p>
            <Link href="/dashboard/transactions" className="text-sm font-medium underline">
              Set up depos
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
