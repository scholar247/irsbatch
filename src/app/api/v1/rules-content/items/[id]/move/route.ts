import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { RuleItem } from "@/types/domain";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

/** Swaps `order` with the adjacent item in the same category — items never reorder across categories via move. */
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/items/[id]/move">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;
    const { direction } = bodySchema.parse(await request.json());

    const ref = collections.ruleItems().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Rule item not found");
    const item = snap.data() as RuleItem;

    // Equality-only query (no orderBy) so this never needs a composite index — find the
    // adjacent sibling by sorting in memory instead of asking Firestore to sort+filter.
    const siblingsSnap = await collections
      .ruleItems()
      .where("categoryId", "==", item.categoryId)
      .get();
    const siblings = siblingsSnap.docs
      .map((doc) => ({ ref: doc.ref, data: doc.data() as RuleItem }))
      .filter((s) => (direction === "up" ? s.data.order < item.order : s.data.order > item.order))
      .sort((a, b) => (direction === "up" ? b.data.order - a.data.order : a.data.order - b.data.order));
    const neighborEntry = siblings[0];
    if (!neighborEntry) return ok(item); // already at the edge — no-op

    const neighborRef = neighborEntry.ref;
    const neighbor = neighborEntry.data;

    await db().runTransaction(async (tx) => {
      tx.update(ref, { order: neighbor.order, updatedAt: Date.now() });
      tx.update(neighborRef, { order: item.order, updatedAt: Date.now() });
    });

    return ok({ ...item, order: neighbor.order });
  }
);
