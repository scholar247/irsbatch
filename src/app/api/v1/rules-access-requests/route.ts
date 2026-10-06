import { z } from "zod";
import type { NextRequest } from "next/server";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { created, withErrorHandling } from "@/lib/api/response";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { RulesAccessRequest } from "@/types/domain";

/** Public gated-content lead capture (PRD §10). No auth — this is how a non-member gets to read the rules. */
const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  phone: z.string().min(8).max(15),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = schema.parse(await request.json());
  const id = generateId();
  const record: RulesAccessRequest = {
    id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    ip: request.headers.get("x-forwarded-for"),
    requestedAt: Date.now(),
  };
  await collections.rulesAccessRequests().doc(id).set(record);

  // Notify every ADMIN so staff can see who's viewed the rules — best-effort, never blocks
  // the visitor's response even if an individual dispatch fails (see dispatchNotification).
  const adminsSnap = await collections.users().where("roles", "array-contains", "ADMIN").get();
  await Promise.all(
    adminsSnap.docs.map((doc) =>
      dispatchNotification({
        recipientUid: doc.id,
        event: "RULES_ACCESS_REQUESTED",
        title: "Rules & Regulations viewed",
        body: `${body.name} (${body.email}) just viewed the Rules & Regulations.`,
        deepLink: "/dashboard/admin/rules-requests",
      })
    )
  );

  return created({ granted: true });
});
