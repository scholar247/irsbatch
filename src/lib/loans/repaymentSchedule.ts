import type { Transaction } from "firebase-admin/firestore";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import type { LoanRepayment } from "@/types/domain";

/**
 * Equal-principal, interest-free installment schedule — this is a member welfare fund, not
 * a commercial lender, and the PRD names no interest/amortization model, so we don't invent
 * one. If the society later wants interest, this is the single place to change.
 */
export function buildRepaymentSchedule(
  loanId: string,
  memberId: string,
  principal: number,
  tenureMonths: number,
  disbursedAt: number
): LoanRepayment[] {
  const base = Math.floor(principal / tenureMonths);
  const remainder = principal - base * tenureMonths;

  return Array.from({ length: tenureMonths }, (_, index) => {
    const installmentNumber = index + 1;
    const dueDate = addMonths(disbursedAt, installmentNumber);
    const amountDue = base + (installmentNumber === tenureMonths ? remainder : 0);
    const repayment: LoanRepayment = {
      id: generateId(),
      loanId,
      memberId,
      installmentNumber,
      dueDate,
      amountDue,
      amountPaid: 0,
      status: "PENDING",
      paidAt: null,
      recordedBy: null,
      receiptDocumentId: null,
    };
    return repayment;
  });
}

export function writeRepaymentSchedule(tx: Transaction, schedule: LoanRepayment[]): void {
  for (const repayment of schedule) {
    tx.set(collections.loanRepayments().doc(repayment.id), repayment);
  }
}

function addMonths(epochMs: number, months: number): number {
  const date = new Date(epochMs);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}
