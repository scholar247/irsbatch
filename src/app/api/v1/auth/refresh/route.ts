import { z } from "zod";
import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { REFRESH_COOKIE, setAuthCookies } from "@/lib/auth/cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { rotateSession } from "@/lib/auth/session";
import { collections } from "@/lib/db/collections";
import { env } from "@/lib/env";
import type { UserRecord } from "@/types/domain";

const bodySchema = z.object({ refreshToken: z.string().optional() });

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = bodySchema.parse(request.headers.get("content-length") === "0" ? {} : await request.json().catch(() => ({})));
  const presented = request.cookies.get(REFRESH_COOKIE)?.value ?? body.refreshToken;
  if (!presented) throw AppError.unauthorized("No refresh token presented");

  let claims;
  try {
    claims = await verifyRefreshToken(presented);
  } catch {
    throw AppError.unauthorized("Refresh token is invalid or expired");
  }

  const newRefreshToken = await signRefreshToken({ uid: claims.uid, sessionId: claims.sessionId });
  await rotateSession(claims.sessionId, presented, newRefreshToken);

  const userSnap = await collections.users().doc(claims.uid).get();
  if (!userSnap.exists) throw AppError.unauthorized("Account no longer exists");
  const user = userSnap.data() as UserRecord;
  if (user.status !== "ACTIVE") throw AppError.forbidden("This account is not active");

  const accessToken = await signAccessToken({ uid: user.id, roles: user.roles, sessionId: claims.sessionId });

  const response = ok({ accessToken, refreshToken: newRefreshToken });
  setAuthCookies(
    response,
    { accessToken, refreshToken: newRefreshToken },
    { access: env.auth.accessTokenTtlSeconds(), refresh: env.auth.refreshTokenTtlSeconds() }
  );
  return response;
});
