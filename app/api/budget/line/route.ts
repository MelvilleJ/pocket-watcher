import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgetLines, budgets } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const lineId = String(body?.lineId);
  const amount = Number(body?.plannedAmount);
  if (!lineId || Number.isNaN(amount)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const [line] = await db
    .select({ line: budgetLines, budget: budgets })
    .from(budgetLines)
    .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
    .where(and(eq(budgetLines.id, lineId), eq(budgets.userId, user.id)))
    .limit(1);

  if (!line || line.budget.status === "locked") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await db
    .update(budgetLines)
    .set({ plannedAmount: amount.toFixed(2), updatedAt: new Date() })
    .where(eq(budgetLines.id, lineId));

  revalidatePath("/dashboard/budget");

  return NextResponse.json({ ok: true });
}
