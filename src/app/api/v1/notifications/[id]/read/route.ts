import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { getAuthContext } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { NotificationRecord } from "@/types/domain";

export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/notifications/[id]/read">) => {
    const auth = await getAuthContext(request);
    const { id } = await ctx.params;
    const ref = collections.notifications().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Notification not found");

    const notification = snap.data() as NotificationRecord;
    if (notification.recipientUid !== auth.uid) throw AppError.forbidden();

    if (!notification.readAt) {
      await ref.update({ readAt: Date.now() });
    }
    return ok({ id, readAt: notification.readAt ?? Date.now() });
  }
);
