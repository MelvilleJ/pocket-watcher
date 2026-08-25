import { NextResponse, type NextRequest } from "next/server";
import { authenticateMobileRequest } from "@/lib/auth/mobile-request";
import { revokeMobileSession } from "@/lib/auth/mobile";

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await revokeMobileSession(session.sessionId);
  return NextResponse.json({ ok: true });
}
