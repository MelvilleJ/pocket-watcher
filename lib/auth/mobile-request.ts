import "server-only";
import type { NextRequest } from "next/server";
import { verifyMobileToken } from "@/lib/auth/mobile";

export async function authenticateMobileRequest(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  return verifyMobileToken(token);
}
