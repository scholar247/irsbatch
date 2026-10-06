import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { getFundAggregate } from "@/lib/db/ledger";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";

/** Admin/staff command-center numbers (PRD §26/§27). All counts use Firestore's count() aggregation query, which reads index entries only — not full documents — so this stays cheap as the collections grow. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "report.view");

  const [
    fund,
    activeMembers,
    pendingApplications,
    pendingLoanDecisions,
    activeLoans,
    unverifiedContributions,
    overdueRepaymentsSnapshot,
  ] = await Promise.all([
    getFundAggregate(),
    collections.members().where("status", "==", "ACTIVE").count().get().then((r) => r.data().count),
    collections
      .membershipApplications()
      .where("status", "in", ["PENDING", "UNDER_REVIEW"])
      .count()
      .get()
      .then((r) => r.data().count),
    collections
      .loans()
      .where("status", "in", ["SUBMITTED", "UNDER_REVIEW"])
      .count()
      .get()
      .then((r) => r.data().count),
    collections
      .loans()
      .where("status", "in", ["ACTIVE", "PARTIAL"])
      .count()
      .get()
      .then((r) => r.data().count),
    collections.contributions().where("status", "==", "RECORDED").count().get().then((r) => r.data().count),
    collections
      .loanRepayments()
      .where("status", "==", "PENDING")
      .where("dueDate", "<", Date.now())
      .count()
      .get()
      .then((r) => r.data().count),
  ]);

  return ok({
    fund,
    activeMembers,
    pendingApplications,
    pendingLoanDecisions,
    activeLoans,
    unverifiedContributions,
    overdueRepayments: overdueRepaymentsSnapshot,
  });
});
