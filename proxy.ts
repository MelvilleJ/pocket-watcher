import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/signup"];

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = request.cookies.get("session")?.value;
  const isPublicRoute = publicRoutes.includes(path);

  if (!hasSession && !isPublicRoute && path !== "/") {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
