import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { destroyWebSession } from "@/lib/auth/session";
import { deleteAccount } from "@/lib/data/portability";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteAccount(user.id, "web");
  } catch (err) {
    console.error("account deletion failed", err);
    return NextResponse.json({ error: "Deletion failed. Your data is untouched. Try again." }, { status: 500 });
  }

  // The session row is already gone; this only clears the cookie.
  await destroyWebSession();
  return NextResponse.json({ ok: true });
}
