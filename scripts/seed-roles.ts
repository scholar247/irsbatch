/**
 * One-time (and re-runnable) seed for the `roles` Firestore collection, so the RBAC
 * permission matrix (PRD §7) exists as data an ADMIN can edit later, rather than only ever
 * living in code (src/lib/rbac/permissions.ts's DEFAULT_ROLE_PERMISSIONS, which this script
 * copies in). Safe to re-run: it overwrites each role doc with the current defaults.
 *
 * Usage: npm run seed:roles   (reads Firebase Admin credentials from .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { collections } from "@/lib/db/collections";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac/permissions";
import type { RoleDefinition } from "@/types/domain";

async function main() {
  const now = Date.now();
  const batch = collections.roles().firestore.batch();

  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const def: RoleDefinition = { id: role as RoleDefinition["id"], label: role, permissions, updatedAt: now };
    batch.set(collections.roles().doc(role), def);
  }

  await batch.commit();
  console.log(`Seeded ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length} role definitions.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
