import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { writeAuditLog } from "@/lib/db/audit";
import { created, ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission, requireSelfOrPermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { evaluateLoanEligibility, getLoanEligibilityConfig } from "@/lib/loans/eligibility";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { Loan, Member } from "@/types/domain";

const applySchema = z.object({
  requestedAmount: z.number().positive().max(10_000_000),
  tenureMonths: z.number().int().min(1).max(60),
  purpose: z.string().min(5).max(500),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requirePermission(request, "loan.create");
  const body = applySchema.parse(await request.json());

  const memberRef = collections.members().doc(auth.uid);
  const config = await getLoanEligibilityConfig();

  const loan = await db().runTransaction<Loan>(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) throw AppError.notFound("Member profile not found for this account");
    const member = memberSnap.data() as Member;
    if (member.status !== "ACTIVE") throw AppError.conflict("Member is not active");

    const eligibility = evaluateLoanEligibility(member, body.requestedAmount, config);
    if (!eligibility.eligible) {
      throw AppError.conflict("Loan application does not meet eligibility criteria", eligibility.reasons);
    }

    const id = generateId();
    const now = Date.now();
    const loanRecord: Loan = {
      id,
      memberId: auth.uid,
      status: "SUBMITTED",
      requestedAmount: body.requestedAmount,
      approvedAmount: null,
      tenureMonths: body.tenureMonths,
      purpose: body.purpose,
      outstandingAmount: 0,
      eligibilitySnapshot: eligibility,
      approvalTrail: [],
      disbursedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(collections.loans().doc(id), loanRecord);
    writeAuditLog(tx, {
      actorUid: auth.uid,
      actorRoles: auth.roles,
      action: "LOAN_SUBMITTED",
      entityCollection: "loans",
      entityId: id,
      before: null,
      after: loanRecord,
    });
    return loanRecord;
  });

  await dispatchNotification({
    recipientUid: auth.uid,
    event: "LOAN_SUBMITTED",
    title: "Loan application submitted",
    body: `Your request for ₹${body.requestedAmount.toLocaleString("en-IN")} is under review.`,
    deepLink: `/dashboard/loans/${loan.id}`,
  });

  return created(loan);
});

const listQuerySchema = z.object({
  memberId: z.string().optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "DISBURSED",
      "ACTIVE",
      "PARTIAL",
      "COMPLETED",
      "DEFAULTED",
    ])
    .optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { memberId, status } = listQuerySchema.parse({
    memberId: searchParams.get("memberId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (memberId) {
    await requireSelfOrPermission(request, memberId, "loan.view.self", "loan.view.any");
  } else {
    await requirePermission(request, "loan.view.any");
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: number }>(searchParams.get("cursor"));

  let query = collections.loans().orderBy("createdAt", "desc").limit(limit + 1);
  if (memberId) query = query.where("memberId", "==", memberId).orderBy("createdAt", "desc").limit(limit + 1);
  if (status) query = query.where("status", "==", status).orderBy("createdAt", "desc").limit(limit + 1);
  if (cursor) query = query.startAfter(cursor.createdAt);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);

  return ok(
    docs.map((d) => d.data()),
    buildPagination(snapshot.size, limit, searchParams.get("cursor"), { createdAt: docs.at(-1)?.data().createdAt })
  );
});
