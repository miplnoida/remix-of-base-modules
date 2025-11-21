// Central Fee Configuration Types for Finance Module

export type FeeCategory = 
  | 'Legal'
  | 'Compliance'
  | 'Benefits'
  | 'Service'
  | 'Admin'
  | 'Audit'
  | 'Finance'
  | 'CaseManagement';

export type LegalSubCategory =
  | 'CaseInitiation'
  | 'Summons'
  | 'Judgment'
  | 'Enforcement'
  | 'PostJudgment'
  | 'Administrative';

export type FeeType = 'Fixed' | 'Percentage' | 'Formula';

export type FeeStatus = 'Active' | 'Inactive' | 'Draft';

export type FeeInstanceStatus = 
  | 'Pending'
  | 'Applied'
  | 'Waived'
  | 'PartiallyWaived'
  | 'Cancelled'
  | 'Reversed';

export type BaseType =
  | 'ArrearsAmount'
  | 'JudgmentAmount'
  | 'BenefitAmount'
  | 'ContributionAmount'
  | 'OutstandingBalance'
  | 'Custom';

export type TriggerType = 'Immediate' | 'Scheduled';

// Legal Event Types
export type LegalEventType =
  | 'OnLegalCaseCreated'
  | 'OnSummonsIssued'
  | 'OnSummonsFiled'
  | 'OnSummonsServed'
  | 'OnJudgmentRecorded'
  | 'OnWritIssued'
  | 'OnWarrantIssued'
  | 'OnExecutionStarted'
  | 'OnPaymentArrangement'
  | 'OnAdjournmentRequested';

// Compliance Event Types
export type ComplianceEventType =
  | 'OnPenaltyGenerated'
  | 'OnInspectionScheduled'
  | 'OnInspectionCompleted'
  | 'OnNoticeIssued'
  | 'OnEscalationToLegal';

// Benefits Event Types
export type BenefitsEventType =
  | 'OnBenefitApplicationSubmitted'
  | 'OnBenefitApproved'
  | 'OnBenefitRejected'
  | 'OnAppealFiled';

export type EventType = LegalEventType | ComplianceEventType | BenefitsEventType | string;

export interface ApplicabilityRules {
  events?: EventType[];
  conditions?: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'notIn';
    value: any;
  }[];
  requiresAll?: boolean; // If true, all conditions must match; if false, any condition
}

export interface FeeDefinition {
  feeId: string;
  feeCode: string;
  feeName: string;
  description: string;
  category: FeeCategory;
  subCategory?: LegalSubCategory | string;
  
  // Calculation
  feeType: FeeType;
  fixedAmount?: number;
  percentageRate?: number;
  baseType?: BaseType;
  formulaExpression?: string;
  
  // Tax & Compounding
  isTaxApplicable: boolean;
  taxCode?: string;
  isCompoundable: boolean;
  dependsOnFeeCode?: string;
  
  // Behavior
  isAutoApplied: boolean;
  allowManualOverride: boolean;
  allowWaiver: boolean;
  requiresApproval: boolean;
  
  // Applicability
  applicableModules: string[];
  applicabilityRules?: ApplicabilityRules;
  
  // Thresholds
  minAmount?: number;
  maxAmount?: number;
  
  // Validity
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Financial Mapping
  glCodeDebit: string;
  glCodeCredit: string;
  currency: string; // Default XCD
  
  // Scheduling (for recurring fees)
  triggerType?: TriggerType;
  scheduleExpression?: string; // CRON or offset like \"30 days after JudgmentDate\"
  
  // Notification
  notificationTemplateCode?: string;
  
  // Status
  status: FeeStatus;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FeeInstance {
  feeInstanceId: string;
  feeId: string;
  feeCode: string;
  
  // Context
  moduleName: string;
  contextEntityType: string; // 'LegalCase', 'Subcase', 'ComplianceCase', 'BenefitClaim', 'Employer', 'InsuredPerson', 'Invoice'
  contextEntityId: string;
  
  // Calculation Results
  baseAmount: number;
  calculatedAmount: number;
  taxAmount: number;
  totalAmount: number;
  
  // Status & Waiver
  status: FeeInstanceStatus;
  waiverRequestId?: string;
  
  // Financial
  postedToFinance: boolean;
  postedAt?: string;
  financeTransactionId?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  
  notes?: string;
}

export interface FeeCalculationContext {
  // Entity identifiers
  legalCaseId?: string;
  subcaseId?: string;
  partyId?: string;
  employerId?: string;
  insuredPersonId?: string;
  benefitClaimId?: string;
  complianceCaseId?: string;
  
  // Financial values
  judgmentAmount?: number;
  arrearsAmount?: number;
  benefitAmount?: number;
  contributionAmount?: number;
  outstandingBalance?: number;
  
  // Other context
  contributionType?: string;
  caseType?: string;
  [key: string]: any; // Allow additional context fields
}

export interface FeeCalculationResult {
  feeDefinition: FeeDefinition;
  baseAmount: number;
  calculatedAmount: number;
  taxAmount: number;
  totalAmount: number;
  applicable: boolean;
  reason?: string; // Why fee was or wasn't applied
}

export interface AppliedFeesResult {
  feeInstances: FeeInstance[];
  totalAmount: number;
  errors?: string[];
}
