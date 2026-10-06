import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission } from "@/lib/rbac/guard";

const listQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "member.view.any");

  const searchParams = request.nextUrl.searchParams;
  const { status } = listQuerySchema.parse({ status: searchParams.get("status") ?? undefined });
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ joinedAt: number }>(searchParams.get("cursor"));

  let query = collections.members().orderBy("joinedAt", "desc").limit(limit + 1);
  if (status) query = collections.members().where("status", "==", status).orderBy("joinedAt", "desc").limit(limit + 1);
  if (cursor) query = query.startAfter(cursor.joinedAt);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);

  return ok(
    docs.map((d) => d.data()),
    buildPagination(snapshot.size, limit, searchParams.get("cursor"), { joinedAt: docs.at(-1)?.data().joinedAt })
  );
});
