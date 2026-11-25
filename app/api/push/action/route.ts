import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyPushAction } from "@/lib/push/tokens";
import { approvePendingById, dismissPendingById } from "@/lib/email/review";

// Called by the service worker when a notification's Add or Dismiss button is pressed.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const action = typeof body?.token === "string" ? verifyPushAction(body.token) : null;
  if (!action) return NextResponse.json({ ok: false, outcome: "invalid" }, { status: 401 });

  const outcome =
    action.action === "add"
      ? await approvePendingById(action.userId, action.pendingId)
      : await dismissPendingById(action.userId, action.pendingId);

  revalidatePath("/dashboard", "layout");
  return NextResponse.json({ ok: outcome === "added" || outcome === "dismissed", outcome });
}
