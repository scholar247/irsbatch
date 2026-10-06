import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { RuleCategory } from "@/types/domain";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

/** Swaps `order` with the adjacent category in a transaction, so reordering is a single atomic step rather than a full-list rewrite. */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/categories/[id]/move">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;
    const { direction } = bodySchema.parse(await request.json());

    const ref = collections.ruleCategories().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Category not found");
    const category = snap.data() as RuleCategory;

    const neighborSnap = await collections
      .ruleCategories()
      .where("order", direction === "up" ? "<" : ">", category.order)
      .orderBy("order", direction === "up" ? "desc" : "asc")
      .limit(1)
      .get();
    if (neighborSnap.empty) return ok(category); // already at the edge — no-op

    const neighborRef = neighborSnap.docs[0].ref;
    const neighbor = neighborSnap.docs[0].data() as RuleCategory;

    await db().runTransaction(async (tx) => {
      tx.update(ref, { order: neighbor.order, updatedAt: Date.now() });
      tx.update(neighborRef, { order: category.order, updatedAt: Date.now() });
    });

    return ok({ ...category, order: neighbor.order });
  }
);
