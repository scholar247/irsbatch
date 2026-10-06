import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Minimum password policy enforced at registration/password-set time.
 * Kept simple and explicit rather than a regex maze: length + character variety.
 */
export function assertPasswordStrength(plain: string): void {
  const problems: string[] = [];
  if (plain.length < 10) problems.push("at least 10 characters");
  if (!/[a-z]/.test(plain)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(plain)) problems.push("an uppercase letter");
  if (!/[0-9]/.test(plain)) problems.push("a number");
  if (problems.length > 0) {
    throw new Error(`Password must contain ${problems.join(", ")}.`);
  }
}

/**
 * A securely random password meeting assertPasswordStrength, for flows that provision a
 * login for someone else (staff-initiated account creation) rather than the user choosing
 * their own. The caller must hash it before persisting and must never persist the plaintext
 * — see the one-time-reveal pattern in scripts/seed-admin.ts and the application approval
 * flow, which return it in a single response/console line and never store or re-derive it.
 */
export function generateRandomPassword(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomBytes(18).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
    try {
      assertPasswordStrength(candidate);
      return candidate;
    } catch {
      // Vanishingly rare (base64 alphabet almost always covers all required character
      // classes at this length) — just try again with fresh bytes.
    }
  }
  throw new Error("Failed to generate a password meeting the strength policy");
}
