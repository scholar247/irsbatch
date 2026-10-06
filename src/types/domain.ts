/**
 * Core domain types for the IRS Batch 2007 community platform.
 * These mirror the Firestore document shapes exactly (see src/lib/db/collections.ts
 * for collection paths and converters). Timestamps are stored as Firestore Timestamps
 * in the database but surface here as epoch milliseconds once serialized for API responses.
 */

// ---------------------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------------------

export const ROLES = ["MEMBER", "CLERK", "SECRETARY", "PRESIDENT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** Granular permission strings. Role -> permission mapping lives in Firestore (roles collection), not hardcoded. */
export const PERMISSIONS = [
  "member.view.self",
  "member.edit.self",
  "member.view.any",
  "member.edit.any",
  "member.suspend",
  "application.submit",
  "application.review",
  "application.approve",
  "contribution.record",
  "contribution.verify",
  "contribution.view.self",
  "contribution.view.any",
  "loan.create",
  "loan.review",
  "loan.approve",
  "loan.disburse",
  "loan.view.self",
  "loan.view.any",
  "repayment.record",
  "repayment.view.self",
  "repayment.view.any",
  "grievance.submit",
  "grievance.manage",
  "announcement.manage",
  "content.manage",
  "notification.template.manage",
  "report.view",
  "audit.view",
  "settings.manage",
  "session.manage.self",
  "session.manage.any",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface RoleDefinition {
  id: Role;
  label: string;
  permissions: Permission[];
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Users & Sessions (authentication identity, separate from membership profile)
// ---------------------------------------------------------------------------

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface UserRecord {
  id: string; // uid
  username: string;
  email: string;
  passwordHash: string;
  roles: Role[];
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
}

/** Public-safe projection of UserRecord returned from APIs. */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  status: UserStatus;
}

export interface SessionRecord {
  id: string;
  uid: string;
  refreshTokenHash: string;
  deviceLabel: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

// ---------------------------------------------------------------------------
// Membership Applications (multi-step onboarding)
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface PersonalDetails {
  fullName: string;
  dateOfBirth: string; // ISO date
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  fatherOrSpouseName: string;
  photoDocumentId?: string;
}

export interface ContactDetails {
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ProfessionalDetails {
  occupation: string;
  employer?: string;
  monthlyIncome?: number;
  employmentType: "SALARIED" | "SELF_EMPLOYED" | "RETIRED" | "OTHER";
}

export interface NomineeDetails {
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  phone?: string;
  sharePercentage: number;
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branch: string;
}

export interface Declaration {
  agreedToRules: boolean;
  agreedToDataUsage: boolean;
  signedAt: number;
}

export interface MembershipApplication {
  id: string;
  status: ApplicationStatus;
  personal: PersonalDetails;
  contact: ContactDetails;
  professional: ProfessionalDetails;
  nominee: NomineeDetails;
  bank: BankDetails;
  declaration: Declaration;
  reviewedBy: string | null;
  reviewedAt: number | null;
  approvedBy: string | null;
  approvedAt: number | null;
  rejectionReason: string | null;
  /** Optional note sent to the applicant alongside an approval (reject uses rejectionReason for this instead). */
  messageToApplicant: string | null;
  /** Set at approval time, copied onto the Member record at activation — visible only on that member's own dashboard, never before they're registered. */
  privateNoteForMember: string | null;
  linkedUserId: string | null; // set once the applicant's login account is created
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Members (post-approval profile + precomputed aggregates)
// ---------------------------------------------------------------------------

export type MemberStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface MemberAggregates {
  totalContributed: number;
  contributionMonthsCount: number;
  currentStreakMonths: number;
  longestStreakMonths: number;
  lastContributionPeriod: { month: number; year: number } | null;
  outstandingLoanAmount: number;
  activeLoanId: string | null;
  badges: BadgeCode[];
  milestonesReached: number[]; // e.g. [10000, 50000]
}

export interface Member {
  id: string; // same as uid
  membershipNumber: string;
  applicationId: string;
  status: MemberStatus;
  joinedAt: number;
  personal: PersonalDetails;
  contact: ContactDetails;
  aggregates: MemberAggregates;
  /** Staff note set at approval time — visible only to this member on their own dashboard. */
  privateNote: string | null;
  createdAt: number;
  updatedAt: number;
}

export type BadgeCode =
  | "CONSISTENT_CONTRIBUTOR"
  | "LONG_TERM_MEMBER"
  | "COMMUNITY_SUPPORTER"
  | "RESPONSIBLE_REPAYER"
  | "LOAN_CLEARED";

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export type ContributionStatus = "PENDING" | "RECORDED" | "VERIFIED" | "REJECTED";

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  month: number; // 1-12
  year: number;
  status: ContributionStatus;
  receiptDocumentId: string | null;
  recordedBy: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  createdAt: number;
  verifiedAt: number | null;
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export type LoanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "ACTIVE"
  | "PARTIAL"
  | "COMPLETED"
  | "DEFAULTED";

export interface LoanApprovalStep {
  role: Role;
  uid: string;
  decision: "APPROVED" | "REJECTED";
  comment: string | null;
  at: number;
}

export interface LoanEligibilitySnapshot {
  membershipDurationOk: boolean;
  contributionHistoryOk: boolean;
  existingLoanOk: boolean;
  repaymentHistoryOk: boolean;
  eligible: boolean;
  reasons: { code: string; label: string; status: "OK" | "WARNING" | "BLOCKED" }[];
  evaluatedAt: number;
}

export interface Loan {
  id: string;
  memberId: string;
  status: LoanStatus;
  requestedAmount: number;
  approvedAmount: number | null;
  tenureMonths: number;
  purpose: string;
  outstandingAmount: number;
  eligibilitySnapshot: LoanEligibilitySnapshot;
  approvalTrail: LoanApprovalStep[];
  disbursedAt: number | null;
  closedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Loan Repayments
// ---------------------------------------------------------------------------

export type RepaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";

export interface LoanRepayment {
  id: string;
  loanId: string;
  memberId: string;
  installmentNumber: number;
  dueDate: number;
  amountDue: number;
  amountPaid: number;
  status: RepaymentStatus;
  paidAt: number | null;
  recordedBy: string | null;
  receiptDocumentId: string | null;
}

// ---------------------------------------------------------------------------
// Financial Ledger (immutable)
// ---------------------------------------------------------------------------

export type FinancialTransactionType =
  | "CONTRIBUTION"
  | "LOAN_DISBURSEMENT"
  | "REPAYMENT"
  | "ADJUSTMENT"
  | "REFUND";

export interface FinancialTransaction {
  id: string;
  type: FinancialTransactionType;
  /** Signed amount: positive credits the society fund, negative debits it. */
  amount: number;
  memberId: string | null;
  referenceCollection: string;
  referenceId: string;
  description: string;
  createdBy: string;
  createdAt: number;
  fundBalanceAfter: number;
  /** Set only for ADJUSTMENT/REFUND entries that correct a prior entry. */
  correctsTransactionId: string | null;
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRoles: Role[];
  action: string;
  entityCollection: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationEvent =
  | "MEMBERSHIP_APPROVED"
  | "MEMBERSHIP_REJECTED"
  | "CONTRIBUTION_RECORDED"
  | "CONTRIBUTION_PENDING"
  | "LOAN_SUBMITTED"
  | "LOAN_APPROVED"
  | "LOAN_REJECTED"
  | "LOAN_DISBURSED"
  | "REPAYMENT_RECEIVED"
  | "INSTALLMENT_DUE"
  | "LOAN_COMPLETED"
  | "ANNOUNCEMENT"
  | "RULES_ACCESS_REQUESTED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

export interface NotificationRecord {
  id: string;
  recipientUid: string;
  event: NotificationEvent;
  title: string;
  body: string;
  deepLink: string | null;
  channelsSent: NotificationChannel[];
  readAt: number | null;
  createdAt: number;
}

export interface NotificationTemplate {
  id: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  subject: string | null; // EMAIL only
  body: string; // supports {{placeholders}}
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Content, Announcements, Grievances, Documents
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "MEMBERS" | "STAFF";
  publishedBy: string;
  publishedAt: number;
}

export type GrievanceStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface Grievance {
  id: string;
  memberId: string;
  subject: string;
  description: string;
  status: GrievanceStatus;
  assignedTo: string | null;
  resolution: string | null;
  createdAt: number;
  updatedAt: number;
}

export type DocumentCategory = "ID_PROOF" | "RECEIPT" | "LOAN_FILE" | "NOMINEE_DOC" | "PHOTO";

export interface DocumentRecord {
  id: string;
  ownerUid: string;
  category: DocumentCategory;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  relatedCollection: string | null;
  relatedId: string | null;
  uploadedAt: number;
}

export interface RulesAccessRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  ip: string | null;
  requestedAt: number;
}

// ---------------------------------------------------------------------------
// Rules & Regulations content (categorized, admin-managed)
// ---------------------------------------------------------------------------

export interface RuleCategory {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface RuleItem {
  id: string;
  categoryId: string;
  title: string;
  body: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
