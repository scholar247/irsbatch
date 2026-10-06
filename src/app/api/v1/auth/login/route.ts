import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { verifyPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { createSession } from "@/lib/auth/session";
import { setAuthCookies } from "@/lib/auth/cookies";
import { generateId } from "@/lib/db/ids";
import { env } from "@/lib/env";
import type { UserProfile, UserRecord } from "@/types/domain";

const loginSchema = z.object({
  identifier: z.string().min(3), // username OR email
  password: z.string().min(1),
  deviceLabel: z.string().max(80).optional(),
});

/**
 * Deliberately generic error messages ("Invalid credentials") whether the identifier or
 * the password was wrong, and a constant-shape response either way, to avoid leaking which
 * usernames/emails exist (PRD §36: brute-force / enumeration resistance).
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = loginSchema.parse(await request.json());
  const isEmail = body.identifier.includes("@");

  const snapshot = await collections
    .users()
    .where(isEmail ? "email" : "username", "==", body.identifier.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) throw AppError.unauthorized("Invalid credentials");
  const user = snapshot.docs[0].data() as UserRecord;

  if (user.status !== "ACTIVE") throw AppError.forbidden("This account is not active");

  const validPassword = await verifyPassword(body.password, user.passwordHash);
  if (!validPassword) throw AppError.unauthorized("Invalid credentials");

  // Session id is generated up front so both tokens can embed it, then the session record
  // (keyed by that same id) is created with the real refresh token's hash in one write.
  const sessionId = generateId();
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ uid: user.id, roles: user.roles, sessionId }),
    signRefreshToken({ uid: user.id, sessionId }),
  ]);
  const session = await createSession({
    id: sessionId,
    uid: user.id,
    refreshToken,
    deviceLabel: body.deviceLabel ?? "Unknown device",
    userAgent: request.headers.get("user-agent") ?? "unknown",
    ip: request.headers.get("x-forwarded-for") ?? "unknown",
  });

  await collections.users().doc(user.id).update({ lastLoginAt: Date.now() });

  const profile: UserProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    status: user.status,
  };

  const response = ok({ user: profile, accessToken, refreshToken, sessionId: session.id });
  setAuthCookies(
    response,
    { accessToken, refreshToken },
    { access: env.auth.accessTokenTtlSeconds(), refresh: env.auth.refreshTokenTtlSeconds() }
  );
  return response;
});
