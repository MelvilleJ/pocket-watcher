import { NextResponse } from "next/server";

// Server components can't delete cookies, and proxy.ts bounces any request carrying a session cookie
// away from /login. Sending stale sessions here first breaks that /dashboard <-> /login loop.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("session");
  return response;
}
