import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
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

  // The session row went with the account; this only clears the browser's cookies.
  const response = NextResponse.json({ ok: true });
  for (const name of ["better-auth.session_token", "better-auth.session_data", "__Secure-better-auth.session_token", "__Secure-better-auth.session_data"]) {
    response.cookies.delete(name);
  }
  return response;
}
