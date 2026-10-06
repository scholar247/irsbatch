import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { generateRandomPassword, hashPassword } from "@/lib/auth/passwords";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { UserRecord } from "@/types/domain";

/**
 * Issues a brand-new password for a member so staff can share it again — there is no way
 * to retrieve a previously issued password (never stored in recoverable form), so "share it
 * again later" always means "generate a fresh one," exactly like any other password reset.
 * Old sessions are revoked since the credential just changed under the member.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/members/[id]/reset-password">) => {
    const auth = await requirePermission(request, "member.edit.any");
    const { id } = await ctx.params;

    const userRef = collections.users().doc(id);
    const password = generateRandomPassword();
    const passwordHash = await hashPassword(password);

    const user = await db().runTransaction<UserRecord>(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw AppError.notFound("Member account not found");
      const current = snap.data() as UserRecord;

      const updated: UserRecord = { ...current, passwordHash, mustChangePassword: true, updatedAt: Date.now() };
      tx.set(userRef, updated);
      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "MEMBER_PASSWORD_RESET",
        entityCollection: "users",
        entityId: id,
        before: null,
        after: null, // never log password material, even hashed
      });
      return updated;
    });

    await revokeAllSessionsForUser(id);

    return ok({ username: user.username, password });
  }
);
