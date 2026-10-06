import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import { buildPagination, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { getAuthContext } from "@/lib/rbac/guard";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  const searchParams = request.nextUrl.searchParams;
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: number }>(searchParams.get("cursor"));

  let query = collections
    .notifications()
    .where("recipientUid", "==", auth.uid)
    .orderBy("createdAt", "desc")
    .limit(limit + 1);
  if (cursor) query = query.startAfter(cursor.createdAt);

  const [snapshot, unreadCount] = await Promise.all([
    query.get(),
    collections
      .notifications()
      .where("recipientUid", "==", auth.uid)
      .where("readAt", "==", null)
      .count()
      .get()
      .then((r) => r.data().count),
  ]);

  const docs = snapshot.docs.slice(0, limit);
  const pagination = buildPagination(snapshot.size, limit, searchParams.get("cursor"), {
    createdAt: docs.at(-1)?.data().createdAt,
  });

  return ok({ items: docs.map((d) => d.data()), unreadCount }, pagination);
});
