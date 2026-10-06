import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";

const bodySchema = z.object({ name: z.string().min(1).max(120) });

export const PATCH = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/categories/[id]">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;
    const body = bodySchema.parse(await request.json());

    const ref = collections.ruleCategories().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Category not found");

    const updatedAt = Date.now();
    await ref.update({ name: body.name, updatedAt });
    return ok({ ...snap.data(), name: body.name, updatedAt });
  }
);

/** Deletes the category and every item under it in one transaction — no orphaned items. */
export const DELETE = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/categories/[id]">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;

    const ref = collections.ruleCategories().doc(id);
    const itemsSnap = await collections.ruleItems().where("categoryId", "==", id).get();

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound("Category not found");
      itemsSnap.docs.forEach((doc) => tx.delete(doc.ref));
      tx.delete(ref);
    });

    return ok({ id, deletedItems: itemsSnap.size });
  }
);
