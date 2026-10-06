/**
 * Provider-agnostic notification channels (PRD §22: "do not tightly couple providers").
 * Swap `activeProviders` below for real SendGrid/Twilio/FCM clients when credentials exist —
 * nothing outside this file needs to change. Until then, ConsoleProvider logs instead of
 * sending, so the rest of the notification pipeline (events, templates, in-app center) can
 * be built and tested without waiting on vendor accounts.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}
export interface SmsPayload {
  to: string;
  body: string;
}
export interface PushPayload {
  uid: string;
  title: string;
  body: string;
  deepLink: string | null;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}
export interface SmsProvider {
  send(payload: SmsPayload): Promise<void>;
}
export interface PushProvider {
  send(payload: PushPayload): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    console.log(`[email:stub] to=${payload.to} subject="${payload.subject}"`);
  }
}
class ConsoleSmsProvider implements SmsProvider {
  async send(payload: SmsPayload): Promise<void> {
    console.log(`[sms:stub] to=${payload.to} body="${payload.body}"`);
  }
}
class ConsolePushProvider implements PushProvider {
  async send(payload: PushPayload): Promise<void> {
    console.log(`[push:stub] uid=${payload.uid} title="${payload.title}"`);
  }
}

export const activeProviders = {
  email: new ConsoleEmailProvider() as EmailProvider,
  sms: new ConsoleSmsProvider() as SmsProvider,
  push: new ConsolePushProvider() as PushProvider,
};
