/**
 * One-time bootstrap for the first ADMIN account. There is no default/seeded login for
 * anyone in this system (members set their own password via the activation flow — see
 * src/app/api/v1/auth/activate/route.ts) and no API route creates staff accounts, so the
 * very first ADMIN has to be created out-of-band. Safe to re-run: it's a no-op if an ADMIN
 * user already exists rather than overwriting one.
 *
 * Usage: npm run seed:admin   (reads Firebase Admin credentials from .env.local)
 * Optional overrides: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars.
 * If ADMIN_PASSWORD is omitted, a random password is generated and printed ONCE below —
 * copy it now, it is never stored in plaintext or logged again.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import { assertPasswordStrength, generateRandomPassword, hashPassword } from "@/lib/auth/passwords";
import type { UserRecord } from "@/types/domain";

async function main() {
  const existing = await collections.users().where("roles", "array-contains", "ADMIN").limit(1).get();
  if (!existing.empty) {
    const admin = existing.docs[0].data();
    console.log(`An ADMIN user already exists (username: ${admin.username}); not creating another.`);
    return;
  }

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const email = process.env.ADMIN_EMAIL ?? "admin@irsbatch.local";
  const password = process.env.ADMIN_PASSWORD ?? generateRandomPassword();
  assertPasswordStrength(password);

  const usernameTaken = await collections.users().where("username", "==", username).limit(1).get();
  if (!usernameTaken.empty) {
    throw new Error(`Username "${username}" is already in use by a non-ADMIN account; pick a different ADMIN_USERNAME`);
  }

  const now = Date.now();
  const user: UserRecord = {
    id: generateId(),
    username,
    email,
    passwordHash: await hashPassword(password),
    roles: ["ADMIN"],
    status: "ACTIVE",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await collections.users().doc(user.id).set(user);

  console.log("Created master ADMIN account:");
  console.log(`  username: ${username}`);
  console.log(`  password: ${password}`);
  console.log("Copy this password now — it will not be shown again. Log in and change it immediately.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
