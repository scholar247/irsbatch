import Link from "next/link";
import { collections } from "@/lib/db/collections";
import { requireServerPermission } from "@/lib/rbac/server-guard";
import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/types/domain";

const STATUS_TONE: Record<ApplicationStatus, "primary" | "warning" | "success" | "danger"> = {
  PENDING: "primary",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireServerPermission("application.review"); // redirects to /dashboard if not staff
  const { status } = await searchParams;
  const filter = (["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const).includes(
    status as ApplicationStatus
  )
    ? (status as ApplicationStatus)
    : null;

  let query = collections.membershipApplications().orderBy("createdAt", "desc").limit(100);
  if (filter) query = collections.membershipApplications().where("status", "==", filter).orderBy("createdAt", "desc").limit(100);
  const applications = await query.get().then((snap) => snap.docs.map((d) => d.data()));

  const tabs: { label: string; value: ApplicationStatus | null }[] = [
    { label: "All", value: null },
    { label: "Pending", value: "PENDING" },
    { label: "Under review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Membership Applications</h1>
        <p className="mt-1 text-sm text-foreground-muted">Review admission forms and approve or reject new members.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/dashboard/admin/applications?status=${tab.value}` : "/dashboard/admin/applications"}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value ? "bg-primary-soft text-primary" : "text-foreground-muted hover:bg-surface-raised"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="surface-card p-2">
        {applications.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-foreground-muted">No applications here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="px-3 py-2 font-medium">Applicant</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/admin/applications/${application.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {application.personal.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-foreground-muted">{application.contact.email}</td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {new Date(application.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={STATUS_TONE[application.status]} className="capitalize">
                      {application.status.toLowerCase().replace("_", " ")}
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
