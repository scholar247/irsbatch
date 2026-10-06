import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { created, ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { MembershipApplication } from "@/types/domain";

/**
 * Membership registration (PRD §11). This endpoint is intentionally PUBLIC — anyone can
 * apply to become a member, so there is no login to require yet. It only ever creates a
 * PENDING application; nothing here creates a `users` doc or grants any access. Staff
 * review happens via /applications/[id]/approve which is where auth starts mattering.
 */

const applicationSchema = z.object({
  personal: z.object({
    fullName: z.string().min(2).max(120),
    dateOfBirth: z.string().date(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
    fatherOrSpouseName: z.string().min(2).max(120),
    photoDocumentId: z.string().optional(),
  }),
  contact: z.object({
    email: z.email(),
    phone: z.string().min(8).max(15),
    addressLine1: z.string().min(3).max(200),
    addressLine2: z.string().max(200).optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().min(4).max(10),
  }),
  professional: z.object({
    occupation: z.string().min(2).max(120),
    employer: z.string().max(120).optional(),
    monthlyIncome: z.number().nonnegative().optional(),
    employmentType: z.enum(["SALARIED", "SELF_EMPLOYED", "RETIRED", "OTHER"]),
  }),
  nominee: z.object({
    fullName: z.string().min(2).max(120),
    relationship: z.string().min(2).max(60),
    dateOfBirth: z.string().date(),
    phone: z.string().max(15).optional(),
    sharePercentage: z.number().min(0).max(100),
  }),
  bank: z.object({
    accountHolderName: z.string().min(2).max(120),
    accountNumber: z.string().min(4).max(30),
    ifscCode: z.string().min(4).max(15),
    bankName: z.string().min(2).max(120),
    branch: z.string().min(2).max(120),
  }),
  declaration: z.object({
    agreedToRules: z.literal(true),
    agreedToDataUsage: z.literal(true),
  }),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = applicationSchema.parse(await request.json());

  const existing = await collections
    .membershipApplications()
    .where("contact.email", "==", body.contact.email)
    .where("status", "in", ["PENDING", "UNDER_REVIEW", "APPROVED"])
    .limit(1)
    .get();
  if (!existing.empty) {
    throw AppError.conflict("An active application already exists for this email address.");
  }

  const id = generateId();
  const now = Date.now();
  const application: MembershipApplication = {
    id,
    status: "PENDING",
    personal: body.personal,
    contact: body.contact,
    professional: body.professional,
    nominee: body.nominee,
    bank: body.bank,
    declaration: { ...body.declaration, signedAt: now },
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    messageToApplicant: null,
    privateNoteForMember: null,
    linkedUserId: null,
    createdAt: now,
    updatedAt: now,
  };

  await collections.membershipApplications().doc(id).set(application);
  return created({ id: application.id, status: application.status });
});

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "application.review");

  const searchParams = request.nextUrl.searchParams;
  const { status } = listQuerySchema.parse({ status: searchParams.get("status") ?? undefined });
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: number }>(searchParams.get("cursor"));

  let query = collections.membershipApplications().orderBy("createdAt", "asc").limit(limit + 1);
  if (status) query = collections.membershipApplications().where("status", "==", status).orderBy("createdAt", "asc").limit(limit + 1);
  if (cursor) query = query.startAfter(cursor.createdAt);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);
  const items = docs.map((d) => d.data());

  return ok(
    items,
    buildPagination(snapshot.size, limit, searchParams.get("cursor"), {
      createdAt: docs.at(-1)?.data().createdAt,
    })
  );
});
