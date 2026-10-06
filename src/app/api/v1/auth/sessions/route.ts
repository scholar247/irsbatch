import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { getAuthContext } from "@/lib/rbac/guard";
import { listActiveSessions } from "@/lib/auth/session";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const ctx = await getAuthContext(request);
  const sessions = await listActiveSessions(ctx.uid);
  // Never return refreshTokenHash to a client, even hashed.
  const sanitized = sessions.map((session) => ({
    id: session.id,
    uid: session.uid,
    deviceLabel: session.deviceLabel,
    userAgent: session.userAgent,
    ip: session.ip,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    isCurrent: session.id === ctx.sessionId,
  }));
  return ok(sanitized);
});
