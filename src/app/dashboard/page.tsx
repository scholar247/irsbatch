import { CalendarCheck, Flame, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { collections } from "@/lib/db/collections";
import { getServerAuthContext } from "@/lib/rbac/server-guard";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import type { Contribution, Loan, LoanRepayment, Member, UserRecord } from "@/types/domain";

const BADGE_LABELS: Record<string, string> = {
  CONSISTENT_CONTRIBUTOR: "Consistent Contributor",
  LONG_TERM_MEMBER: "Long-Term Member",
  COMMUNITY_SUPPORTER: "Community Supporter",
  RESPONSIBLE_REPAYER: "Responsible Repayer",
  LOAN_CLEARED: "Loan Cleared",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardOverviewPage() {
  const auth = await getServerAuthContext();

  const [userSnap, memberSnap] = await Promise.all([
    collections.users().doc(auth.uid).get(),
    collections.members().doc(auth.uid).get(),
  ]);

  if (!memberSnap.exists) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-foreground-muted">
          We couldn&apos;t find a member profile for your account yet. If you just activated your account, this
          can take a moment — otherwise, please contact a staff member.
        </p>
      </div>
    );
  }

  const user = userSnap.data() as UserRecord;
  const member = memberSnap.data() as Member;

  const [recentContributions, activeLoan] = await Promise.all([
    collections
      .contributions()
      .where("memberId", "==", auth.uid)
      .orderBy("createdAt", "desc")
      .limit(6)
      .get()
      .then((s) => s.docs.map((d) => d.data() as Contribution)),
    member.aggregates.activeLoanId
      ? collections
          .loans()
          .doc(member.aggregates.activeLoanId)
          .get()
          .then((d) => (d.exists ? (d.data() as Loan) : null))
      : Promise.resolve(null),
  ]);

  const nextInstallment = activeLoan
    ? await collections
        .loanRepayments()
        .where("loanId", "==", activeLoan.id)
        .where("status", "in", ["PENDING", "PARTIAL"])
        .orderBy("installmentNumber", "asc")
        .limit(1)
        .get()
        .then((s) => (s.empty ? null : (s.docs[0].data() as LoanRepayment)))
    : null;

  const currentYear = new Date().getFullYear();
  const contributedThisYear = recentContributions
    .filter((c) => c.year === currentYear && c.status !== "REJECTED")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-foreground-muted">
          {greeting()}, {user.username}
        </p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Your Community Journey</h1>
      </div>

      {member.privateNote && (
        <div className="surface-card border-primary-soft bg-primary-soft/40 p-4 text-sm">
          <p className="font-medium text-primary">A note for you</p>
          <p className="mt-1 text-foreground-muted">{member.privateNote}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground-muted">Contribution Progress</p>
            <PiggyBank className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display mt-2 text-3xl font-medium">
            <AnimatedCounter value={member.aggregates.totalContributed} prefix="₹" />
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {member.aggregates.contributionMonthsCount} months contributed
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile
              icon={Flame}
              label="Current streak"
              value={`${member.aggregates.currentStreakMonths} mo`}
            />
            <StatTile icon={CalendarCheck} label={`${currentYear} so far`} value={`₹${contributedThisYear.toLocaleString("en-IN")}`} />
            <StatTile
              icon={Sparkles}
              label="Longest streak"
              value={`${member.aggregates.longestStreakMonths} mo`}
            />
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium">Contribution Timeline</p>
            {recentContributions.length === 0 ? (
              <EmptyState message="No contributions recorded yet. Once your first one lands, it'll show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {recentContributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                    <span>
                      {c.month}/{c.year}
                    </span>
                    <span className="text-foreground-muted">₹{c.amount.toLocaleString("en-IN")}</span>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground-muted">Loan Status</p>
            <Wallet className="h-4 w-4 text-accent" />
          </div>
          {activeLoan ? (
            <div className="mt-2">
              <p className="font-display text-2xl font-medium">
                <AnimatedCounter value={activeLoan.outstandingAmount} prefix="₹" />
              </p>
              <p className="mt-1 text-sm text-foreground-muted">Outstanding amount</p>
              <div className="mt-4 rounded-[var(--radius-md)] bg-surface-raised p-4">
                <p className="text-xs text-foreground-muted">Next installment</p>
                <p className="mt-1 font-medium">
                  {nextInstallment
                    ? `₹${nextInstallment.amountDue.toLocaleString("en-IN")} due ${new Date(
                        nextInstallment.dueDate
                      ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                    : "No installment due"}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState message="No active loan. You're debt-free." />
          )}
        </div>
      </div>

      <div className="surface-card p-6">
        <p className="mb-4 text-sm font-medium text-foreground-muted">Community Insights</p>
        {member.aggregates.badges.length === 0 ? (
          <EmptyState message="Badges you earn for consistency and responsibility will appear here." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {member.aggregates.badges.map((badge) => (
              <Badge key={badge} tone="accent">
                {BADGE_LABELS[badge] ?? badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-raised p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs text-foreground-muted">{label}</p>
      <p className="font-display text-lg font-medium">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Contribution["status"] }) {
  const tone = status === "VERIFIED" ? "success" : status === "REJECTED" ? "danger" : "primary";
  return (
    <Badge tone={tone as "success" | "danger" | "primary"} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-[var(--radius-md)] bg-surface-raised p-4 text-sm text-foreground-muted">{message}</p>;
}
