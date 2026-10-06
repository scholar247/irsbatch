import type { Transaction } from "firebase-admin/firestore";
import { collections } from "@/lib/db/collections";
import { membershipNumber } from "@/lib/db/ids";
import type { Member, MembershipApplication, Role, UserRecord } from "@/types/domain";

const COUNTERS_DOC = "counters";

export interface ProvisionedAccount {
  user: UserRecord;
  member: Member;
}

/**
 * Creates the UserRecord + Member pair for an approved application. Must run inside the
 * caller's transaction, after any other tx.get() calls the caller needs (Firestore
 * transactions require all reads before any writes) — this function itself does one read
 * (the counters doc) before its writes.
 */
export async function provisionMemberAccount(
  tx: Transaction,
  application: MembershipApplication,
  options: { username: string; passwordHash: string; roles?: Role[] }
): Promise<ProvisionedAccount> {
  const countersRef = collections.societySettings().doc(COUNTERS_DOC);
  const countersSnap = await tx.get(countersRef);
  const nextSequence = ((countersSnap.data()?.memberSequence as number | undefined) ?? 0) + 1;

  const uid = application.id; // reuse application id as the member/user id — one identity, no extra join
  const now = Date.now();

  const user: UserRecord = {
    id: uid,
    username: options.username,
    email: application.contact.email,
    passwordHash: options.passwordHash,
    roles: options.roles ?? ["MEMBER"],
    status: "ACTIVE",
    mustChangePassword: true,
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
  tx.set(countersRef, { memberSequence: nextSequence }, { merge: true });

  return { user, member };
}

/** Derives a valid, likely-readable username candidate from an email's local part. */
export function baseUsernameFromEmail(email: string): string {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
  return local.length >= 4 ? local.slice(0, 30) : local.padEnd(4, "0");
}

/** Finds a username not already in use, starting from the email-derived base and appending a numeric suffix on collision. */
export async function generateUniqueUsername(email: string): Promise<string> {
  const base = baseUsernameFromEmail(email);
  let candidate = base;
  let suffix = 1;
  // A single staff member approves applications one at a time in practice, so this
  // check-then-set (outside a transaction) matches the same risk tolerance already
  // accepted by the activation route's own username-uniqueness check.
  for (;;) {
    const existing = await collections.users().where("username", "==", candidate).limit(1).get();
    if (existing.empty) return candidate;
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}
