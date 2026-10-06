import type { Transaction } from "firebase-admin/firestore";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import type { AuditLogEntry, Role } from "@/types/domain";

export interface WriteAuditLogInput {
  actorUid: string;
  actorRoles: Role[];
  action: string;
  entityCollection: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip?: string | null;
}

/** Must be called from inside an active Firestore transaction so it lands atomically with the write it documents. */
export function writeAuditLog(tx: Transaction, input: WriteAuditLogInput): void {
  const id = generateId();
  const entry: AuditLogEntry = {
    id,
    actorUid: input.actorUid,
    actorRoles: input.actorRoles,
    action: input.action,
    entityCollection: input.entityCollection,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.ip ?? null,
    timestamp: Date.now(),
  };
  tx.set(collections.auditLogs().doc(id), entry);
}
