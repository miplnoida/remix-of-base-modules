/**
 * Award 360 — typed view models. Never expose raw DB rows to UI.
 * BN-AWARD360-V2.
 */

export type Award360TabKey =
  | 'overview'
  | 'pensioner'
  | 'claim'
  | 'product'
  | 'beneficiaries'
  | 'schedule'
  | 'payments'
  | 'life-certificates'
  | 'medical'
  | 'suspensions'
  | 'overpayments'
  | 'communications'
  | 'audit';

export const AWARD_360_TABS: Award360TabKey[] = [
  'overview',
  'pensioner',
  'claim',
  'product',
  'beneficiaries',
  'schedule',
  'payments',
  'life-certificates',
  'medical',
  'suspensions',
  'overpayments',
  'communications',
  'audit',
];

export interface Award360Header {
  awardId: string;
  awardNumber: string | null;
  payeeName: string | null;
  ssnMasked: string | null;
  benefitName: string | null;
  benefitCode: string | null;
  awardType: string | null;
  status: string | null;
  baseAmount: number | null;
  currentRate: number | null;
  currency: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  productVersion: string | null;
  lastRefreshedAt: string;
}

export interface Award360SummaryCard {
  key: string;
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'breach' | 'muted';
  hint?: string;
}

export type AlertSeverity = 'info' | 'warn' | 'breach';

export interface AwardAlert {
  key: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  tabTarget?: Award360TabKey;
}

export interface AwardPensionerProfile {
  fullName: string | null;
  ssnMasked: string | null;
  dob: string | null;
  age: number | null;
  sex: string | null;
  nationality: string | null;
  isDeceased: boolean;
  dateOfDeath: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  residentialAddress: string | null;
  mailingAddress: string | null;
  preferredChannel: string | null;
  payeeDiffersFromPensioner: boolean;
  payeeName: string | null;
  verifiedPaymentProfile: { method: string | null; accountMasked: string | null; verified: boolean } | null;
}

export interface AwardClaimSummary {
  claimId: string | null;
  claimNumber: string | null;
  status: string | null;
  productVersionId: string | null;
  submissionDate: string | null;
  claimDate: string | null;
  applicationChannel: string | null;
  priority: string | null;
  assignedOfficer: string | null;
  eligibilityResult: string | null;
  calculationResult: string | null;
  decisionStatus: string | null;
  approvalStatus: string | null;
  awardCreationDate: string | null;
  workbenchRoute: string | null; // /bn/claims/:claimId (no /workbench)
}

export interface AwardProductSummary {
  productId: string | null;
  productCode: string | null;
  productName: string | null;
  scheme: string | null;
  branch: string | null;
  category: string | null;
  paymentType: string | null;
  status: string | null;
  versionId: string | null;
  versionNumber: string | null;
  versionStatus: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  country: string | null;
  benefitDurationType: string | null;
}

export interface AwardBeneficiaryItem {
  id: string;
  fullName: string | null;
  ssnMasked: string | null;
  relationship: string | null;
  sharePercent: number | null;
  shareAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  bankAccountMasked: string | null;
  bankCode: string | null;
  notes: string | null;
  enteredBy: string | null;
  enteredAt: string | null;
  modifiedBy: string | null;
  modifiedAt: string | null;
  hasPaymentDetails: boolean;
  isExpired: boolean;
  validationKeys: string[];
}

export interface AwardScheduleItem {
  id: string;
  schedulePeriod: string | null;
  dueDate: string | null;
  grossAmount: number | null;
  deductions: number | null;
  netAmount: number | null;
  status: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  paymentInstructionId: string | null;
  notes: string | null;
}

export interface AwardPaymentItem {
  id: string;
  reference: string;
  dueDate: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  accountMasked: string | null;
  status: string | null;
  paidDate: string | null;
  cancelReason: string | null;
}

export interface AwardLifeCertificateItem {
  id: string;
  requiredPeriod: string | null;
  dueDate: string | null;
  submittedDate: string | null;
  verifiedDate: string | null;
  verificationMethod: string | null;
  status: string | null;
  daysOverdue: number;
  remarks: string | null;
}

export interface AwardMedicalReviewItem {
  id: string;
  reviewType: string | null;
  scheduledDate: string | null;
  provider: string | null;
  status: string | null;
  completedDate: string | null;
  outcome: string | null;
  nextReviewDate: string | null;
  remarks: string | null;
  enteredAt: string | null;
  enteredBy: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
  /** Derived: not completed/cancelled and scheduledDate < today. */
  isOverdue: boolean;
  /** True when sensitive-medical columns were masked for this row. */
  sensitiveMasked: boolean;
}

export interface AwardSuspensionItem {
  id: string;
  eventStatus: string | null;
  displayStatus: string | null;
  suspensionType: string | null;
  /** Canonical column: bn_award_suspension_event.suspended_from */
  suspendedFrom: string | null;
  /** Canonical column: bn_award_suspension_event.suspended_to */
  suspendedTo: string | null;
  /** Canonical column: bn_award_suspension_event.resumed_at */
  resumedAt: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  proposedBy: string | null;
  /** Derived from open workflow task metadata.approval_level */
  currentApprovalLevel: number | null;
  /** Derived from open workflow task metadata.workbasket_id */
  workbasketId: string | null;
  workflowInstanceId: string | null;
  enteredAt: string | null;
}

export interface AwardOverpaymentItem {
  id: string;
  reference: string; // derived from id
  detectedDate: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  originalAmount: number | null;
  recoveredAmount: number | null;
  outstandingAmount: number | null;
  recoveryMethod: string | null;
  recoveryStatus: string | null;
  reasonCode: string | null;
  remarks: string | null;
}

export interface AwardCommunicationItem {
  id: string;
  createdAt: string | null;
  eventCode: string | null;
  channel: string | null;
  recipientType: string | null;
  recipientAddressMasked: string | null;
  templateId: string | null;
  subject: string | null;
  status: string | null;
  providerMessageId: string | null;
  letterId: string | null;
  errorMessage: string | null;
  retryCount: number | null;
  lastRetryAt: string | null;
  correlationId: string | null;
}

export interface AwardAuditItem {
  id: string;
  timestamp: string;
  domain: string; // AWARD | RATE | STATUS | SUSPENSION | AUDIT | ...
  action: string;
  actor: string | null;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  correlationId: string | null;
  severity: string | null;
  /** Canonical source table (bn_award_status_event, bn_award_rate_history, bn_award_suspension_event, core_audit_log). */
  sourceTable?: string;
  /** Raw source row primary key (without the domain prefix used in `id`). */
  sourceRecordId?: string;
}

/** BN-AWARD360-B4B — Typed audit source status (per canonical source). */
export type AwardAuditSourceKey = 'status' | 'rate' | 'suspension' | 'central';

export interface AwardAuditSourceStatus {
  key: AwardAuditSourceKey;
  loaded: boolean;
  restricted: boolean;
  error: string | null;
}

export interface AwardAuditSummary {
  totalRows: number;
  statusEvents: number;
  rateEvents: number;
  suspensionEvents: number;
  centralAuditEvents: number;
  warnEvents: number;
  eventsWithCorrelation: number;
  sourceWarningCount: number;
}

/**
 * BN-AWARD360-B4B-C1 — Filter facets derived from the complete merged audit
 * timeline BEFORE any filter/paging is applied. Values are unique, sorted
 * ascending, and exclude null/empty strings.
 */
export interface AwardAuditFacets {
  domains: string[];
  actions: string[];
  severities: string[];
}


export interface AwardActionAvailability {
  action: string;
  visible: boolean;
  enabled: boolean;
  reason: string;
  targetRoute?: string;
}

export interface Award360Overview {
  header: Award360Header;
  summaryCards: Award360SummaryCard[];
  alerts: AwardAlert[];
  nextActions: { key: string; label: string; targetRoute: string }[];
  recentActivity: AwardAuditItem[];
  warnings: string[];
}
