import { Bell, BookOpen, ClipboardCheck, Home, Inbox, PiggyBank, Users, Wallet } from "lucide-react";
import type { Permission, Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Omitted = always visible in that workspace. Set = only shown when the viewer actually holds this permission (data-driven, not guessed from role name). */
  requiredPermission?: Permission;
}

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "Member",
  CLERK: "Clerk",
  SECRETARY: "Secretary",
  PRESIDENT: "President",
  ADMIN: "Admin",
};

const MEMBER_WORKSPACE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/contributions", label: "Contributions", icon: PiggyBank },
  { href: "/dashboard/loans", label: "Loans", icon: Wallet },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

/**
 * One flat list for every non-MEMBER role, filtered by which permissions the viewer
 * actually holds (see requiredPermission), rather than a separate hardcoded list per role.
 * This is what keeps the sidebar honest if a permission is ever edited via the roles
 * collection in Firestore instead of the DEFAULT_ROLE_PERMISSIONS code default.
 */
const STAFF_WORKSPACE_ITEMS: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Home },
  { href: "/dashboard/admin/applications", label: "Membership Applications", icon: ClipboardCheck, requiredPermission: "application.review" },
  { href: "/dashboard/admin/members", label: "Members", icon: Users, requiredPermission: "member.view.any" },
  { href: "/dashboard/admin/rules", label: "Rules & Regulations", icon: BookOpen, requiredPermission: "content.manage" },
  { href: "/dashboard/admin/rules-requests", label: "Rules Access Requests", icon: Inbox, requiredPermission: "content.manage" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function navForWorkspace(activeRole: Role, permissions: Permission[]): NavItem[] {
  if (activeRole === "MEMBER") return MEMBER_WORKSPACE_ITEMS;
  const held = new Set(permissions);
  return STAFF_WORKSPACE_ITEMS.filter((item) => !item.requiredPermission || held.has(item.requiredPermission));
}

export function defaultRouteForRole(role: Role): string {
  return role === "MEMBER" ? "/dashboard" : "/dashboard/admin";
}
