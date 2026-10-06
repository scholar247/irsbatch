import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import type { AuthContext } from "@/lib/rbac/guard";
import type { Permission } from "@/types/domain";

/**
 * Server Component equivalent of src/lib/rbac/guard.ts (which is for Route Handlers, which
 * receive a NextRequest). Server Components instead read cookies via next/headers. Used to
 * gate page rendering server-side; proxy.ts already redirects unauthenticated requests away
 * from /dashboard, but per Next's own guidance a proxy matcher can silently stop covering a
 * route, so every protected page re-checks here too.
 */
export async function getServerAuthContext(): Promise<AuthContext> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) redirect("/login");

  try {
    const claims = await verifyAccessToken(token);
    return { uid: claims.uid, roles: claims.roles, sessionId: claims.sessionId };
  } catch {
    redirect("/login");
  }
}

/** Server Component gate for admin-only pages: redirects to /dashboard rather than rendering when the permission is missing. */
export async function requireServerPermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getServerAuthContext();
  const permissions = await getPermissionsForRoles(ctx.roles);
  if (!permissions.has(permission)) redirect("/dashboard");
  return ctx;
}
