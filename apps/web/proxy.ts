import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "argus_session";

/**
 * Fast, DB-free gate for signed-in areas: no session cookie → 307 to /login
 * with a return path. Pages still validate the session server-side.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/syndicate/:path*", "/history/:path*", "/account/:path*"],
};
