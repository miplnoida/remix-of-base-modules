// ============================================
// COMPLIANCE MODULE - COMPREHENSIVE TYPE DEFINITIONS
// ============================================

// ============================================
// ENUMS: Case Status (High-Level Lifecycle)
// ============================================
export enum CaseStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  ARRANGEMENT_ACTIVE = 'ARRANGEMENT_ACTIVE',
  ESCALATED_LEGAL = 'ESCALATED_LEGAL',
  COMPLETED = 'COMPLETED',
  CLOSED_NO_ACTION = 'CLOSED_NO_ACTION',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED'
}

// ============================================
// ENUMS: Case Stage (Compliance Department)
// ============================================
export enum ComplianceCaseStage {
  CSTG_NEW_CASE_CREATED = 'CSTG_NEW_CASE_CREATED',
  CSTG_ASSIGNED_TO_INSPECTOR = 'CSTG_ASSIGNED_TO_INSPECTOR',
  CSTG_PRELIMINARY_REVIEW = 'CSTG_PRELIMINARY_REVIEW',
  CSTG_NOTICE_1_ISSUED = 'CSTG_NOTICE_1_ISSUED',
  CSTG_NOTICE_2_ISSUED = 'CSTG_NOTICE_2_ISSUED',
  CSTG_FINAL_NOTICE_ISSUED = 'CSTG_FINAL_NOTICE_ISSUED',
  CSTG_INSPECTION_REQUIRED = 'CSTG_INSPECTION_REQUIRED',
  CSTG_INSPECTION_SCHEDULED = 'CSTG_INSPECTION_SCHEDULED',
  CSTG_INSPECTION_IN_PROGRESS = 'CSTG_INSPECTION_IN_PROGRESS',
  CSTG_AUDIT_REQUIRED = 'CSTG_AUDIT_REQUIRED',
  CSTG_AUDIT_IN_PROGRESS = 'CSTG_AUDIT_IN_PROGRESS',
  CSTG_FINDINGS_DRAFTED = 'CSTG_FINDINGS_DRAFTED',
  CSTG_AWAITING_EMPLOYER_RESPONSE = 'CSTG_AWAITING_EMPLOYER_RESPONSE',
  CSTG_PAYMENT_ARRANGEMENT_NEGOTIATION = 'CSTG_PAYMENT_ARRANGEMENT_NEGOTIATION',
  CSTG_PAYMENT_ARRANGEMENT_ACTIVE = 'CSTG_PAYMENT_ARRANGEMENT_ACTIVE',
  CSTG_PAYMENT_ARRANGEMENT_DEFAULT = 'CSTG_PAYMENT_ARRANGEMENT_DEFAULT',
  CSTG_COMPLIANCE_VERIFIED_NO_ISSUE = 'CSTG_COMPLIANCE_VERIFIED_NO_ISSUE',
  CSTG_LEGAL_RECOMMENDED = 'CSTG_LEGAL_RECOMMENDED',
  CSTG_READY_FOR_LEGAL_ESCALATION = 'CSTG_READY_FOR_LEGAL_ESCALATION'
}

// ============================================
// ENUMS: Case Stage (Legal Department)
// ============================================
export enum LegalCaseStage {
  LSTG_LEGAL_REVIEW = 'LSTG_LEGAL_REVIEW',
  LSTG_LEGAL_NOTICE_ISSUED = 'LSTG_LEGAL_NOTICE_ISSUED',
  LSTG_SUMMONS_PREPARED = 'LSTG_SUMMONS_PREPARED',
  LSTG_COURT_PROCEEDINGS = 'LSTG_COURT_PROCEEDINGS',
  LSTG_JUDGEMENT_RECEIVED = 'LSTG_JUDGEMENT_RECEIVED',
  LSTG_LEGAL_ENFORCEMENT = 'LSTG_LEGAL_ENFORCEMENT',
  LSTG_LEGAL_CLOSED = 'LSTG_LEGAL_CLOSED'
}

// Combined type for all case stages
export type CaseStage = ComplianceCaseStage | LegalCaseStage;

// ============================================
// ENUMS: Case Types
// ============================================
export enum CaseType {
  LATE_C3_SUBMISSION = 'LATE_C3_SUBMISSION',
  C3_NOT_SUBMITTED = 'C3_NOT_SUBMITTED',
  C3_SUBMITTED_NO_PAYMENT = 'C3_SUBMITTED_NO_PAYMENT',
  C3_VALIDATION_ERROR = 'C3_VALIDATION_ERROR',
  ARREARS_CASE = 'ARREARS_CASE',
  PAYMENT_ARRANGEMENT_DEFAULT = 'PAYMENT_ARRANGEMENT_DEFAULT',
  SCOUTING_UNREGISTERED_EMPLOYER = 'SCOUTING_UNREGISTERED_EMPLOYER',
  AUDIT_REQUIRED = 'AUDIT_REQUIRED'
}

// ============================================
// ENUMS: Weekly Plan Status
// ============================================
export enum WeeklyPlanStatus {
  PLAN_DRAFT = 'PLAN_DRAFT',
  PLAN_SUBMITTED = 'PLAN_SUBMITTED',
  PLAN_TBS = 'PLAN_TBS', // To Be Re-Submitted
  PLAN_APPROVED = 'PLAN_APPROVED'
}

// ============================================
// ENUMS: Notice Types
// ============================================
export enum NoticeType {
  LATE_C3_SUBMISSION = 'LATE_C3_SUBMISSION',
  C3_NOT_SUBMITTED = 'C3_NOT_SUBMITTED',
  PAYMENT_NOT_RECEIVED = 'PAYMENT_NOT_RECEIVED',
  FINAL_WARNING = 'FINAL_WARNING',
  AUDIT_SCHEDULED = 'AUDIT_SCHEDULED',
  PAYMENT_ARRANGEMENT_TERMS = 'PAYMENT_ARRANGEMENT_TERMS',
  ARRANGEMENT_DEFAULT = 'ARRANGEMENT_DEFAULT',
  LEGAL_WARNING = 'LEGAL_WARNING'
}

// ============================================
// INTERFACES: Compliance Case
// ============================================
export interface ComplianceCase {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  caseStatus: CaseStatus;
  caseStage: CaseStage;
  
  // Links
  employerId: string;
  employerName: string;
  employerZone: string;
  linkedC3Periods?: string[]; // e.g., ['2024-01', '2024-02']
  
  // Assignment
  assignedInspectorId?: string;
  assignedInspectorName?: string;
  assignedDate?: string;
  
  // Financial
  principalAmount: number;
  penaltyAmount: number;
  interestAmount: number;
  totalAmountDue: number;
  amountPaid: number;
  outstandingBalance: number;
  
  // Dates
  createdDate: string;
  dueDate?: string;
  lastActivityDate: string;
  escalationDate?: string;
  closedDate?: string;
  
  // Details
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  
  // Metadata
  createdBy: string;
  updatedBy?: string;
  updatedDate?: string;
}

// ============================================
// INTERFACES: Case Stage History
// ============================================
export interface CaseStageHistory {
  id: string;
  caseId: string;
  fromStage?: CaseStage;
  toStage: CaseStage;
  fromStatus?: CaseStatus;
  toStatus: CaseStatus;
  changedDate: string;
  changedBy: string;
  changedByName: string;
  reason?: string;
  notes?: string;
}

// ============================================
// INTERFACES: Weekly Plan
// ============================================
export interface WeeklyPlan {
  id: string;
  planNumber: string;
  inspectorId: string;
  inspectorName: string;
  weekStartDate: string;
  weekEndDate: string;
  status: WeeklyPlanStatus;
  
  // Workflow
  submittedDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  approvedByName?: string;
  supervisorComments?: string;
  
  // Planning
  plannedVisits: PlannedVisit[];
  totalPlannedVisits: number;
  completedVisits: number;
  
  // Metadata
  createdDate: string;
  createdBy: string;
  updatedDate?: string;
}

export interface PlannedVisit {
  id: string;
  planId: string;
  caseId?: string;
  employerId: string;
  employerName: string;
  visitType: 'C3_FOLLOW_UP' | 'PAYMENT_FOLLOW_UP' | 'AUDIT' | 'INSPECTION' | 'SCOUTING';
  scheduledDate: string;
  purpose: string;
  completed: boolean;
  completedDate?: string;
  notes?: string;
}

// ============================================
// INTERFACES: Field Activity (Check-In/Check-Out)
// ============================================
export interface FieldActivity {
  id: string;
  planId: string;
  plannedVisitId: string;
  caseId?: string;
  employerId: string;
  employerName: string;
  inspectorId: string;
  inspectorName: string;
  
  // Check-In
  checkInTime: string;
  checkInGPSLat: number;
  checkInGPSLng: number;
  checkInNotes?: string;
  
  // Check-Out
  checkOutTime?: string;
  checkOutGPSLat?: number;
  checkOutGPSLng?: number;
  checkOutNotes?: string;
  
  // Activity Details
  visitType: PlannedVisit['visitType'];
  contactPersonName?: string;
  contactPersonTitle?: string;
  contactPersonPhone?: string;
  
  // Findings
  findingsSummary?: string;
  recommendations?: string;
  proposedArrangement?: boolean;
  arrangementDetails?: string;
  
  // Evidence
  evidenceUploaded: boolean;
  evidenceCount: number;
  evidenceFiles: EvidenceFile[];
  
  // Working Papers
  workingPapersCount: number;
  workingPapers: WorkingPaper[];
  
  // Status
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  completedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewerComments?: string;
}

export interface EvidenceFile {
  id: string;
  activityId: string;
  fileName: string;
  fileType: 'PHOTO' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'SIGNED_FORM';
  fileSize: number;
  fileUrl: string;
  uploadedDate: string;
  description?: string;
  tags: string[];
}

export interface WorkingPaper {
  id: string;
  activityId: string;
  documentType: 'AUDIT_CHECKLIST' | 'INTERVIEW_NOTES' | 'WAGE_VERIFICATION' | 'SSN_CHECK' | 'GENERAL_NOTES';
  content: string;
  createdDate: string;
  updatedDate?: string;
}

// ============================================
// INTERFACES: Notice
// ============================================
export interface Notice {
  id: string;
  noticeNumber: string;
  caseId: string;
  employerId: string;
  employerName: string;
  noticeType: NoticeType;
  
  // Content
  subject: string;
  body: string;
  templateId?: string;
  
  // Delivery
  issuedDate: string;
  issuedBy: string;
  issuedByName: string;
  deliveryMethod: 'EMAIL' | 'POST' | 'HAND_DELIVERED' | 'REGISTERED_MAIL';
  deliveryStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED';
  deliveredDate?: string;
  
  // Response
  responseReceived: boolean;
  responseDate?: string;
  responseNotes?: string;
  
  // Follow-Up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
}

// ============================================
// INTERFACES: Payment Arrangement
// ============================================
export interface PaymentArrangement {
  id: string;
  arrangementNumber: string;
  caseId: string;
  employerId: string;
  employerName: string;
  
  // Financial
  totalDebtAmount: number;
  downPaymentAmount: number;
  downPaymentPaid: boolean;
  downPaymentDate?: string;
  installmentAmount: number;
  numberOfInstallments: number;
  totalInstallmentAmount: number;
  
  // Schedule
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  nextDueDate?: string;
  
  // Status
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
  installmentsPaid: number;
  installmentsOverdue: number;
  totalPaid: number;
  outstandingBalance: number;
  
  // Terms
  terms: string;
  conditions: string[];
  requiresCurrentPayments: boolean;
  
  // Approval
  createdDate: string;
  createdBy: string;
  approvedDate?: string;
  approvedBy?: string;
  approvedByName?: string;
  
  // Agreement
  agreementSigned: boolean;
  signedDate?: string;
  signatureData?: string; // Base64 signature
  agreementDocumentUrl?: string;
  
  // Default Tracking
  defaultDate?: string;
  defaultReason?: string;
  missedInstallments: InstallmentRecord[];
}

export interface InstallmentRecord {
  id: string;
  arrangementId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAmount?: number;
  paidDate?: string;
  paymentReference?: string;
  overdue: boolean;
  daysPastDue?: number;
}

// ============================================
// INTERFACES: Employer Statement (As of Date)
// ============================================
export interface EmployerStatement {
  employerId: string;
  employerName: string;
  asOfDate: string;
  generatedDate: string;
  generatedBy: string;
  
  // C3 Summary
  c3Submissions: {
    submitted: number;
    missing: number;
    late: number;
    onTime: number;
  };
  
  // Financial Summary
  financialSummary: {
    totalDue: number;
    principalDue: number;
    penaltiesDue: number;
    interestDue: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  
  // Arrangement Summary
  arrangementSummary?: {
    hasActiveArrangement: boolean;
    arrangementNumber?: string;
    installmentsPaid: number;
    totalInstallments: number;
    nextPaymentDue?: string;
    nextPaymentAmount?: number;
  };
  
  // Case Summary
  caseSummary: {
    openCases: number;
    activeCases: number;
    escalatedToLegal: number;
  };
  
  // Detailed Records
  c3Records: C3Record[];
  paymentRecords: PaymentRecord[];
  penaltyRecords: PenaltyRecord[];
  
  // Compliance Status
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'AT_RISK' | 'LEGAL';
  complianceRating: number; // 0-100
}

export interface C3Record {
  period: string; // YYYY-MM
  dueDate: string;
  submittedDate?: string;
  status: 'SUBMITTED' | 'MISSING' | 'LATE';
  amountDue: number;
  amountPaid: number;
  balance: number;
}

export interface PaymentRecord {
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  appliedToPeriod?: string;
}

export interface PenaltyRecord {
  period: string;
  penaltyType: 'LATE_SUBMISSION' | 'LATE_PAYMENT' | 'INTEREST';
  amount: number;
  calculatedDate: string;
  status: 'PENDING' | 'APPLIED' | 'WAIVED';
}

// ============================================
// INTERFACES: Compliance Settings
// ============================================
export interface ComplianceSettings {
  // C3 Submission Rules
  c3GracePeriodDays: number;
  c3AutoCreateCaseOnLate: boolean;
  c3AutoCreateCaseOnMissing: boolean;
  
  // Payment Rules
  paymentGracePeriodDays: number;
  paymentDueDateOffsetDays: number; // e.g., C3 + 15 days
  
  // Penalty Rules
  latePenaltyEnabled: boolean;
  latePenaltyAmount: number;
  latePenaltyPercentage?: number;
  latePenaltyCalculationMethod: 'FIXED' | 'PERCENTAGE';
  
  interestEnabled: boolean;
  interestRateAnnual: number;
  interestCalculationMethod: 'SIMPLE' | 'COMPOUND';
  interestCalculationFrequency: 'DAILY' | 'MONTHLY';
  
  // Audit Rules
  minimumAuditFrequencyMonths: number;
  riskBasedAuditEnabled: boolean;
  highRiskAuditFrequencyMonths?: number;
  
  // Escalation Rules
  autoEscalateToLegalAfterDays: number;
  autoEscalateAfterNotices: number;
  autoEscalateIfArrearsExceeds: number;
  
  // Inspector Rules
  autoAssignInspectorByZone: boolean;
  supervisorApprovalRequiredForArrangements: boolean;
  supervisorApprovalRequiredForWaivers: boolean;
}

// ============================================
// INTERFACES: Dashboard Stats
// ============================================
export interface ComplianceDashboardStats {
  // Case Overview
  totalCases: number;
  casesByStatus: Record<CaseStatus, number>;
  casesByType: Record<CaseType, number>;
  casesCreatedThisMonth: number;
  casesClosedThisMonth: number;
  
  // C3 Compliance
  totalEmployers: number;
  compliantEmployers: number;
  nonCompliantEmployers: number;
  complianceRate: number;
  
  // Financial
  totalArrears: number;
  arrearsCollectedThisMonth: number;
  activeArrangements: number;
  defaultedArrangements: number;
  
  // Inspector Performance
  totalInspectors: number;
  approvedPlansThisWeek: number;
  completedVisitsThisWeek: number;
  pendingVisits: number;
  
  // Legal Escalation
  casesEscalatedToLegal: number;
  casesEscalatedThisMonth: number;
}

// ============================================
// UTILITY TYPES
// ============================================
export interface Zone {
  id: string;
  zoneName: string;
  zoneCode: string;
  parishes: string[];
  assignedInspectors: string[];
}

export interface Inspector {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedZones: string[];
  isPrimary: boolean;
  activeFrom: string;
  activeTo?: string;
}
