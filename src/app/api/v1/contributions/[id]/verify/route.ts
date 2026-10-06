import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { Contribution } from "@/types/domain";

/** Verification is a maker-checker confirmation step — it never re-touches the ledger, which was already written at record time. */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/contributions/[id]/verify">) => {
    const auth = await requirePermission(request, "contribution.verify");
    const { id } = await ctx.params;
    const ref = collections.contributions().doc(id);

    const updated = await db().runTransaction<Contribution>(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Contribution not found");
      const current = snap.data() as Contribution;
      if (current.status !== "RECORDED") {
        throw AppError.conflict(`Cannot verify a contribution in status ${current.status}`);
      }
      if (current.recordedBy === auth.uid) {
        throw AppError.forbidden("The recording clerk cannot also verify their own entry (maker-checker)");
      }

      const next: Contribution = { ...current, status: "VERIFIED", verifiedBy: auth.uid, verifiedAt: Date.now() };
      tx.set(ref, next);
      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "CONTRIBUTION_VERIFIED",
        entityCollection: "contributions",
        entityId: id,
        before: { status: current.status },
        after: { status: next.status },
      });
      return next;
    });

    return ok(updated);
  }
);
