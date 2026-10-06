import { collections } from "@/lib/db/collections";
import { getFundAggregate } from "@/lib/db/ledger";
import { env } from "@/lib/env";

export interface PublicStats {
  activeMembers: number;
  totalContributed: number;
  totalDisbursed: number;
  loansSupported: number;
}

const FALLBACK: PublicStats = { activeMembers: 0, totalContributed: 0, totalDisbursed: 0, loansSupported: 0 };

/**
 * Deliberately public, unauthenticated numbers for the landing page's Statistics section —
 * this society's core value is transparency (PRD §1), so aggregate fund figures are meant
 * to be visible to a prospective member before they even log in. Never exposes anything
 * member-identifying. Falls back to zeros (rather than throwing) if Firestore isn't
 * reachable yet, so the marketing site stays renderable before a Firebase project is wired up.
 */
export async function getPublicStats(): Promise<PublicStats> {
  if (!env.firebase.isConfigured()) {
    // No Firebase project wired up yet (e.g. local checkout before .env.local is filled in) —
    // fail fast without attempting any Firestore calls, rather than letting several
    // in-flight requests reject individually.
    return FALLBACK;
  }
  try {
    const [fund, activeMembers, loansSupported] = await Promise.all([
      getFundAggregate(),
      collections.members().where("status", "==", "ACTIVE").count().get().then((r) => r.data().count),
      collections
        .loans()
        .where("status", "in", ["ACTIVE", "PARTIAL", "COMPLETED"])
        .count()
        .get()
        .then((r) => r.data().count),
    ]);
    return {
      activeMembers,
      totalContributed: fund.totalContributed,
      totalDisbursed: fund.totalDisbursed,
      loansSupported,
    };
  } catch (error) {
    console.warn("getPublicStats: falling back to zeros —", error);
    return FALLBACK;
  }
}
