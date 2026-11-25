import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeOldEmailBodies } from "@/lib/email/process";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const purged = await purgeOldEmailBodies();
  return NextResponse.json({ ok: true, purged });
}
