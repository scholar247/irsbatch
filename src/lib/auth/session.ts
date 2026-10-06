import { createHash } from "node:crypto";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { env } from "@/lib/env";
import type { SessionRecord } from "@/types/domain";
import { AppError } from "@/lib/api/errors";

/** Refresh tokens are hashed before storage so a Firestore export/leak never yields a usable token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateSessionInput {
  id?: string;
  uid: string;
  refreshToken: string;
  deviceLabel: string;
  userAgent: string;
  ip: string;
}

export async function createSession(input: CreateSessionInput): Promise<SessionRecord> {
  const id = input.id ?? generateId();
  const now = Date.now();
  const record: SessionRecord = {
    id,
    uid: input.uid,
    refreshTokenHash: hashToken(input.refreshToken),
    deviceLabel: input.deviceLabel,
    userAgent: input.userAgent,
    ip: input.ip,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + env.auth.refreshTokenTtlSeconds() * 1000,
    revokedAt: null,
  };
  await collections.sessions().doc(id).set(record);
  return record;
}

/**
 * Validates a presented refresh token against the stored session and rotates it in one
 * Firestore transaction: the old token can never be replayed (protects against the classic
 * "attacker exfiltrates refresh token, keeps using it silently" scenario) and reuse of an
 * already-rotated token revokes the whole session as a compromise signal.
 */
export async function rotateSession(
  sessionId: string,
  presentedRefreshToken: string,
  newRefreshToken: string
): Promise<SessionRecord> {
  const ref = collections.sessions().doc(sessionId);
  return collections.sessions().firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw AppError.unauthorized("Session not found");
    const session = snap.data() as SessionRecord;

    if (session.revokedAt !== null) {
      throw AppError.unauthorized("Session has been revoked");
    }
    if (session.expiresAt < Date.now()) {
      throw AppError.unauthorized("Session has expired");
    }
    if (session.refreshTokenHash !== hashToken(presentedRefreshToken)) {
      // Presented token doesn't match the current one on file: either stale or replayed
      // after a prior rotation. Revoke immediately rather than silently rejecting.
      tx.update(ref, { revokedAt: Date.now() });
      throw AppError.unauthorized("Refresh token reuse detected; session revoked");
    }

    const updated: Partial<SessionRecord> = {
      refreshTokenHash: hashToken(newRefreshToken),
      lastUsedAt: Date.now(),
    };
    tx.update(ref, updated);
    return { ...session, ...updated };
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await collections.sessions().doc(sessionId).update({ revokedAt: Date.now() });
}

export async function revokeAllSessionsForUser(uid: string, exceptSessionId?: string): Promise<void> {
  const snapshot = await collections.sessions().where("uid", "==", uid).where("revokedAt", "==", null).get();
  const batch = collections.sessions().firestore.batch();
  snapshot.forEach((doc) => {
    if (doc.id === exceptSessionId) return;
    batch.update(doc.ref, { revokedAt: Date.now() });
  });
  await batch.commit();
}

export async function listActiveSessions(uid: string): Promise<SessionRecord[]> {
  const snapshot = await collections
    .sessions()
    .where("uid", "==", uid)
    .where("revokedAt", "==", null)
    .orderBy("lastUsedAt", "desc")
    .get();
  return snapshot.docs.map((d) => d.data());
}
