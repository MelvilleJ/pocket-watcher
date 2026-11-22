import { NextResponse, type NextRequest } from "next/server";
import { authenticateMobileRequest, periodParams, unauthorized } from "@/lib/auth/mobile-request";
import { getCalendarMonths, getEarliestActivityYear } from "@/lib/queries/calendar";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const currentYear = new Date().getFullYear();
  const earliestYear = Math.min(await getEarliestActivityYear(session.userId), currentYear);
  const years = Array.from({ length: currentYear - earliestYear + 1 }, (_, i) => currentYear - i);
  const { year: requested } = periodParams(request);
  const year = years.includes(requested) ? requested : currentYear;

  return NextResponse.json({ year, years, months: await getCalendarMonths(session.userId, year) });
}
