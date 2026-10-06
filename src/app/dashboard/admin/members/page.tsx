import Link from "next/link";
import { collections } from "@/lib/db/collections";
import { requireServerPermission } from "@/lib/rbac/server-guard";
import { Badge } from "@/components/ui/badge";
import type { MemberStatus } from "@/types/domain";

const STATUS_TONE: Record<MemberStatus, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  CANCELLED: "danger",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireServerPermission("member.view.any"); // redirects to /dashboard if not staff
  const { status } = await searchParams;
  const filter = (["ACTIVE", "SUSPENDED", "CANCELLED"] as const).includes(status as MemberStatus)
    ? (status as MemberStatus)
    : null;

  let query = collections.members().orderBy("joinedAt", "desc").limit(100);
  if (filter) query = collections.members().where("status", "==", filter).orderBy("joinedAt", "desc").limit(100);
  const members = await query.get().then((snap) => snap.docs.map((d) => d.data()));

  const tabs: { label: string; value: MemberStatus | null }[] = [
    { label: "All", value: null },
    { label: "Active", value: "ACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-foreground-muted">Look up member records.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/dashboard/admin/members?status=${tab.value}` : "/dashboard/admin/members"}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value ? "bg-primary-soft text-primary" : "text-foreground-muted hover:bg-surface-raised"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="surface-card p-2">
        {members.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-foreground-muted">No members here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Membership #</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/admin/members/${member.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {member.personal.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-foreground-muted">{member.membershipNumber}</td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {new Date(member.joinedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={STATUS_TONE[member.status]} className="capitalize">
                      {member.status.toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
