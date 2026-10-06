import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { getAuthContext } from "@/lib/rbac/guard";
import { revokeSession } from "@/lib/auth/session";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const ctx = await getAuthContext(request);
  await revokeSession(ctx.sessionId);
  const response = ok({ loggedOut: true });
  clearAuthCookies(response);
  return response;
});
