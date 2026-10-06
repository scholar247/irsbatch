import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { readFundAggregate, writeLedgerEntry } from "@/lib/db/ledger";
import { writeAuditLog } from "@/lib/db/audit";
import { created, ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission, requireSelfOrPermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { Loan, LoanRepayment, Member } from "@/types/domain";

const recordSchema = z.object({
  repaymentId: z.string().min(1),
  amountPaid: z.number().positive().max(10_000_000),
  receiptDocumentId: z.string().optional(),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requirePermission(request, "repayment.record");
  const body = recordSchema.parse(await request.json());
  const repaymentRef = collections.loanRepayments().doc(body.repaymentId);

  const result = await db().runTransaction<{ repayment: LoanRepayment; loan: Loan }>(async (tx) => {
    // --- reads ---
    const repaymentSnap = await tx.get(repaymentRef);
    if (!repaymentSnap.exists) throw AppError.notFound("Repayment installment not found");
    const repayment = repaymentSnap.data() as LoanRepayment;
    if (repayment.status === "PAID") throw AppError.conflict("Installment is already fully paid");

    const loanRef = collections.loans().doc(repayment.loanId);
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists) throw AppError.notFound("Loan not found");
    const loan = loanSnap.data() as Loan;

    const memberRef = collections.members().doc(loan.memberId);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) throw AppError.notFound("Member not found");
    const member = memberSnap.data() as Member;

    const fund = await readFundAggregate(tx);

    // --- writes ---
    const now = Date.now();
    const amountApplied = Math.min(body.amountPaid, loan.outstandingAmount);
    const newAmountPaid = repayment.amountPaid + body.amountPaid;
    const nextRepayment: LoanRepayment = {
      ...repayment,
      amountPaid: newAmountPaid,
      status: newAmountPaid >= repayment.amountDue ? "PAID" : "PARTIAL",
      paidAt: now,
      recordedBy: auth.uid,
      receiptDocumentId: body.receiptDocumentId ?? repayment.receiptDocumentId,
    };
    tx.set(repaymentRef, nextRepayment);

    writeLedgerEntry(tx, fund, {
      type: "REPAYMENT",
      amount: amountApplied,
      memberId: loan.memberId,
      referenceId: repayment.id,
      referenceCollection: "loanRepayments",
      description: `Repayment for loan ${loan.id}, installment ${repayment.installmentNumber}`,
      createdBy: auth.uid,
    });

    const newOutstanding = Math.max(0, loan.outstandingAmount - amountApplied);
    const loanCompleted = newOutstanding === 0;
    const nextLoan: Loan = {
      ...loan,
      outstandingAmount: newOutstanding,
      status: loanCompleted ? "COMPLETED" : "PARTIAL",
      closedAt: loanCompleted ? now : loan.closedAt,
      updatedAt: now,
    };
    tx.set(loanRef, nextLoan);

    const badges = new Set(member.aggregates.badges);
    if (loanCompleted) badges.add("LOAN_CLEARED");
    tx.update(memberRef, {
      "aggregates.outstandingLoanAmount": Math.max(0, member.aggregates.outstandingLoanAmount - amountApplied),
      "aggregates.activeLoanId": loanCompleted ? null : member.aggregates.activeLoanId,
      "aggregates.badges": Array.from(badges),
      updatedAt: now,
    });

    writeAuditLog(tx, {
      actorUid: auth.uid,
      actorRoles: auth.roles,
      action: "REPAYMENT_RECORDED",
      entityCollection: "loanRepayments",
      entityId: repayment.id,
      before: { status: repayment.status, amountPaid: repayment.amountPaid },
      after: { status: nextRepayment.status, amountPaid: nextRepayment.amountPaid },
    });

    return { repayment: nextRepayment, loan: nextLoan };
  });

  await dispatchNotification({
    recipientUid: result.loan.memberId,
    event: result.loan.status === "COMPLETED" ? "LOAN_COMPLETED" : "REPAYMENT_RECEIVED",
    title: result.loan.status === "COMPLETED" ? "Loan fully repaid" : "Repayment received",
    body:
      result.loan.status === "COMPLETED"
        ? "Congratulations — your loan has been fully repaid. You're debt-free!"
        : `Installment ${result.repayment.installmentNumber} payment of ₹${body.amountPaid.toLocaleString("en-IN")} recorded.`,
    deepLink: `/dashboard/loans/${result.loan.id}`,
  });

  return created(result);
});

const listQuerySchema = z.object({
  loanId: z.string().optional(),
  memberId: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE"]).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { loanId, memberId, status } = listQuerySchema.parse({
    loanId: searchParams.get("loanId") ?? undefined,
    memberId: searchParams.get("memberId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (memberId) {
    await requireSelfOrPermission(request, memberId, "repayment.view.self", "repayment.view.any");
  } else {
    await requirePermission(request, "repayment.view.any");
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ dueDate: number }>(searchParams.get("cursor"));

  let query = collections.loanRepayments().orderBy("dueDate", "asc").limit(limit + 1);
  if (loanId) query = query.where("loanId", "==", loanId).orderBy("installmentNumber", "asc").limit(limit + 1);
  else if (memberId) query = query.where("memberId", "==", memberId).orderBy("dueDate", "asc").limit(limit + 1);
  else if (status) query = query.where("status", "==", status).orderBy("dueDate", "asc").limit(limit + 1);
  if (cursor && !loanId) query = query.startAfter(cursor.dueDate);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);

  // OVERDUE is a derived view, not a stored status (flipping it is a scheduled job's job —
  // see src/lib/loans/repaymentSchedule.ts header comment for the follow-up).
  const now = Date.now();
  const items = docs.map((d) => {
    const repayment = d.data();
    const overdue = repayment.status === "PENDING" && repayment.dueDate < now;
    return { ...repayment, effectiveStatus: overdue ? ("OVERDUE" as const) : repayment.status };
  });

  return ok(
    items,
    buildPagination(snapshot.size, limit, searchParams.get("cursor"), { dueDate: docs.at(-1)?.data().dueDate })
  );
});
