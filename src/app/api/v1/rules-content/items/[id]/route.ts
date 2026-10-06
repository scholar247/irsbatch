import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export const PATCH = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/items/[id]">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;
    const parsed = bodySchema.parse(await request.json());

    const ref = collections.ruleItems().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Rule item not found");

    const updatedAt = Date.now();
    await ref.update({ title: parsed.title, body: parsed.body, updatedAt });
    return ok({ ...snap.data(), title: parsed.title, body: parsed.body, updatedAt });
  }
);

export const DELETE = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/rules-content/items/[id]">) => {
    await requirePermission(request, "content.manage");
    const { id } = await ctx.params;

    const ref = collections.ruleItems().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound("Rule item not found");

    await ref.delete();
    return ok({ id });
  }
);
