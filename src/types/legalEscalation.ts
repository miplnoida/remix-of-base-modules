// ============================================
// LEGAL ESCALATION TYPES
// ============================================

// ============================================
// ENUMS: Escalation Rule Types
// ============================================
export enum EscalationRuleType {
  AGE_THRESHOLD = 'AGE_THRESHOLD',
  AMOUNT_THRESHOLD = 'AMOUNT_THRESHOLD',
  BEHAVIOUR_THRESHOLD = 'BEHAVIOUR_THRESHOLD',
  RISK_THRESHOLD = 'RISK_THRESHOLD',
  COMBINED = 'COMBINED'
}

export enum EscalationTriggerCondition {
  AND = 'AND',
  OR = 'OR'
}

export enum LegalReferralStatus {
  DRAFT = 'DRAFT',
  SUBMITTED_TO_LEGAL = 'SUBMITTED_TO_LEGAL',
  ACCEPTED_BY_LEGAL = 'ACCEPTED_BY_LEGAL',
  REJECTED = 'REJECTED',
  IN_LEGAL_PROCEEDINGS = 'IN_LEGAL_PROCEEDINGS',
  CLOSED = 'CLOSED'
}

// ============================================
// INTERFACES: Legal Escalation Policy
// ============================================
export interface LegalEscalationRule {
  id: string;
  ruleName: string;
  ruleType: EscalationRuleType;
  description: string;
  enabled: boolean;
  priority: number;
  
  // Age Threshold Settings
  ageDaysOverdue?: number;
  consecutiveMonthsMissing?: number;
  
  // Amount Threshold Settings
  totalArrearsThreshold?: number;
  singlePeriodThreshold?: number;
  
  // Behaviour Threshold Settings
  noticesSentMinimum?: number;
  noResponseDays?: number;
  paymentPlanBreachesCount?: number;
  auditRefusedCount?: number;
  
  // Risk Threshold Settings
  riskBandMinimum?: string; // 'High', 'Critical'
  riskScoreMinimum?: number;
  combineWithAgeThreshold?: boolean;
  
  // Trigger Condition
  triggerCondition: EscalationTriggerCondition;
  
  // Actions
  autoMarkLegalRecommended: boolean;
  notifyComplianceOfficer: boolean;
  notifySupervisor: boolean;
  
  // Metadata
  createdDate: string;
  createdBy: string;
  updatedDate?: string;
  updatedBy?: string;
}

export interface LegalEscalationPolicy {
  id: string;
  policyName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  rules: LegalEscalationRule[];
  evaluationFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  lastEvaluationDate?: string;
  nextEvaluationDate?: string;
  createdDate: string;
  createdBy: string;
  updatedDate?: string;
  updatedBy?: string;
}

// ============================================
// INTERFACES: Legal Recommendation
// ============================================
export interface LegalRecommendation {
  id: string;
  employerId: string;
  employerName: string;
  employerZone: string;
  riskBand: string;
  riskScore: number;
  
  // Qualifying Subcases
  qualifyingSubcaseIds: string[];
  subcaseSummary: {
    subcaseId: string;
    caseNumber: string;
    caseType: string;
    periodFrom: string;
    periodTo: string;
    principalAmount: number;
    penaltyAmount: number;
    interestAmount: number;
    totalAmount: number;
  }[];
  
  // Financial Summary
  totalPrincipal: number;
  totalPenalties: number;
  totalInterest: number;
  grandTotal: number;
  
  // Escalation Reasons
  triggeredRules: {
    ruleId: string;
    ruleName: string;
    reason: string;
  }[];
  
  // Status
  recommendedDate: string;
  status: 'PENDING_REVIEW' | 'APPROVED_FOR_REFERRAL' | 'REFERRAL_CREATED' | 'REJECTED';
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
  
  // Linked Legal Referral
  legalReferralId?: string;
}

// ============================================
// INTERFACES: Legal Referral
// ============================================
export interface LegalReferralHeader {
  id: string;
  referralNumber: string;
  employerId: string;
  employerName: string;
  employerZone: string;
  
  // Financial Summary
  totalPrincipal: number;
  totalPenalties: number;
  totalInterest: number;
  grandTotal: number;
  
  // Periods Coverage
  periodFrom: string;
  periodTo: string;
  periodsCount: number;
  
  // Compliance Narrative
  complianceHistory: string;
  noticesSent: number;
  lastNoticeDate?: string;
  paymentPlanHistory?: string;
  auditFindings?: string;
  contactAttempts?: string;
  
  // Status and Workflow
  status: LegalReferralStatus;
  createdDate: string;
  createdBy: string;
  createdByName: string;
  submittedDate?: string;
  acceptedDate?: string;
  acceptedBy?: string;
  rejectedDate?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Legal Case Linkage
  legalCaseId?: string;
  courtCaseNumber?: string;
  legalOfficerAssigned?: string;
  
  // Supporting Documents
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedDate: string;
    uploadedBy: string;
  }[];
}

export interface LegalReferralLine {
  id: string;
  referralId: string;
  subcaseId: string;
  caseNumber: string;
  caseType: string;
  periodFrom: string;
  periodTo: string;
  principalAmount: number;
  penaltyAmount: number;
  interestAmount: number;
  totalAmount: number;
  lineNotes?: string;
}

// ============================================
// INTERFACES: Legal Recommendation Queue Stats
// ============================================
export interface LegalRecommendationQueueStats {
  totalEmployers: number;
  totalSubcases: number;
  totalAmountAtRisk: number;
  byRiskBand: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byZone: {
    zoneName: string;
    count: number;
  }[];
  pendingReview: number;
  approvedForReferral: number;
  referralCreated: number;
}
