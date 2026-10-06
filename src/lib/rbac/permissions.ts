import { collections } from "@/lib/db/collections";
import type { Permission, Role, RoleDefinition } from "@/types/domain";

/**
 * Default role -> permission matrix. This seeds the `roles` Firestore collection on first
 * boot (see scripts/seed.ts) but is NEVER read directly by the authorization path — PRD §7
 * requires role/permission mapping to be data-driven so ADMIN can adjust it (settings.manage)
 * without a deploy. src/lib/rbac/guard.ts always resolves permissions from Firestore.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MEMBER: [
    "member.view.self",
    "member.edit.self",
    "application.submit",
    "contribution.view.self",
    "loan.create",
    "loan.view.self",
    "repayment.view.self",
    "grievance.submit",
    "session.manage.self",
  ],
  CLERK: [
    // No application.review: admission decisions are ADMIN/PRESIDENT/SECRETARY only. Clerk
    // can view member records (member.view.any) but has no member.edit.any, so it's
    // view-only there too.
    "member.view.any",
    "contribution.record",
    "loan.review",
    "repayment.record",
    "grievance.manage",
    "session.manage.self",
  ],
  SECRETARY: [
    "member.view.any",
    "member.edit.any",
    "application.review",
    "application.approve",
    "contribution.record",
    "contribution.verify",
    "loan.review",
    "loan.approve",
    "repayment.record",
    "grievance.manage",
    "announcement.manage",
    "report.view",
    "session.manage.self",
  ],
  PRESIDENT: [
    "member.view.any",
    "member.edit.any",
    "member.suspend",
    "application.review",
    "application.approve",
    "contribution.verify",
    "loan.approve",
    "loan.disburse",
    "report.view",
    "audit.view",
    "announcement.manage",
    "session.manage.self",
  ],
  ADMIN: [
    "member.view.any",
    "member.edit.any",
    "member.suspend",
    "application.review",
    "application.approve",
    "contribution.record",
    "contribution.verify",
    "loan.review",
    "loan.approve",
    "loan.disburse",
    "repayment.record",
    "grievance.manage",
    "announcement.manage",
    "content.manage",
    "notification.template.manage",
    "report.view",
    "audit.view",
    "settings.manage",
    "session.manage.self",
    "session.manage.any",
  ],
};

const CACHE_TTL_MS = 60_000;
let cache: { at: number; byRole: Map<Role, Permission[]> } | null = null;

async function loadRoleDefinitions(): Promise<Map<Role, Permission[]>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.byRole;
  }
  const snapshot = await collections.roles().get();
  const byRole = new Map<Role, Permission[]>();
  if (snapshot.empty) {
    // Firestore has no role docs yet (fresh environment) — fall back to defaults so the
    // app is usable before `scripts/seed.ts` has been run.
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      byRole.set(role as Role, perms);
    }
  } else {
    snapshot.forEach((doc) => {
      const def = doc.data() as RoleDefinition;
      byRole.set(def.id, def.permissions);
    });
  }
  cache = { at: Date.now(), byRole };
  return byRole;
}

export function invalidateRoleCache(): void {
  cache = null;
}

export async function getPermissionsForRoles(roles: Role[]): Promise<Set<Permission>> {
  const byRole = await loadRoleDefinitions();
  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const permission of byRole.get(role) ?? []) {
      permissions.add(permission);
    }
  }
  return permissions;
}
