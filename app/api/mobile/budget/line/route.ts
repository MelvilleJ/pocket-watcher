import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { setBudgetLinePlanned } from "@/lib/budgets";
import { BudgetLineSchema } from "@/lib/validation/entities";

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const parsed = BudgetLineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (!(await setBudgetLinePlanned(session.userId, parsed.data.lineId, parsed.data.plannedAmount))) {
    return NextResponse.json({ error: "This budget is locked or no longer exists." }, { status: 409 });
  }

  revalidatePath("/dashboard/budget");
  return NextResponse.json({ ok: true });
}
