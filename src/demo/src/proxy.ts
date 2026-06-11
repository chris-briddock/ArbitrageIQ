import { NextResponse, type NextRequest } from "next/server";

const JWT_COOKIE = "arbiq_jwt";
const REFRESH_COOKIE = "arbiq_refresh";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/mfa"];

/**
 * Gates application pages on session cookie presence (TDD §5.9.1).
 * Full token verification happens in the BFF; this is a fast redirect layer.
 * API routes are excluded — they return RFC 7807 401 responses instead.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has(JWT_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/auth/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic && pathname !== "/auth/mfa") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|js|css|txt|webmanifest)$).*)",
  ],
};
