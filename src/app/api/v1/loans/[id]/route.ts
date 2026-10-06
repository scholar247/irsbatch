import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireSelfOrPermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { NextRequest } from "next/server";
import type { Loan } from "@/types/domain";

export const GET = withErrorHandling(async (request: NextRequest, ctx: RouteContext<"/api/v1/loans/[id]">) => {
  const { id } = await ctx.params;
  const snap = await collections.loans().doc(id).get();
  if (!snap.exists) throw AppError.notFound("Loan not found");
  const loan = snap.data() as Loan;

  await requireSelfOrPermission(request, loan.memberId, "loan.view.self", "loan.view.any");
  return ok(loan);
});
