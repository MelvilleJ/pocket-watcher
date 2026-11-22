import { NextResponse, type NextRequest } from "next/server";
import { authenticateMobileRequest, periodParams, unauthorized } from "@/lib/auth/mobile-request";
import { getBudgetView } from "@/lib/budgets";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const { year, monthIndex } = periodParams(request);
  const view = await getBudgetView(session.userId, year, monthIndex, "mobile");
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(view);
}
