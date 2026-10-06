import Link from "next/link";
import { notFound } from "next/navigation";
import { collections } from "@/lib/db/collections";
import { getServerAuthContext, requireServerPermission } from "@/lib/rbac/server-guard";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import { MemberForm } from "@/app/dashboard/admin/members/[id]/member-form";
import { ShareCredentialsPanel } from "@/components/dashboard/share-credentials-panel";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireServerPermission("member.view.any"); // redirects to /dashboard if not staff
  const auth = await getServerAuthContext();
  const permissions = await getPermissionsForRoles(auth.roles);
  const { id } = await params;

  const snap = await collections.members().doc(id).get();
  const member = snap.data();
  if (!member) notFound();

  const canEdit = permissions.has("member.edit.any");
  const canViewApplication = permissions.has("application.review");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">{member.personal.fullName}</h1>
          <p className="mt-1 text-sm text-foreground-muted">Membership #{member.membershipNumber}</p>
        </div>
        {canViewApplication && (
          <Link
            href={`/dashboard/admin/applications/${member.applicationId}`}
            className="text-sm text-primary hover:underline"
          >
            View original application
          </Link>
        )}
      </div>

      <MemberForm member={member} canEdit={canEdit} canSuspend={permissions.has("member.suspend")} />

      {canEdit && (
        <div className="surface-card p-6">
          <p className="mb-4 text-sm font-medium">Share login details</p>
          <ShareCredentialsPanel
            resetEndpoint={`/api/v1/members/${member.id}/reset-password`}
            applicant={{ name: member.personal.fullName, email: member.contact.email, phone: member.contact.phone }}
          />
        </div>
      )}
    </div>
  );
}
