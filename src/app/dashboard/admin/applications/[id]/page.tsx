import Link from "next/link";
import { notFound } from "next/navigation";
import { collections } from "@/lib/db/collections";
import { getServerAuthContext, requireServerPermission } from "@/lib/rbac/server-guard";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";
import { Badge } from "@/components/ui/badge";
import { DecisionPanel } from "@/app/dashboard/admin/applications/[id]/decision-panel";
import type { ApplicationStatus, UserRecord } from "@/types/domain";

const STATUS_TONE: Record<ApplicationStatus, "primary" | "warning" | "success" | "danger"> = {
  PENDING: "primary",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

async function usernameFor(uid: string | null): Promise<string | null> {
  if (!uid) return null;
  const snap = await collections.users().doc(uid).get();
  return snap.exists ? (snap.data() as UserRecord).username : uid;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireServerPermission("application.review"); // redirects to /dashboard if not staff
  const auth = await getServerAuthContext();
  const permissions = await getPermissionsForRoles(auth.roles);
  const { id } = await params;

  const snap = await collections.membershipApplications().doc(id).get();
  const application = snap.data();
  if (!application) notFound();

  const [reviewerName, approverName] = await Promise.all([
    usernameFor(application.reviewedBy),
    usernameFor(application.approvedBy),
  ]);

  const canDecide = permissions.has("application.approve");
  const canViewMember = permissions.has("member.view.any");
  const showDecisionCard =
    (["PENDING", "UNDER_REVIEW"] as ApplicationStatus[]).includes(application.status) && canDecide
      ? true
      : application.status === "APPROVED"
        ? canDecide
        : application.status === "REJECTED"
          ? Boolean(application.rejectionReason)
          : false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">{application.personal.fullName}</h1>
          <p className="mt-1 text-sm text-foreground-muted">Submitted {formatDateTime(application.createdAt)}</p>
        </div>
        <Badge tone={STATUS_TONE[application.status]} className="capitalize">
          {application.status.toLowerCase().replace("_", " ")}
        </Badge>
      </div>

      {(application.status === "APPROVED" || application.status === "REJECTED") && (
        <div className="surface-card p-6 text-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">
              {application.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
              {application.status === "APPROVED" ? approverName : reviewerName}{" "}
              {application.status === "APPROVED"
                ? formatDateTime(application.approvedAt!)
                : formatDateTime(application.reviewedAt!)}
            </p>
            {application.status === "APPROVED" && canViewMember && (
              <Link href={`/dashboard/admin/members/${application.id}`} className="text-primary hover:underline">
                View member record
              </Link>
            )}
          </div>
          {application.status === "REJECTED" && application.rejectionReason && (
            <p className="mt-2 text-foreground-muted">Reason sent to applicant: {application.rejectionReason}</p>
          )}
          {application.status === "APPROVED" && application.messageToApplicant && (
            <p className="mt-2 text-foreground-muted">Message sent to applicant: {application.messageToApplicant}</p>
          )}
          {application.status === "APPROVED" && application.privateNoteForMember && (
            <p className="mt-2 text-foreground-muted">
              Private note for member: {application.privateNoteForMember}
            </p>
          )}
        </div>
      )}

      {showDecisionCard && (
        <div className="surface-card p-6">
          <p className="mb-4 text-sm font-medium">
            {application.status === "APPROVED"
              ? "Share login details"
              : application.status === "REJECTED"
                ? "Resend rejection notice"
                : "Decision"}
          </p>
          <DecisionPanel
            applicationId={application.id}
            status={application.status}
            canDecide={canDecide}
            rejectionReason={application.rejectionReason}
            applicant={{
              name: application.personal.fullName,
              email: application.contact.email,
              phone: application.contact.phone,
            }}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Contact">
          <Field label="Email" value={application.contact.email} />
          <Field label="Phone" value={application.contact.phone} />
          <Field
            label="Address"
            value={`${application.contact.addressLine1}${
              application.contact.addressLine2 ? ", " + application.contact.addressLine2 : ""
            }, ${application.contact.city}, ${application.contact.state} ${application.contact.pincode}`}
          />
        </Section>

        <Section title="Personal">
          <Field label="Date of birth" value={application.personal.dateOfBirth} />
          <Field label="Gender" value={application.personal.gender} />
          <Field label="Father / spouse name" value={application.personal.fatherOrSpouseName} />
        </Section>

        <Section title="Professional">
          <Field label="Occupation" value={application.professional.occupation} />
          <Field label="Employer" value={application.professional.employer ?? "—"} />
          <Field
            label="Monthly income"
            value={
              application.professional.monthlyIncome != null
                ? `₹${application.professional.monthlyIncome.toLocaleString("en-IN")}`
                : "—"
            }
          />
          <Field label="Employment type" value={application.professional.employmentType} />
        </Section>

        <Section title="Nominee">
          <Field label="Name" value={application.nominee.fullName} />
          <Field label="Relationship" value={application.nominee.relationship} />
          <Field label="Share" value={`${application.nominee.sharePercentage}%`} />
        </Section>

        <Section title="Bank">
          <Field label="Account holder" value={application.bank.accountHolderName} />
          <Field label="Account number" value={application.bank.accountNumber} />
          <Field label="IFSC" value={application.bank.ifscCode} />
          <Field label="Bank" value={`${application.bank.bankName}, ${application.bank.branch}`} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-6">
      <p className="mb-3 text-sm font-medium text-foreground-muted">{title}</p>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
