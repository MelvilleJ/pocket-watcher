import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getCategoryBreakdown, getMoneyInOutSummary, getMonthByMonthSummary } from "@/lib/queries/summary";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { listDeposWithBalances } from "@/lib/queries/depos";
import { depoKindLabel } from "@/lib/depos";
import { DepoBadge } from "@/components/depo-icon";
import { StatTile } from "@/components/stat-tile";
import { PageHero } from "@/components/page-hero";
import { MoneyFlowChart } from "@/components/charts/money-flow-chart";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TileIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
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

  return (
    <div className="page-accent-summary flex flex-col gap-6">
      <PageHero
        title={`${MONTH_NAMES[monthIndex]} ${year}`}
        description="Everything here is calculated from your Transactions, Subscriptions, and Debts logs."
        iconPath="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7"
        stats={[
          { label: "Across depos", value: formatCurrency(depoTotal, user.currency) },
          { label: "Net this month", value: formatCurrency(net, user.currency) },
        ]}
      />

      <section className="stat-grid grid">
        <StatTile
          label="Income"
          value={formatCurrency(selected.income, user.currency)}
          accent="var(--status-good)"
          icon={<TileIcon path="M12 4v14m0 0 5-5m-5 5-5-5M5 21h14" />}
        />
        <StatTile
          label="Money out"
          value={formatCurrency(selected.totalOut, user.currency)}
          accent="var(--status-critical)"
          icon={<TileIcon path="M12 20V6m0 0-5 5m5-5 5 5M5 3h14" />}
        />
        <StatTile
          label="Net"
          value={formatCurrency(net, user.currency)}
          tone={net >= 0 ? "good" : "critical"}
          accent={net >= 0 ? "var(--status-good)" : "var(--status-critical)"}
          icon={<TileIcon path="M3 16.5 9.5 10l3.5 3.5L21 6m0 0h-5.5M21 6v5.5" />}
        />
        <StatTile
          label="Savings"
          value={formatCurrency(savings, user.currency)}
          accent="var(--primary)"
          icon={<TileIcon path="M12 3v18M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
        />
        <StatTile
          label="Fun money"
          value={formatCurrency(funMoney, user.currency)}
          accent="var(--aqua)"
          icon={<TileIcon path="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9 12 3.5ZM5 4.5v3M3.5 6h3M18.5 15.5v3M17 17h3" />}
        />
        <StatTile
          label="Outstanding debt"
          value={formatCurrency(outstandingDebt, user.currency)}
          tone={outstandingDebt > 0 ? "critical" : "good"}
          accent="var(--status-critical)"
          icon={<TileIcon path="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5v5.5M12 16.5h.01" />}
        />
      </section>

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
              Set up depos →
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={`${year} money in / money out`} subtitle="Month by month" />
        <div className="p-5">
          <MoneyFlowChart data={chartData} currency={user.currency} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeader title="Expenses by category" subtitle={MONTH_NAMES[monthIndex]} />
          <div className="p-5">
            {categoryChartData.length > 0 ? (
              <CategoryBreakdownChart data={categoryChartData} currency={user.currency} />
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
            <div className="mt-auto flex flex-col gap-2 px-5 pb-5 pt-4">
              <Link href={`/dashboard/budget?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth()}`} className="text-sm font-medium text-[color:var(--primary-deep)] underline decoration-[color:var(--border-strong)] underline-offset-4 hover:decoration-current">
                Plan next month&apos;s budget →
              </Link>
              <Link href="/dashboard/debts" className="text-sm font-medium text-[color:var(--primary-deep)] underline decoration-[color:var(--border-strong)] underline-offset-4 hover:decoration-current">
                Plan your debt payoff roadmap →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
