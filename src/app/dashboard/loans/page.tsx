import { Wallet } from "lucide-react";
import { collections } from "@/lib/db/collections";
import { getServerAuthContext } from "@/lib/rbac/server-guard";
import { Badge } from "@/components/ui/badge";
import type { Loan, LoanRepayment, LoanStatus } from "@/types/domain";

const SUCCESS: LoanStatus[] = ["DISBURSED", "ACTIVE", "COMPLETED"];
const DANGER: LoanStatus[] = ["REJECTED", "DEFAULTED"];
const WARNING: LoanStatus[] = ["SUBMITTED", "UNDER_REVIEW"];

function StatusBadge({ status }: { status: LoanStatus }) {
  const tone = SUCCESS.includes(status)
    ? "success"
    : DANGER.includes(status)
      ? "danger"
      : WARNING.includes(status)
        ? "warning"
        : "primary";
  return (
    <Badge tone={tone as "success" | "danger" | "warning" | "primary"} className="capitalize">
      {status.toLowerCase().replace("_", " ")}
    </Badge>
  );
}

async function nextInstallmentFor(loanId: string): Promise<LoanRepayment | null> {
  const snap = await collections
    .loanRepayments()
    .where("loanId", "==", loanId)
    .where("status", "in", ["PENDING", "PARTIAL"])
    .orderBy("installmentNumber", "asc")
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
}

export default async function LoansPage() {
  const auth = await getServerAuthContext();
  const memberSnap = await collections.members().doc(auth.uid).get();

  if (!memberSnap.exists) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-foreground-muted">
          We couldn&apos;t find a member profile for your account, so there&apos;s no loan history to show.
          If you&apos;re staff rather than a member, this page doesn&apos;t apply to you.
        </p>
      </div>
    );
  }

  const loans = await collections
    .loans()
    .where("memberId", "==", auth.uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get()
    .then((snap) => snap.docs.map((d) => d.data()));

  const nextInstallments = await Promise.all(loans.map((loan) => nextInstallmentFor(loan.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Loans</h1>
        <p className="mt-1 text-sm text-foreground-muted">Your loan applications and repayment status.</p>
      </div>

      {loans.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Wallet className="mx-auto h-6 w-6 text-foreground-muted" />
          <p className="mt-3 text-sm text-foreground-muted">No loans yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan: Loan, i) => {
            const nextInstallment = nextInstallments[i];
            return (
              <div key={loan.id} className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground-muted">{loan.purpose}</p>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-foreground-muted">Requested</p>
                    <p className="font-display mt-0.5 text-lg font-medium">
                      ₹{loan.requestedAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Outstanding</p>
                    <p className="font-display mt-0.5 text-lg font-medium">
                      ₹{loan.outstandingAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Tenure</p>
                    <p className="font-display mt-0.5 text-lg font-medium">{loan.tenureMonths} mo</p>
                  </div>
                </div>
                {nextInstallment && (
                  <div className="mt-4 rounded-[var(--radius-md)] bg-surface-raised p-3 text-sm">
                    Next installment: ₹{nextInstallment.amountDue.toLocaleString("en-IN")} due{" "}
                    {new Date(nextInstallment.dueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
