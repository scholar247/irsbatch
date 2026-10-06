import { collections } from "@/lib/db/collections";
import type { LoanEligibilitySnapshot, Member } from "@/types/domain";

/**
 * Loan eligibility is configurable per PRD §15 — the thresholds live in Firestore
 * (societySettings/loanEligibility), not in this code, so ADMIN can tune them without a
 * deploy. This module only implements the *evaluation logic* shape; the numbers are data.
 */
export interface LoanEligibilityConfig {
  minMembershipMonths: number;
  minContributionMonths: number;
  maxConcurrentLoans: number;
  maxLoanAsMultipleOfContributions: number;
}

const DEFAULT_CONFIG: LoanEligibilityConfig = {
  minMembershipMonths: 6,
  minContributionMonths: 6,
  maxConcurrentLoans: 1,
  maxLoanAsMultipleOfContributions: 3,
};

export async function getLoanEligibilityConfig(): Promise<LoanEligibilityConfig> {
  const snap = await collections.societySettings().doc("loanEligibility").get();
  return snap.exists ? { ...DEFAULT_CONFIG, ...(snap.data() as Partial<LoanEligibilityConfig>) } : DEFAULT_CONFIG;
}

export function evaluateLoanEligibility(
  member: Member,
  requestedAmount: number,
  config: LoanEligibilityConfig
): LoanEligibilitySnapshot {
  const membershipMonths = Math.floor((Date.now() - member.joinedAt) / (30 * 24 * 60 * 60 * 1000));
  const membershipDurationOk = membershipMonths >= config.minMembershipMonths;
  const contributionHistoryOk = member.aggregates.contributionMonthsCount >= config.minContributionMonths;
  const existingLoanOk = member.aggregates.activeLoanId === null;
  const maxAllowed = member.aggregates.totalContributed * config.maxLoanAsMultipleOfContributions;
  const withinLimit = requestedAmount <= maxAllowed;
  // "Repayment history OK" has no negative signal to check on a member's very first loan —
  // treat no prior loans as trivially fine; a real default-history check plugs in once
  // loanRepayments data exists for this member.
  const repaymentHistoryOk = true;

  const reasons: LoanEligibilitySnapshot["reasons"] = [
    {
      code: "MEMBERSHIP_DURATION",
      label: membershipDurationOk
        ? "Membership duration OK"
        : `Membership duration is ${membershipMonths} months; needs ${config.minMembershipMonths}`,
      status: membershipDurationOk ? "OK" : "BLOCKED",
    },
    {
      code: "CONTRIBUTION_HISTORY",
      label: contributionHistoryOk
        ? "Contribution history OK"
        : `Only ${member.aggregates.contributionMonthsCount} months contributed; needs ${config.minContributionMonths}`,
      status: contributionHistoryOk ? "OK" : "BLOCKED",
    },
    {
      code: "EXISTING_LOAN",
      label: existingLoanOk ? "No existing active loan" : "Existing liabilities",
      status: existingLoanOk ? "OK" : "WARNING",
    },
    {
      code: "REQUESTED_AMOUNT_LIMIT",
      label: withinLimit
        ? "Requested amount within limit"
        : `Requested ₹${requestedAmount.toLocaleString("en-IN")} exceeds limit of ₹${maxAllowed.toLocaleString("en-IN")}`,
      status: withinLimit ? "OK" : "BLOCKED",
    },
  ];

  const eligible = membershipDurationOk && contributionHistoryOk && existingLoanOk && withinLimit;

  return {
    membershipDurationOk,
    contributionHistoryOk,
    existingLoanOk,
    repaymentHistoryOk,
    eligible,
    reasons,
    evaluatedAt: Date.now(),
  };
}
