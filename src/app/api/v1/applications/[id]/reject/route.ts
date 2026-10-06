import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { MembershipApplication } from "@/types/domain";

const rejectSchema = z.object({ reason: z.string().min(5).max(500) });

export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/applications/[id]/reject">) => {
    const auth = await requirePermission(request, "application.review");
    const { id } = await ctx.params;
    const { reason } = rejectSchema.parse(await request.json());
    const ref = collections.membershipApplications().doc(id);

    const application = await db().runTransaction<MembershipApplication>(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Application not found");
      const current = snap.data() as MembershipApplication;
      if (current.status === "APPROVED" || current.status === "REJECTED") {
        throw AppError.conflict(`Application already ${current.status.toLowerCase()}`);
      }

      const updated: MembershipApplication = {
        ...current,
        status: "REJECTED",
        reviewedBy: auth.uid,
        reviewedAt: Date.now(),
        rejectionReason: reason,
        updatedAt: Date.now(),
      };
      tx.set(ref, updated);
      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "APPLICATION_REJECTED",
        entityCollection: "membershipApplications",
        entityId: id,
        before: { status: current.status },
        after: { status: updated.status, reason },
      });
      return updated;
    });

    await dispatchNotification({
      recipientUid: application.id,
      recipientEmail: application.contact.email,
      event: "MEMBERSHIP_REJECTED",
      title: "Update on your membership application",
      body: reason,
      channels: ["IN_APP", "EMAIL"],
    });

    return ok({ id: application.id, status: application.status });
  }
);
