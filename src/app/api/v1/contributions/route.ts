import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { readFundAggregate, writeLedgerEntry } from "@/lib/db/ledger";
import { writeAuditLog } from "@/lib/db/audit";
import { created, ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission, requireSelfOrPermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { Contribution, Member } from "@/types/domain";

/**
 * Reference implementation of PRD §37's atomic financial write:
 *   Validate -> Create record -> Create ledger -> Update aggregate -> Audit log
 * all inside one Firestore transaction (`db().runTransaction`), so a partial failure
 * (e.g. the process crashes after creating the contribution but before the ledger entry)
 * is impossible — either every step lands or none do.
 */
const recordSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().positive().max(10_000_000),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  receiptDocumentId: z.string().optional(),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requirePermission(request, "contribution.record");
  const body = recordSchema.parse(await request.json());

  const memberRef = collections.members().doc(body.memberId);
  const duplicateCheck = await collections
    .contributions()
    .where("memberId", "==", body.memberId)
    .where("month", "==", body.month)
    .where("year", "==", body.year)
    .where("status", "in", ["PENDING", "RECORDED", "VERIFIED"])
    .limit(1)
    .get();
  if (!duplicateCheck.empty) {
    throw AppError.conflict("A contribution for this member/month/year is already recorded.");
  }

  const contributionId = generateId();
  const contribution = await db().runTransaction<Contribution>(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) throw AppError.notFound("Member not found");
    const member = memberSnap.data() as Member;
    if (member.status !== "ACTIVE") throw AppError.conflict("Member is not active");

    // All reads (member, fund aggregate) must happen before any writes in this transaction.
    const fund = await readFundAggregate(tx);

    const now = Date.now();
    const record: Contribution = {
      id: contributionId,
      memberId: body.memberId,
      amount: body.amount,
      month: body.month,
      year: body.year,
      status: "RECORDED",
      receiptDocumentId: body.receiptDocumentId ?? null,
      recordedBy: auth.uid,
      verifiedBy: null,
      rejectionReason: null,
      createdAt: now,
      verifiedAt: null,
    };
    tx.set(collections.contributions().doc(contributionId), record);

    writeLedgerEntry(tx, fund, {
      type: "CONTRIBUTION",
      amount: body.amount,
      memberId: body.memberId,
      referenceId: contributionId,
      referenceCollection: "contributions",
      description: `Contribution for ${body.month}/${body.year}`,
      createdBy: auth.uid,
    });

    const isConsecutive =
      member.aggregates.lastContributionPeriod !== null &&
      isNextMonth(member.aggregates.lastContributionPeriod, { month: body.month, year: body.year });

    const newTotal = member.aggregates.totalContributed + body.amount;
    const newStreak = isConsecutive ? member.aggregates.currentStreakMonths + 1 : 1;
    tx.update(memberRef, {
      "aggregates.totalContributed": newTotal,
      "aggregates.contributionMonthsCount": member.aggregates.contributionMonthsCount + 1,
      "aggregates.currentStreakMonths": newStreak,
      "aggregates.longestStreakMonths": Math.max(newStreak, member.aggregates.longestStreakMonths),
      "aggregates.lastContributionPeriod": { month: body.month, year: body.year },
      updatedAt: now,
    });

    writeAuditLog(tx, {
      actorUid: auth.uid,
      actorRoles: auth.roles,
      action: "CONTRIBUTION_RECORDED",
      entityCollection: "contributions",
      entityId: contributionId,
      before: null,
      after: record,
    });

    return record;
  });

  await dispatchNotification({
    recipientUid: body.memberId,
    event: "CONTRIBUTION_RECORDED",
    title: "Contribution recorded",
    body: `Your contribution of ₹${body.amount.toLocaleString("en-IN")} for ${body.month}/${body.year} has been recorded.`,
    deepLink: `/dashboard/contributions/${contributionId}`,
  });

  return created(contribution);
});

function isNextMonth(prev: { month: number; year: number }, next: { month: number; year: number }): boolean {
  const prevIndex = prev.year * 12 + prev.month;
  const nextIndex = next.year * 12 + next.month;
  return nextIndex === prevIndex + 1;
}

const listQuerySchema = z.object({
  memberId: z.string().optional(),
  status: z.enum(["PENDING", "RECORDED", "VERIFIED", "REJECTED"]).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { memberId, status } = listQuerySchema.parse({
    memberId: searchParams.get("memberId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (memberId) {
    await requireSelfOrPermission(request, memberId, "contribution.view.self", "contribution.view.any");
  } else {
    await requirePermission(request, "contribution.view.any");
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: number }>(searchParams.get("cursor"));

  let query = collections.contributions().orderBy("createdAt", "desc").limit(limit + 1);
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
