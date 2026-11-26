"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export async function logout() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  redirect("/login");
}
