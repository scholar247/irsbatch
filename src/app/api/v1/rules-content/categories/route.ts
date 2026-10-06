import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { created, withErrorHandling } from "@/lib/api/response";
import { requirePermission } from "@/lib/rbac/guard";
import type { RuleCategory } from "@/types/domain";

const bodySchema = z.object({ name: z.string().min(1).max(120) });

export const POST = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "content.manage");
  const body = bodySchema.parse(await request.json());

  const lastSnap = await collections.ruleCategories().orderBy("order", "desc").limit(1).get();
  const nextOrder = lastSnap.empty ? 0 : lastSnap.docs[0].data().order + 1;

  const now = Date.now();
  const id = generateId();
  const category: RuleCategory = { id, name: body.name, order: nextOrder, createdAt: now, updatedAt: now };
  await collections.ruleCategories().doc(id).set(category);
  return created(category);
});
