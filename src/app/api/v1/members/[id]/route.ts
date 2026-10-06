import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { writeAuditLog } from "@/lib/db/audit";
import { db } from "@/lib/firebase/admin";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission, requireSelfOrPermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { Member } from "@/types/domain";

export const GET = withErrorHandling(async (request: NextRequest, ctx: RouteContext<"/api/v1/members/[id]">) => {
  const { id } = await ctx.params;
  await requireSelfOrPermission(request, id, "member.view.self", "member.view.any");

  const snap = await collections.members().doc(id).get();
  if (!snap.exists) throw AppError.notFound("Member not found");
  return ok(snap.data());
});

const patchSchema = z.object({
  personal: z
    .object({
      fullName: z.string().min(2).max(120).optional(),
      dateOfBirth: z.string().date().optional(),
      gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
      fatherOrSpouseName: z.string().min(2).max(120).optional(),
    })
    .partial()
    .optional(),
  contact: z
    .object({
      phone: z.string().min(8).max(15).optional(),
      addressLine1: z.string().min(3).max(200).optional(),
      addressLine2: z.string().max(200).optional(),
      city: z.string().min(2).max(100).optional(),
      state: z.string().min(2).max(100).optional(),
      pincode: z.string().min(4).max(10).optional(),
    })
    .partial()
    .optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
});

export const PATCH = withErrorHandling(async (request: NextRequest, ctx: RouteContext<"/api/v1/members/[id]">) => {
  const { id } = await ctx.params;
  const body = patchSchema.parse(await request.json());

  // Changing one's own contact details only needs member.edit.self; changing `status`
  // (suspending/cancelling a membership) always requires the staff-only member.suspend
  // permission, regardless of whose record it is.
  const auth = body.status
    ? await requirePermission(request, "member.suspend")
    : await requireSelfOrPermission(request, id, "member.edit.self", "member.edit.any");

  const ref = collections.members().doc(id);
  const updated = await db().runTransaction<Member>(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw AppError.notFound("Member not found");
    const current = snap.data() as Member;

    const next: Member = {
      ...current,
      personal: { ...current.personal, ...(body.personal ?? {}) },
      contact: { ...current.contact, ...(body.contact ?? {}) },
      status: body.status ?? current.status,
      updatedAt: Date.now(),
    };
    tx.set(ref, next);
    writeAuditLog(tx, {
      actorUid: auth.uid,
      actorRoles: auth.roles,
      action: "MEMBER_UPDATED",
      entityCollection: "members",
      entityId: id,
      before: { personal: current.personal, contact: current.contact, status: current.status },
      after: { personal: next.personal, contact: next.contact, status: next.status },
    });
    return next;
  });

  return ok(updated);
});
