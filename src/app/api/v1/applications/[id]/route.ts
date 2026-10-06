import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";

export const GET = withErrorHandling(async (request: NextRequest, ctx: RouteContext<"/api/v1/applications/[id]">) => {
  await requirePermission(request, "application.review");
  const { id } = await ctx.params;

  const snap = await collections.membershipApplications().doc(id).get();
  if (!snap.exists) throw AppError.notFound("Application not found");
  return ok(snap.data());
});
