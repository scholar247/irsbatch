import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";

/**
 * Generic CMS-lite for the pages PRD §32 says must not be hardcoded: About Us, Contact.
 * `key` is one of a small fixed set of content documents under societySettings. Reads are
 * public (this is marketing/informational content); writes require content.manage.
 * Rules & Regulations used to live here as a flat "rules" key but was replaced by the
 * categorized model in /api/v1/rules-content (ruleCategories/ruleItems collections).
 */
const ALLOWED_KEYS = ["about", "contact"] as const;

function assertAllowedKey(key: string): asserts key is (typeof ALLOWED_KEYS)[number] {
  if (!ALLOWED_KEYS.includes(key as never)) throw AppError.notFound("Unknown content key");
}

export const GET = withErrorHandling(async (_request: NextRequest, ctx: RouteContext<"/api/v1/content/[key]">) => {
  const { key } = await ctx.params;
  assertAllowedKey(key);

  const snap = await collections.societySettings().doc(`content_${key}`).get();
  return ok(snap.exists ? snap.data() : { key, title: "", body: "", updatedAt: null });
});

const bodySchema = z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(20_000) });

export const PATCH = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/v1/content/[key]">) => {
    const auth = await requirePermission(request, "content.manage");
    const { key } = await ctx.params;
    assertAllowedKey(key);
    const body = bodySchema.parse(await request.json());

    const record = { key, title: body.title, body: body.body, updatedBy: auth.uid, updatedAt: Date.now() };
    await collections.societySettings().doc(`content_${key}`).set(record);
    return ok(record);
  }
);
