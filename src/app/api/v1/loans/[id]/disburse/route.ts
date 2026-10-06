import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { readFundAggregate, writeLedgerEntry } from "@/lib/db/ledger";
import { writeAuditLog } from "@/lib/db/audit";
import { buildRepaymentSchedule, writeRepaymentSchedule } from "@/lib/loans/repaymentSchedule";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { Loan, Member } from "@/types/domain";

export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/loans/[id]/disburse">) => {
    const auth = await requirePermission(request, "loan.disburse");
    const { id } = await ctx.params;
    const loanRef = collections.loans().doc(id);

    const loan = await db().runTransaction<Loan>(async (tx) => {
      // --- reads ---
      const loanSnap = await tx.get(loanRef);
      if (!loanSnap.exists) throw AppError.notFound("Loan not found");
      const current = loanSnap.data() as Loan;
      if (current.status !== "APPROVED") {
        throw AppError.conflict(`Cannot disburse a loan in status ${current.status}`);
      }
      if (!current.approvedAmount) throw AppError.internal("Approved loan is missing an approved amount");

      const memberRef = collections.members().doc(current.memberId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) throw AppError.notFound("Member not found");
      const member = memberSnap.data() as Member;

      const fund = await readFundAggregate(tx);
      if (fund.current.totalFund < current.approvedAmount) {
        throw AppError.conflict("Society fund balance is insufficient to disburse this loan");
      }

      // --- writes ---
      const now = Date.now();
      const schedule = buildRepaymentSchedule(id, current.memberId, current.approvedAmount, current.tenureMonths, now);
      writeRepaymentSchedule(tx, schedule);

      writeLedgerEntry(tx, fund, {
        type: "LOAN_DISBURSEMENT",
        amount: -current.approvedAmount,
        memberId: current.memberId,
        referenceId: id,
        referenceCollection: "loans",
        description: `Disbursement for loan ${id}`,
        createdBy: auth.uid,
      });

      const next: Loan = {
        ...current,
        status: "ACTIVE",
        disbursedAt: now,
        outstandingAmount: current.approvedAmount,
        updatedAt: now,
      };
      tx.set(loanRef, next);

      tx.update(memberRef, {
        "aggregates.outstandingLoanAmount": member.aggregates.outstandingLoanAmount + current.approvedAmount,
        "aggregates.activeLoanId": id,
        updatedAt: now,
      });

      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "LOAN_DISBURSED",
        entityCollection: "loans",
        entityId: id,
        before: { status: current.status },
        after: { status: next.status, disbursedAt: now },
      });

      return next;
    });

    await dispatchNotification({
      recipientUid: loan.memberId,
      event: "LOAN_DISBURSED",
      title: "Loan disbursed",
      body: `₹${loan.approvedAmount?.toLocaleString("en-IN")} has been disbursed. Your repayment schedule is ready.`,
      deepLink: `/dashboard/loans/${loan.id}`,
    });

    return ok(loan);
  }
);
