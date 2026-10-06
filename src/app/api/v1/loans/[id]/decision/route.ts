import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { ok, withErrorHandling } from "@/lib/api/response";
import { getAuthContext } from "@/lib/rbac/guard";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import { getApprovalChain } from "@/lib/loans/approvalChain";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { Loan, LoanApprovalStep, LoanStatus } from "@/types/domain";

/**
 * One step of the configurable maker-checker chain (PRD §17: Member -> Clerk -> Secretary
 * -> President, chain length/order pulled from societySettings/approvalChains). Each role
 * in the chain may act exactly once per loan, and only when it's their turn — this is
 * enforced by comparing `loan.approvalTrail.length` (the next step index) against the
 * chain, not by trusting anything the client sends.
 */
const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(500).optional(),
  approvedAmount: z.number().positive().max(10_000_000).optional(),
});

export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/loans/[id]/decision">) => {
    const auth = await getAuthContext(request);
    const permissions = await getPermissionsForRoles(auth.roles);
    if (!permissions.has("loan.review") && !permissions.has("loan.approve")) {
      throw AppError.forbidden("Missing permission: loan.review or loan.approve");
    }

    const { id } = await ctx.params;
    const body = decisionSchema.parse(await request.json());
    const chain = await getApprovalChain("loan");
    const ref = collections.loans().doc(id);

    const updated = await db().runTransaction<Loan>(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Loan not found");
      const loan = snap.data() as Loan;
      if (loan.status !== "SUBMITTED" && loan.status !== "UNDER_REVIEW") {
        throw AppError.conflict(`Cannot record a decision on a loan in status ${loan.status}`);
      }

      const stepIndex = loan.approvalTrail.length;
      const expectedRole = chain[stepIndex];
      if (!expectedRole) throw AppError.conflict("Approval chain is already complete for this loan");
      if (!auth.roles.includes(expectedRole)) {
        throw AppError.forbidden(`This loan is awaiting a decision from role ${expectedRole}`);
      }
      if (loan.approvalTrail.some((step) => step.uid === auth.uid)) {
        throw AppError.forbidden("You have already recorded a decision on this loan");
      }

      const step: LoanApprovalStep = {
        role: expectedRole,
        uid: auth.uid,
        decision: body.decision,
        comment: body.comment ?? null,
        at: Date.now(),
      };
      const approvalTrail = [...loan.approvalTrail, step];

      let nextStatus: LoanStatus;
      let approvedAmount = loan.approvedAmount;
      if (body.decision === "REJECTED") {
        nextStatus = "REJECTED";
      } else if (stepIndex + 1 === chain.length) {
        nextStatus = "APPROVED";
        approvedAmount = body.approvedAmount ?? loan.requestedAmount;
      } else {
        nextStatus = "UNDER_REVIEW";
      }

      const next: Loan = { ...loan, status: nextStatus, approvalTrail, approvedAmount, updatedAt: Date.now() };
      tx.set(ref, next);
      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: `LOAN_DECISION_${body.decision}`,
        entityCollection: "loans",
        entityId: id,
        before: { status: loan.status, approvalTrail: loan.approvalTrail },
        after: { status: next.status, approvalTrail: next.approvalTrail },
      });
      return next;
    });

    if (updated.status === "APPROVED" || updated.status === "REJECTED") {
      await dispatchNotification({
        recipientUid: updated.memberId,
        event: updated.status === "APPROVED" ? "LOAN_APPROVED" : "LOAN_REJECTED",
        title: updated.status === "APPROVED" ? "Loan approved" : "Loan application rejected",
        body:
          updated.status === "APPROVED"
            ? `Your loan of ₹${updated.approvedAmount?.toLocaleString("en-IN")} has been approved and is awaiting disbursement.`
            : body.comment ?? "Your loan application was not approved.",
        deepLink: `/dashboard/loans/${updated.id}`,
      });
    }

    return ok(updated);
  }
);
