import { collections } from "@/lib/db/collections";
import type { Role } from "@/types/domain";

/** Maker-checker chains (PRD §17), configurable via societySettings/approvalChains — never hardcoded in a route. */
export interface ApprovalChains {
  loan: Role[];
  membership: Role[];
  contributionVerification: Role[];
}

const DEFAULT_CHAINS: ApprovalChains = {
  loan: ["CLERK", "SECRETARY", "PRESIDENT"],
  membership: ["CLERK", "SECRETARY"],
  contributionVerification: ["SECRETARY"],
};

export async function getApprovalChain(kind: keyof ApprovalChains): Promise<Role[]> {
  const snap = await collections.societySettings().doc("approvalChains").get();
  const chains = snap.exists ? { ...DEFAULT_CHAINS, ...(snap.data() as Partial<ApprovalChains>) } : DEFAULT_CHAINS;
  return chains[kind];
}
