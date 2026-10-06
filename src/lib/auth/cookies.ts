import type { NextResponse } from "next/server";
import { isProduction } from "@/lib/env";

/**
 * Web clients authenticate via httpOnly cookies (immune to XSS token theft). The Android
 * client authenticates via the same tokens passed as `Authorization: Bearer <access>` plus
 * a `X-Refresh-Token` header on refresh calls — see src/lib/rbac/guard.ts for how both
 * paths are read back. Never store tokens in localStorage on web.
 */

export const ACCESS_COOKIE = "irsb_at";
export const REFRESH_COOKIE = "irsb_rt";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: "strict" as const,
  path: "/",
};

export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
  ttlSeconds: { access: number; refresh: number }
) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: ttlSeconds.access,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: ttlSeconds.refresh,
    path: "/api/v1/auth", // refresh cookie only ever needs to be sent to auth endpoints
  });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...baseCookieOptions, maxAge: 0, path: "/api/v1/auth" });
}
