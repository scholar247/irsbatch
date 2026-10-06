import { PiggyBank } from "lucide-react";
import { collections } from "@/lib/db/collections";
import { getServerAuthContext } from "@/lib/rbac/server-guard";
import { Badge } from "@/components/ui/badge";
import type { Contribution } from "@/types/domain";

function StatusBadge({ status }: { status: Contribution["status"] }) {
  const tone = status === "VERIFIED" ? "success" : status === "REJECTED" ? "danger" : "primary";
  return (
    <Badge tone={tone as "success" | "danger" | "primary"} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}

export default async function ContributionsPage() {
  const auth = await getServerAuthContext();
  const memberSnap = await collections.members().doc(auth.uid).get();

  if (!memberSnap.exists) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-foreground-muted">
          We couldn&apos;t find a member profile for your account, so there&apos;s no contribution history to
          show. If you&apos;re staff rather than a member, this page doesn&apos;t apply to you.
        </p>
      </div>
    );
  }

  const contributions = await collections
    .contributions()
    .where("memberId", "==", auth.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()
    .then((snap) => snap.docs.map((d) => d.data()));

  const totalVerified = contributions
    .filter((c) => c.status === "VERIFIED")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Contributions</h1>
        <p className="mt-1 text-sm text-foreground-muted">Your full contribution history.</p>
      </div>

      <div className="surface-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground-muted">Total verified</p>
          <PiggyBank className="h-4 w-4 text-primary" />
        </div>
        <p className="font-display mt-2 text-3xl font-medium">₹{totalVerified.toLocaleString("en-IN")}</p>
      </div>

      <div className="surface-card p-2">
        {contributions.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-foreground-muted">
            No contributions recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contributions.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-3">{c.month}/{c.year}</td>
                  <td className="px-3 py-3">₹{c.amount.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
