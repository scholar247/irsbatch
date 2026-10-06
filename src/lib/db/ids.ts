import { v7 as uuidv7 } from "uuid";

/**
 * UUIDv7 IDs are time-ordered, so lexicographic sort == chronological sort. This makes
 * Firestore's default `__name__` ordering useful as a free secondary sort key and keeps
 * IDs unguessable (unlike auto-incrementing integers), which matters for IDOR resistance.
 */
export function generateId(): string {
  return uuidv7();
}

export function membershipNumber(sequence: number): string {
  return `IRSB-${String(sequence).padStart(5, "0")}`;
}
