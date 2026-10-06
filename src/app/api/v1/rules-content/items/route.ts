import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { created, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import { AppError } from "@/lib/api/errors";
import type { RuleItem } from "@/types/domain";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "content.manage");
  const parsed = bodySchema.parse(await request.json());

  const categorySnap = await collections.ruleCategories().doc(parsed.categoryId).get();
  if (!categorySnap.exists) throw AppError.badRequest("Unknown categoryId");

  // Equality-only query (no orderBy) so this never needs a composite index — a category's
  // item count is always small enough that computing max(order) in memory is cheap.
  const siblingsSnap = await collections
    .ruleItems()
    .where("categoryId", "==", parsed.categoryId)
    .get();
  const nextOrder = siblingsSnap.docs.reduce((max, doc) => Math.max(max, doc.data().order), -1) + 1;

  const now = Date.now();
  const id = generateId();
  const item: RuleItem = {
    id,
    categoryId: parsed.categoryId,
    title: parsed.title,
    body: parsed.body,
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  };
  await collections.ruleItems().doc(id).set(item);
  return created(item);
});
