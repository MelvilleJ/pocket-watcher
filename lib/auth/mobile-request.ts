import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { verifyMobileToken } from "@/lib/auth/mobile";

export async function authenticateMobileRequest(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  return verifyMobileToken(token);
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export function periodParams(request: NextRequest) {
  const now = new Date();
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));
  return {
    year: Number.isInteger(year) && year >= 1970 && year <= 9999 ? year : now.getFullYear(),
    monthIndex: Number.isInteger(month) && month >= 0 && month <= 11 && request.nextUrl.searchParams.has("month")
      ? month
      : now.getMonth(),
  };
}
