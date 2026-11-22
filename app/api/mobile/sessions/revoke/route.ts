import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { revokeUserSession } from "@/lib/settings";

const RevokeSchema = z.object({ sessionId: z.uuid() });

export async function POST(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const parsed = RevokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await revokeUserSession(session.userId, parsed.data.sessionId);
  return NextResponse.json({ ok: true });
}
