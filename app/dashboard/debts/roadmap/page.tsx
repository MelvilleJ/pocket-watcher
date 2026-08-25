import { requireUser } from "@/lib/auth/dal";
import { getDebtsWithBalances } from "@/lib/queries/debts";
import { DebtRoadmapPlanner } from "@/components/debt-roadmap-planner";

export default async function DebtRoadmapPage() {
  const user = await requireUser();
  const debts = await getDebtsWithBalances(user.id);

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
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Debt Roadmap</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Compare payoff strategies and see how extra payments change your debt-free date.
        </p>
      </div>

      <DebtRoadmapPlanner
        debts={roadmapInput}
        currency={user.currency}
        minTotalPayment={minTotalPayment}
      />
    </div>
  );
}
