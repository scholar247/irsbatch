import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

/**
 * UX-layer gate only: redirects a browser with no access-token cookie away from protected
 * pages before React even renders. This is NOT the security boundary — it only checks that
 * a cookie is present, not that it's valid, and Next.js is explicit that a proxy matcher can
 * silently stop covering a route after a refactor. The real authorization boundary is
 * src/lib/rbac/guard.ts, called from every Route Handler independently of this file.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(ACCESS_COOKIE);
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/staff/:path*"],
};
