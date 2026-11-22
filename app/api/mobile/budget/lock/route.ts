import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { setBudgetLocked } from "@/lib/budgets";

const LockSchema = z.object({ budgetId: z.uuid(), locked: z.boolean() });

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const parsed = LockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await setBudgetLocked(session.userId, parsed.data.budgetId, parsed.data.locked, "mobile");
  revalidatePath("/dashboard/budget");
  return NextResponse.json({ ok: true });
}
