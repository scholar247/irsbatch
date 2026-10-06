import { z } from "zod";
import type { NextRequest } from "next/server";
import { db, FieldValue } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { membershipNumber } from "@/lib/db/ids";
import { created, withErrorHandling } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { verifyActivationToken } from "@/lib/auth/activation";
import { assertPasswordStrength, hashPassword } from "@/lib/auth/passwords";
import type { Member, MembershipApplication, UserRecord } from "@/types/domain";

const activateSchema = z.object({
  token: z.string().min(10),
  username: z
    .string()
    .min(4)
    .max(30)
    .regex(/^[a-z0-9_.]+$/, "Username may only contain lowercase letters, numbers, dot and underscore"),
  password: z.string(),
});

const COUNTERS_DOC = "counters";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = activateSchema.parse(await request.json());
  assertPasswordStrength(body.password);

  let claims;
  try {
    claims = await verifyActivationToken(body.token);
  } catch {
    throw AppError.unauthorized("Activation link is invalid or has expired");
  }

  const usernameTaken = await collections.users().where("username", "==", body.username).limit(1).get();
  if (!usernameTaken.empty) throw AppError.conflict("Username is already taken");

  const passwordHash = await hashPassword(body.password);
  const applicationRef = collections.membershipApplications().doc(claims.applicationId);
  const countersRef = collections.societySettings().doc(COUNTERS_DOC);

  const result = await db().runTransaction(async (tx) => {
    const [appSnap, countersSnap] = await Promise.all([tx.get(applicationRef), tx.get(countersRef)]);
    if (!appSnap.exists) throw AppError.notFound("Application not found");
    const application = appSnap.data() as MembershipApplication;

    if (application.status !== "APPROVED") {
      throw AppError.conflict("Application has not been approved");
    }
    if (application.linkedUserId) {
      throw AppError.conflict("This application has already been activated");
    }

    const nextSequence = ((countersSnap.data()?.memberSequence as number | undefined) ?? 0) + 1;
    const uid = application.id; // reuse application id as the member/user id — one identity, no extra join
    const now = Date.now();

    const user: UserRecord = {
      id: uid,
      username: body.username,
      email: application.contact.email,
      passwordHash,
      roles: ["MEMBER"],
      status: "ACTIVE",
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    const member: Member = {
      id: uid,
      membershipNumber: membershipNumber(nextSequence),
      applicationId: application.id,
      status: "ACTIVE",
      joinedAt: now,
      personal: application.personal,
      contact: application.contact,
      aggregates: {
        totalContributed: 0,
        contributionMonthsCount: 0,
        currentStreakMonths: 0,
        longestStreakMonths: 0,
        lastContributionPeriod: null,
        outstandingLoanAmount: 0,
        activeLoanId: null,
        badges: [],
        milestonesReached: [],
      },
      privateNote: application.privateNoteForMember,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(collections.users().doc(uid), user);
    tx.set(collections.members().doc(uid), member);
    tx.set(countersRef, { memberSequence: FieldValue.increment(1) }, { merge: true });
    tx.update(applicationRef, { linkedUserId: uid, updatedAt: now });

    writeAuditLog(tx, {
      actorUid: uid,
      actorRoles: ["MEMBER"],
      action: "ACCOUNT_ACTIVATED",
      entityCollection: "users",
      entityId: uid,
      before: null,
      after: { username: user.username, membershipNumber: member.membershipNumber },
    });

    return { uid, membershipNumber: member.membershipNumber };
  });

  return created(result);
});
