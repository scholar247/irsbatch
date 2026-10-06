import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { generateUniqueUsername, provisionMemberAccount } from "@/lib/db/members";
import { generateRandomPassword, hashPassword } from "@/lib/auth/passwords";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { MembershipApplication } from "@/types/domain";

const bodySchema = z.object({
  message: z.string().max(1000).optional(),
  privateNote: z.string().max(2000).optional(),
});

/**
 * Approval flow: Registration -> Review -> Approval provisions the login account
 * immediately (staff shares the generated password out-of-band — see the response shape
 * below) rather than the applicant self-activating via emailed link.
 *
 * The plaintext password is generated here, hashed for storage, and returned in THIS
 * response only — it is never persisted or logged anywhere in recoverable form. If staff
 * navigate away without copying it, it is gone for good; a password reset would be the
 * only way to regain access, exactly as if the member had set their own.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/applications/[id]/approve">) => {
    const auth = await requirePermission(request, "application.approve");
    const { id } = await ctx.params;
    const { message, privateNote } = bodySchema.parse(await request.json().catch(() => ({})));
    const ref = collections.membershipApplications().doc(id);

    const preSnap = await ref.get();
    if (!preSnap.exists) throw AppError.notFound("Application not found");
    const preApplication = preSnap.data() as MembershipApplication;
    if (preApplication.status === "APPROVED") throw AppError.conflict("Application already approved");
    if (preApplication.status === "REJECTED") throw AppError.conflict("Cannot approve a rejected application");

    const username = await generateUniqueUsername(preApplication.contact.email);
    const password = generateRandomPassword();
    const passwordHash = await hashPassword(password);

    const application = await db().runTransaction<MembershipApplication>(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Application not found");
      const current = snap.data() as MembershipApplication;
      if (current.status === "APPROVED") throw AppError.conflict("Application already approved");
      if (current.status === "REJECTED") throw AppError.conflict("Cannot approve a rejected application");
      if (current.linkedUserId) throw AppError.conflict("This application has already been activated");

      const updated: MembershipApplication = {
        ...current,
        status: "APPROVED",
        approvedBy: auth.uid,
        approvedAt: Date.now(),
        messageToApplicant: message ?? null,
        privateNoteForMember: privateNote ?? null,
        linkedUserId: current.id,
        updatedAt: Date.now(),
      };

      await provisionMemberAccount(tx, current, { username, passwordHash });

      tx.set(ref, updated);
      writeAuditLog(tx, {
        actorUid: auth.uid,
        actorRoles: auth.roles,
        action: "APPLICATION_APPROVED",
        entityCollection: "membershipApplications",
        entityId: id,
        before: { status: current.status },
        after: { status: updated.status, username },
      });
      return updated;
    });

    await dispatchNotification({
      recipientUid: application.id,
      recipientEmail: application.contact.email,
      event: "MEMBERSHIP_APPROVED",
      title: "Your membership has been approved",
      body: ["Your account is ready — check with the office for your login details.", message]
        .filter(Boolean)
        .join(" "),
      deepLink: "/login",
      channels: ["IN_APP", "EMAIL"],
    });

    return ok({ id: application.id, status: application.status, username, password });
  }
);
