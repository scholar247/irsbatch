import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import { AppError } from "@/lib/api/errors";
import type { Permission, Role } from "@/types/domain";

/**
 * The single authorization boundary for this app (PRD §36: "all checks server-side, never
 * trust client data"). proxy.ts does a cheap unauthenticated-request redirect for page
 * routes, but every Route Handler must call one of these directly — per Next.js's own
 * guidance, a proxy matcher change can silently stop covering a route, so relying on proxy
 * alone is not safe. Web clients send the access token as an httpOnly cookie; the Android
 * client sends `Authorization: Bearer <token>` since it has no cookie jar shared with a
 * browser context.
 */

export interface AuthContext {
  uid: string;
  roles: Role[];
  sessionId: string;
}

function bearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value ?? bearerToken(request.headers.get("authorization"));
  if (!token) throw AppError.unauthorized();

  try {
    const claims = await verifyAccessToken(token);
    return { uid: claims.uid, roles: claims.roles, sessionId: claims.sessionId };
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
}

export async function requirePermission(request: NextRequest, permission: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  const permissions = await getPermissionsForRoles(ctx.roles);
  if (!permissions.has(permission)) {
    throw AppError.forbidden(`Missing permission: ${permission}`);
  }
  return ctx;
}

/**
 * Common "own record vs any record" pattern (member.view.self vs member.view.any). Grants
 * access if the caller owns the resource AND holds the self-scoped permission, OR holds the
 * any-scoped permission regardless of ownership.
 */
export async function requireSelfOrPermission(
  request: NextRequest,
  resourceOwnerUid: string,
  selfPermission: Permission,
  anyPermission: Permission
): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  const permissions = await getPermissionsForRoles(ctx.roles);
  if (ctx.uid === resourceOwnerUid && permissions.has(selfPermission)) return ctx;
  if (permissions.has(anyPermission)) return ctx;
  throw AppError.forbidden();
}

export async function hasPermission(ctx: AuthContext, permission: Permission): Promise<boolean> {
  const permissions = await getPermissionsForRoles(ctx.roles);
  return permissions.has(permission);
}
