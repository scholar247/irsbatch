import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { activeProviders } from "@/lib/notifications/provider";
import type { NotificationChannel, NotificationEvent, NotificationRecord } from "@/types/domain";

export interface DispatchNotificationInput {
  recipientUid: string;
  recipientEmail?: string;
  recipientPhone?: string;
  event: NotificationEvent;
  title: string;
  body: string;
  deepLink?: string | null;
  channels?: NotificationChannel[]; // defaults to IN_APP only
}

/**
 * Always writes the in-app notification (source of truth for the Notification Center,
 * PRD §24). Email/SMS/push are best-effort side sends and never block the caller or roll
 * back the write they're attached to — a failed push should not fail a loan approval.
 */
export async function dispatchNotification(input: DispatchNotificationInput): Promise<NotificationRecord> {
  const channels = input.channels ?? ["IN_APP"];
  const id = generateId();
  const record: NotificationRecord = {
    id,
    recipientUid: input.recipientUid,
    event: input.event,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    channelsSent: ["IN_APP"],
    readAt: null,
    createdAt: Date.now(),
  };
  await collections.notifications().doc(id).set(record);

  const sideEffects: Promise<void>[] = [];
  if (channels.includes("EMAIL") && input.recipientEmail) {
    sideEffects.push(
      activeProviders.email.send({ to: input.recipientEmail, subject: input.title, body: input.body })
    );
  }
  if (channels.includes("SMS") && input.recipientPhone) {
    sideEffects.push(activeProviders.sms.send({ to: input.recipientPhone, body: input.body }));
  }
  if (channels.includes("PUSH")) {
    sideEffects.push(
      activeProviders.push.send({
        uid: input.recipientUid,
        title: input.title,
        body: input.body,
        deepLink: input.deepLink ?? null,
      })
    );
  }

  const results = await Promise.allSettled(sideEffects);
  results.forEach((r) => {
    if (r.status === "rejected") console.error("Notification side-effect failed:", r.reason);
  });

  return record;
}
