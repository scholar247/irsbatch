import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { requirePermission } from "@/lib/rbac/guard";

const querySchema = z.object({
  entityCollection: z.string().optional(),
  entityId: z.string().optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission(request, "audit.view");
  const searchParams = request.nextUrl.searchParams;
  const { entityCollection, entityId } = querySchema.parse({
    entityCollection: searchParams.get("entityCollection") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
  });

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ timestamp: number }>(searchParams.get("cursor"));

  let query = collections.auditLogs().orderBy("timestamp", "desc").limit(limit + 1);
  if (entityCollection && entityId) {
    query = collections
      .auditLogs()
      .where("entityCollection", "==", entityCollection)
      .where("entityId", "==", entityId)
      .orderBy("timestamp", "desc")
      .limit(limit + 1);
  }
  if (cursor) query = query.startAfter(cursor.timestamp);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);

  return ok(
    docs.map((d) => d.data()),
    buildPagination(snapshot.size, limit, searchParams.get("cursor"), { timestamp: docs.at(-1)?.data().timestamp })
  );
});
