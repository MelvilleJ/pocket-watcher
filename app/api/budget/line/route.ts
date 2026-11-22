import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { setBudgetLinePlanned } from "@/lib/budgets";
import { BudgetLineSchema } from "@/lib/validation/entities";

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = BudgetLineSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!(await setBudgetLinePlanned(user.id, parsed.data.lineId, parsed.data.plannedAmount))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  revalidatePath("/dashboard/budget");
  return NextResponse.json({ ok: true });
}
