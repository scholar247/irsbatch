import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { requireSelfOrPermission } from "@/lib/rbac/guard";
import { collections } from "@/lib/db/collections";
import { revokeSession } from "@/lib/auth/session";
import type { SessionRecord } from "@/types/domain";

export const DELETE = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/auth/sessions/[id]">) => {
    const { id } = await ctx.params;
    const snap = await collections.sessions().doc(id).get();
    if (!snap.exists) throw AppError.notFound("Session not found");
    const session = snap.data() as SessionRecord;

    await requireSelfOrPermission(request, session.uid, "session.manage.self", "session.manage.any");
    await revokeSession(id);
    return ok({ revoked: true });
  }
);
