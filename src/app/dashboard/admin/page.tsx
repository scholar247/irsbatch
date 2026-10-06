import Link from "next/link";
import { BookOpen, ClipboardCheck, Inbox, Users } from "lucide-react";
import { getServerAuthContext } from "@/lib/rbac/server-guard";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import type { Permission } from "@/types/domain";

const CARDS: {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission: Permission;
}[] = [
  {
    href: "/dashboard/admin/applications",
    label: "Membership Applications",
    description: "Review admission forms and approve or reject new members.",
    icon: ClipboardCheck,
    requiredPermission: "application.review",
  },
  {
    href: "/dashboard/admin/members",
    label: "Members",
    description: "Look up member records; staff with edit rights can update them here.",
    icon: Users,
    requiredPermission: "member.view.any",
  },
  {
    href: "/dashboard/admin/rules",
    label: "Rules & Regulations",
    description: "Create and manage the categorized rules content shown on the public Rules page.",
    icon: BookOpen,
    requiredPermission: "content.manage",
  },
  {
    href: "/dashboard/admin/rules-requests",
    label: "Rules Access Requests",
    description: "See who has viewed the Rules & Regulations, and when.",
    icon: Inbox,
    requiredPermission: "content.manage",
  },
];

export default async function AdminOverviewPage() {
  const auth = await getServerAuthContext();
  const permissions = await getPermissionsForRoles(auth.roles);
  const visibleCards = CARDS.filter((card) => permissions.has(card.requiredPermission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage community content and review activity.</p>
      </div>

      {visibleCards.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-foreground-muted">
          Nothing here yet for your role.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="surface-card block p-6 transition-colors hover:bg-surface-raised">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 font-medium">{card.label}</p>
                <p className="mt-1 text-sm text-foreground-muted">{card.description}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
