import { NextResponse, type NextRequest } from "next/server";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { listAuditLogs } from "@/lib/queries/audit";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  return NextResponse.json(await listAuditLogs(session.userId));
}
