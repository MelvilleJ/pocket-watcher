import { requireUser } from "@/lib/auth/dal";
import { listGoalsForUser } from "@/lib/queries/goals";
import { GoalsRoadmapPlanner } from "@/components/goals-roadmap-planner";
import { GoalForm } from "@/components/forms/goal-form";
import { GoalContributionForm } from "@/components/forms/goal-contribution-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteGoalPayment } from "@/lib/actions/goals";
import { db } from "@/lib/db";
import { goalPayments } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function GoalsPage() {
  const user = await requireUser();
  const rows = await listGoalsForUser(user.id);
  const paymentRows = await db
    .select()
    .from(goalPayments)
    .where(and(eq(goalPayments.userId, user.id), isNull(goalPayments.deletedAt)))
    .orderBy(desc(goalPayments.date))
    .limit(100);

  const goals = rows.map((r) => ({
    id: r.id,
    name: r.name,
    targetAmount: Number(r.targetAmount),
    currentSaved: Number(r.currentSaved),
    minMonthlyContribution: Number(r.minMonthlyContribution),
  }));

  const minTotal = goals.reduce((s, g) => s + g.minMonthlyContribution, 0);
  const goalNameById = new Map(goals.map((goal) => [goal.id, goal.name]));
  const payments = paymentRows.filter((payment) => goalNameById.has(payment.goalId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Goals Roadmap</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Plan how your monthly savings allocation completes your goals.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create a goal</h2>
        <div className="mt-3">
          <GoalForm />
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Goal</th>
              <th className="px-4 py-3 font-medium text-right">Saved</th>
              <th className="px-4 py-3 font-medium text-right">Target</th>
              <th className="px-4 py-3 font-medium text-right">Progress</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => {
              const progress = goal.targetAmount === 0 ? 0 : (goal.currentSaved / goal.targetAmount) * 100;
              return (
                <tr key={goal.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-4 py-2 font-medium">{goal.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(goal.currentSaved, user.currency)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(goal.targetAmount, user.currency)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{progress.toFixed(0)}%</td>
                </tr>
              );
            })}
            {goals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No goals logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Record a payment</h2>
        <GoalContributionForm goals={goals.map((goal) => ({ id: goal.id, name: goal.name }))} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Goal</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2">{payment.date.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2">{goalNameById.get(payment.goalId) ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-500">{payment.description}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(Number(payment.amount), user.currency)}</td>
                <td className="px-4 py-2 text-right">
                  <DeleteButton action={deleteGoalPayment.bind(null, payment.id)} />
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No payments recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <GoalsRoadmapPlanner goals={goals} currency={user.currency} minTotalContribution={minTotal} />
    </div>
  );
}
