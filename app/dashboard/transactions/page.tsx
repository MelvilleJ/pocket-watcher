import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import {
  getDepoNameLookup,
  listDeposWithBalances,
  listTransactions,
  type TransactionRow,
  type TransactionType,
} from "@/lib/queries/depos";
import { getExpenseCategories, getIncomeSources } from "@/lib/queries/lists";
import { deleteTransaction, setExpensePaid } from "@/lib/actions/transactions";
import { TransactionForm } from "@/components/forms/transaction-form";
import { DepoList } from "@/components/depo-list";
import { DepoBadge } from "@/components/depo-icon";
import { DeleteButton } from "@/components/delete-button";
import { PageHero } from "@/components/page-hero";

const TYPE_FILTERS: { value?: TransactionType; label: string }[] = [
  { label: "All" },
  { value: "income", label: "In" },
  { value: "expense", label: "Out" },
  { value: "transfer", label: "Transfers" },
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupByDay(rows: TransactionRow[]) {
  const groups: { key: string; date: Date; rows: TransactionRow[] }[] = [];
  for (const row of rows) {
    const key = dayKey(row.date);
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, date: row.date, rows: [row] });
  }
  return groups;
}

function filterHref(params: { depo?: string; type?: string }) {
  const search = new URLSearchParams();
  if (params.depo) search.set("depo", params.depo);
  if (params.type) search.set("type", params.type);
  const query = search.toString();
  return query ? `/dashboard/transactions?${query}` : "/dashboard/transactions";
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ depo?: string; type?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [depos, lookup, categories, sources] = await Promise.all([
    listDeposWithBalances(user.id),
    getDepoNameLookup(user.id),
    getExpenseCategories(user.id),
    getIncomeSources(user.id),
  ]);

  const activeDepo = depos.find((d) => d.id === params.depo);
  const activeType = TYPE_FILTERS.find((f) => f.value && f.value === params.type)?.value;
  const rows = await listTransactions(user.id, { depoId: activeDepo?.id, type: activeType });
  const groups = groupByDay(rows);

  const total = depos.reduce((sum, d) => sum + d.balance, 0);
  const now = new Date();
  const thisMonth = rows.filter(
    (r) => r.date.getFullYear() === now.getFullYear() && r.date.getMonth() === now.getMonth()
  );
  const monthIn = thisMonth.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const monthOut = thisMonth.reduce((s, r) => {
    if (r.type === "expense") return r.paid ? s + r.amount : s;
    return s + r.fee;
  }, 0);

  const depoChip = (id: string | null) => {
    const depo = id ? lookup.get(id) : undefined;
    if (!depo) return <span className="txn-chip txn-chip-empty">No depo</span>;
    return (
      <span className="txn-chip" style={{ "--depo-color": depo.color } as React.CSSProperties}>
        <span className="txn-chip-dot" />
        <span className="truncate">{depo.name}</span>
      </span>
    );
  };

  return (
    <div className="page-accent-transactions flex flex-col gap-5">
      <PageHero
        title="Transactions"
        description="Log money in, money out, and moves between your depos, all in one place."
        iconPath="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"
        stats={[
          { label: activeDepo ? activeDepo.name : "Across depos", value: formatCurrency(activeDepo?.balance ?? total, user.currency) },
          { label: "In this month", value: formatCurrency(monthIn, user.currency) },
          { label: "Out this month", value: formatCurrency(monthOut, user.currency) },
        ]}
      />

      <section className="txn-log">
        <TransactionForm
          key={activeDepo?.id ?? "all"}
          depos={depos.map(({ id, name, color, icon }) => ({ id, name, color, icon }))}
          categories={categories}
          sources={sources}
          defaultDepoId={activeDepo?.id}
        />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3.5">
            <h2 className="text-sm">
              {activeDepo ? (
                <span className="inline-flex items-center gap-2">
                  <DepoBadge icon={activeDepo.icon} color={activeDepo.color} size="sm" />
                  {activeDepo.name}
                  <Link href={filterHref({ type: activeType })} className="txn-clear" scroll={false}>
                    Clear
                  </Link>
                </span>
              ) : (
                "All transactions"
              )}
            </h2>
            <nav className="txn-filters" aria-label="Filter by type">
              {TYPE_FILTERS.map((f) => (
                <Link
                  key={f.label}
                  href={filterHref({ depo: activeDepo?.id, type: f.value })}
                  className={`txn-filter ${activeType === f.value ? "is-active" : ""}`}
                  scroll={false}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>

          {groups.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[color:var(--muted)]">
              Nothing logged {activeDepo ? `for ${activeDepo.name} ` : ""}yet. Use the form above to add your first transaction.
            </p>
          ) : (
            <ol className="flex flex-col">
              {groups.map((group) => (
                <li key={group.key}>
                  <p className="txn-day">{formatDay(group.date)}</p>
                  <ul>
                    {group.rows.map((row) => (
                      <li key={`${row.type}-${row.id}`} className="txn-row">
                        <span className={`txn-type txn-type-${row.type}`} aria-hidden="true">
                          {row.type === "income" ? "↓" : row.type === "expense" ? "↑" : "⇄"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold text-[color:var(--foreground)] ${row.type === "transfer" ? "" : "truncate"}`}
                          >
                            {row.type === "transfer" ? (
                              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                {depoChip(row.depoId)} <span className="text-[color:var(--muted-soft)]">→</span> {depoChip(row.toDepoId)}
                              </span>
                            ) : (
                              row.title
                            )}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--muted)]">
                            {row.type !== "transfer" && depoChip(row.depoId)}
                            {row.description && <span className="truncate">{row.description}</span>}
                            {row.type === "income" && row.appliedMonth && (
                              <span className="text-[color:var(--muted-soft)]">for {row.appliedMonth}</span>
                            )}
                            {row.type === "expense" && !row.paid && <span className="txn-unpaid">Unpaid</span>}
                            {row.fee > 0 && (
                              <span className="txn-fee">+{formatCurrency(row.fee, user.currency)} fee</span>
                            )}
                          </p>
                        </div>
                        <div className="txn-row-end">
                          <span className={`txn-amount-value txn-amount-${row.type}`}>
                            {row.type === "income" ? "+" : row.type === "expense" ? "−" : ""}
                            {formatCurrency(row.amount, user.currency)}
                          </span>
                          {row.type === "expense" && (
                            <form action={setExpensePaid.bind(null, row.id, !row.paid)}>
                              <button type="submit" className="text-xs font-medium text-[color:var(--muted)] hover:underline">
                                {row.paid ? "Mark unpaid" : "Mark paid"}
                              </button>
                            </form>
                          )}
                          <DeleteButton action={deleteTransaction.bind(null, row.type, row.id)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-baseline justify-between border-b border-[color:var(--border)] px-5 py-3.5">
            <h2 className="text-sm">Depos</h2>
            <span className="text-xs font-medium tabular-nums text-[color:var(--muted-soft)]">
              {formatCurrency(total, user.currency)}
            </span>
          </div>
          <DepoList depos={depos} currency={user.currency} activeDepoId={activeDepo?.id} />
        </section>
      </div>
    </div>
  );
}
