import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { collections } from "@/lib/db/collections";
import { generateId } from "@/lib/db/ids";
import type { FinancialTransaction, FinancialTransactionType } from "@/types/domain";

/**
 * The society-wide fund balance lives in a single singleton document. Every ledger entry
 * read-then-writes it inside the SAME Firestore transaction as the entry itself (PRD §37),
 * so `fundBalanceAfter` on each ledger row is always exactly correct and two concurrent
 * contributions can never race each other into an inconsistent balance — Firestore
 * transactions abort and retry automatically on contention.
 *
 * IMPORTANT: Firestore transactions require every `tx.get` to happen before any `tx.set` /
 * `tx.update` in that transaction. This module is therefore split into a read step
 * (`readFundAggregate`, call it alongside your other reads) and a write step
 * (`writeLedgerEntry`, call it alongside your other writes) — never call both back-to-back
 * after other writes have already been queued on the same transaction.
 */
const FUND_AGGREGATE_DOC = "fundAggregate";

export interface FundAggregate {
  totalFund: number;
  totalContributed: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalOutstanding: number;
  updatedAt: number;
}

const EMPTY_FUND: FundAggregate = {
  totalFund: 0,
  totalContributed: 0,
  totalDisbursed: 0,
  totalRepaid: 0,
  totalOutstanding: 0,
  updatedAt: Date.now(),
};

export interface FundAggregateHandle {
  ref: DocumentReference;
  current: FundAggregate;
}

export async function readFundAggregate(tx: Transaction): Promise<FundAggregateHandle> {
  const ref = collections.societySettings().doc(FUND_AGGREGATE_DOC);
  const snap = await tx.get(ref);
  const current = snap.exists ? (snap.data() as FundAggregate) : EMPTY_FUND;
  return { ref, current };
}

export interface AppendLedgerEntryInput {
  type: FinancialTransactionType;
  /** Positive credits the fund (contribution, repayment), negative debits it (disbursement, refund/adjustment reversal). */
  amount: number;
  memberId: string | null;
  referenceId: string;
  referenceCollection: string;
  description: string;
  createdBy: string;
  correctsTransactionId?: string;
}

/** Pure write step — call only after `readFundAggregate` and all other reads for this transaction are done. */
export function writeLedgerEntry(
  tx: Transaction,
  fund: FundAggregateHandle,
  input: AppendLedgerEntryInput
): FinancialTransaction {
  const newBalance = fund.current.totalFund + input.amount;
  const deltas: Partial<FundAggregate> = { totalFund: newBalance, updatedAt: Date.now() };
  if (input.type === "CONTRIBUTION") deltas.totalContributed = fund.current.totalContributed + input.amount;
  if (input.type === "LOAN_DISBURSEMENT") deltas.totalDisbursed = fund.current.totalDisbursed + Math.abs(input.amount);
  if (input.type === "REPAYMENT") deltas.totalRepaid = fund.current.totalRepaid + input.amount;

  tx.set(fund.ref, { ...fund.current, ...deltas }, { merge: true });

  const id = generateId();
  const entry: FinancialTransaction = {
    id,
    type: input.type,
    amount: input.amount,
    memberId: input.memberId,
    referenceCollection: input.referenceCollection,
    referenceId: input.referenceId,
    description: input.description,
    createdBy: input.createdBy,
    createdAt: Date.now(),
    fundBalanceAfter: newBalance,
    correctsTransactionId: input.correctsTransactionId ?? null,
  };
  tx.set(collections.financialTransactions().doc(id), entry);
  return entry;
}

export async function getFundAggregate(): Promise<FundAggregate> {
  const snap = await collections.societySettings().doc(FUND_AGGREGATE_DOC).get();
  return snap.exists ? (snap.data() as FundAggregate) : EMPTY_FUND;
}
