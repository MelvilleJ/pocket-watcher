import { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "better-auth.dont_remember",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
  "__Secure-better-auth.dont_remember",
  "session",
];

// Server components can't delete cookies, and proxy.ts bounces any request carrying a session cookie
// away from /login. Sending stale sessions here first breaks that /dashboard <-> /login loop.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  for (const name of SESSION_COOKIES) response.cookies.delete(name);
  return response;
}
