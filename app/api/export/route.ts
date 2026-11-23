import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit";
import { buildExport } from "@/lib/data/portability";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await buildExport(user.id);

  await recordAudit({
    userId: user.id,
    entityType: "account",
    entityId: user.id,
    action: "export",
    after: {
      rows: {
        expenseCategories: data.expenseCategories.length,
        incomeSources: data.incomeSources.length,
        depos: data.depos.length,
        income: data.income.length,
        expenses: data.expenses.length,
        subscriptions: data.subscriptions.length,
        debts: data.debts.length,
        goals: data.goals.length,
        budgets: data.budgets.length,
      },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pocket-watcher-${stamp}.json"`,
    },
  });
}
