import type {
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  AuditLogEntry,
  Contribution,
  DocumentRecord,
  FinancialTransaction,
  Grievance,
  Loan,
  LoanRepayment,
  Member,
  MembershipApplication,
  NotificationRecord,
  NotificationTemplate,
  RoleDefinition,
  RuleCategory,
  RuleItem,
  RulesAccessRequest,
  SessionRecord,
  UserRecord,
} from "@/types/domain";

/**
 * Firestore collection names, centralized so a rename is a one-line change. Every document
 * stores timestamps as epoch-millisecond numbers (not Firestore Timestamp) because every
 * write and read in this system goes through this one Next.js server — there is no
 * multi-client-clock skew to guard against, and it lets API responses serialize straight
 * to JSON for the Android client with no Timestamp->number conversion step.
 */
export const COLLECTIONS = {
  users: "users",
  sessions: "sessions",
  roles: "roles",
  membershipApplications: "membershipApplications",
  members: "members",
  contributions: "contributions",
  loans: "loans",
  loanRepayments: "loanRepayments",
  financialTransactions: "financialTransactions",
  auditLogs: "auditLogs",
  notifications: "notifications",
  notificationTemplates: "notificationTemplates",
  announcements: "announcements",
  grievances: "grievances",
  documents: "documents",
  rulesAccessRequests: "rulesAccessRequests",
  ruleCategories: "ruleCategories",
  ruleItems: "ruleItems",
  societySettings: "societySettings",
} as const;

/** Passthrough converter: gives each collection a typed CollectionReference<T> without remapping fields. */
function converterFor<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T) {
      return model;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

function typedCollection<T extends DocumentData>(name: string): CollectionReference<T> {
  return db().collection(name).withConverter(converterFor<T>());
}

export const collections = {
  users: () => typedCollection<UserRecord>(COLLECTIONS.users),
  sessions: () => typedCollection<SessionRecord>(COLLECTIONS.sessions),
  roles: () => typedCollection<RoleDefinition>(COLLECTIONS.roles),
  membershipApplications: () =>
    typedCollection<MembershipApplication>(COLLECTIONS.membershipApplications),
  members: () => typedCollection<Member>(COLLECTIONS.members),
  contributions: () => typedCollection<Contribution>(COLLECTIONS.contributions),
  loans: () => typedCollection<Loan>(COLLECTIONS.loans),
  loanRepayments: () => typedCollection<LoanRepayment>(COLLECTIONS.loanRepayments),
  financialTransactions: () =>
    typedCollection<FinancialTransaction>(COLLECTIONS.financialTransactions),
  auditLogs: () => typedCollection<AuditLogEntry>(COLLECTIONS.auditLogs),
  notifications: () => typedCollection<NotificationRecord>(COLLECTIONS.notifications),
  notificationTemplates: () =>
    typedCollection<NotificationTemplate>(COLLECTIONS.notificationTemplates),
  grievances: () => typedCollection<Grievance>(COLLECTIONS.grievances),
  documents: () => typedCollection<DocumentRecord>(COLLECTIONS.documents),
  rulesAccessRequests: () =>
    typedCollection<RulesAccessRequest>(COLLECTIONS.rulesAccessRequests),
  ruleCategories: () => typedCollection<RuleCategory>(COLLECTIONS.ruleCategories),
  ruleItems: () => typedCollection<RuleItem>(COLLECTIONS.ruleItems),
  societySettings: () => db().collection(COLLECTIONS.societySettings),
};

/**
 * Firestore composite indexes required (deploy via firestore.indexes.json):
 *  - contributions:        (memberId ASC, year DESC, month DESC)  -> member contribution timeline
 *  - contributions:        (status ASC, createdAt DESC)           -> staff verification queue
 *  - loans:                (memberId ASC, createdAt DESC)         -> member loan history
 *  - loans:                (status ASC, createdAt DESC)           -> staff/admin pending queue
 *  - loanRepayments:       (loanId ASC, installmentNumber ASC)    -> per-loan schedule
 *  - loanRepayments:       (status ASC, dueDate ASC)              -> overdue tracking across all loans
 *  - financialTransactions:(memberId ASC, createdAt DESC)         -> member ledger view
 *  - auditLogs:            (entityCollection ASC, entityId ASC, timestamp DESC) -> entity history
 *  - membershipApplications:(status ASC, createdAt ASC)           -> review queue (FIFO)
 *  - notifications:        (recipientUid ASC, createdAt DESC)     -> notification center feed
 * Single-field indexes (createdAt, status, etc.) are automatic in Firestore.
 */
