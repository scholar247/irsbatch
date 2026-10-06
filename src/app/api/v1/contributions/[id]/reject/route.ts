import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { readFundAggregate, writeLedgerEntry } from "@/lib/db/ledger";
import { writeAuditLog } from "@/lib/db/audit";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { Contribution, Member } from "@/types/domain";

const rejectSchema = z.object({ reason: z.string().min(5).max(500) });

/**
 * Rejecting a RECORDED contribution reverses money that was already ledgered. Per PRD §18
 * ("do not overwrite history... corrections create adjustment entries"), this never deletes
 * or mutates the original CONTRIBUTION ledger row — it appends a negative ADJUSTMENT entry
 * that references it, so the full history stays reconstructable.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/contributions/[id]/reject">) => {
    const auth = await requirePermission(request, "contribution.verify");
    const { id } = await ctx.params;
    const { reason } = rejectSchema.parse(await request.json());
    const ref = collections.contributions().doc(id);

    // Independent (non-transactional) lookup of the original ledger entry, done up front so
    // it never interleaves with the transaction's own read/write ordering requirements.
    const originalLedgerQuery = await collections
      .financialTransactions()
      .where("referenceCollection", "==", "contributions")
      .where("referenceId", "==", id)
      .limit(1)
      .get();
    const originalLedgerId = originalLedgerQuery.docs[0]?.id ?? id;

    const updated = await db().runTransaction<Contribution>(async (tx) => {
      // --- reads first ---
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Contribution not found");
      const current = snap.data() as Contribution;
      if (current.status !== "RECORDED" && current.status !== "VERIFIED") {
        throw AppError.conflict(`Cannot reject a contribution in status ${current.status}`);
      }

      const memberRef = collections.members().doc(current.memberId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) throw AppError.notFound("Member not found");
      const member = memberSnap.data() as Member;

      const fund = await readFundAggregate(tx);

      // --- writes only from here ---
      const next: Contribution = {
        ...current,
        status: "REJECTED",
        rejectionReason: reason,
        verifiedBy: auth.uid,
        verifiedAt: Date.now(),
      };
      tx.set(ref, next);

      writeLedgerEntry(tx, fund, {
        type: "ADJUSTMENT",
        amount: -current.amount,
        memberId: current.memberId,
        referenceId: id,
        referenceCollection: "contributions",
        description: `Reversal of rejected contribution: ${reason}`,
        createdBy: auth.uid,
        correctsTransactionId: originalLedgerId,
      });

      tx.update(memberRef, {
        "aggregates.totalContributed": member.aggregates.totalContributed - current.amount,
        "aggregates.contributionMonthsCount": Math.max(0, member.aggregates.contributionMonthsCount - 1),
        updatedAt: Date.now(),
      });

      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "CONTRIBUTION_REJECTED",
        entityCollection: "contributions",
        entityId: id,
        before: { status: current.status },
        after: { status: next.status, reason },
      });

      return next;
    });

    return ok(updated);
  }
);
