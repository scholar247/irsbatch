import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";
import type { Role } from "@/types/domain";

/**
 * Custom JWT auth (PRD §6) — no Firebase Auth. Access and refresh tokens use separate
 * secrets so a leaked access-token secret can't be used to mint refresh tokens and vice versa.
 * Both are edge/Node-runtime-safe (jose, not jsonwebtoken) so they can be checked cheaply
 * in proxy.ts as well as in Route Handlers.
 */

export interface AccessTokenClaims extends JWTPayload {
  uid: string;
  roles: Role[];
  sessionId: string;
}

export interface RefreshTokenClaims extends JWTPayload {
  uid: string;
  sessionId: string;
}

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(claims: Omit<AccessTokenClaims, "iat" | "exp">): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.auth.accessTokenTtlSeconds()}s`)
    .sign(secretKey(env.auth.accessTokenSecret()));
}

export async function signRefreshToken(claims: Omit<RefreshTokenClaims, "iat" | "exp">): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.auth.refreshTokenTtlSeconds()}s`)
    .sign(secretKey(env.auth.refreshTokenSecret()));
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(env.auth.accessTokenSecret()));
  return payload as AccessTokenClaims;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(env.auth.refreshTokenSecret()));
  return payload as RefreshTokenClaims;
}
