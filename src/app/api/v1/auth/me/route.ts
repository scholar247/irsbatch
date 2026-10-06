import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { getAuthContext } from "@/lib/rbac/guard";
import { collections } from "@/lib/db/collections";
import type { UserProfile, UserRecord } from "@/types/domain";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const ctx = await getAuthContext(request);
  const snap = await collections.users().doc(ctx.uid).get();
  if (!snap.exists) throw AppError.unauthorized("Account no longer exists");
  const user = snap.data() as UserRecord;

  const profile: UserProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    status: user.status,
  };
  return ok(profile);
});
