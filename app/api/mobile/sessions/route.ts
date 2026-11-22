import { NextResponse, type NextRequest } from "next/server";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { listSessions } from "@/lib/queries/audit";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const rows = await listSessions(session.userId);
  const now = new Date();
  return NextResponse.json({
    sessions: rows.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      platform: s.platform,
      lastUsedAt: s.lastUsedAt,
      active: !s.revokedAt && s.expiresAt > now,
      current: s.id === session.sessionId,
    })),
  });
}
