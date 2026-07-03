/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
export interface CourtCase {
  caseID: string;
  linkedEmployerID?: string;
  linkedContributorID?: string;
  caseType: 'Employer Arrears' | 'Contributor Dispute' | 'Fraud' | 'Overpayment' | 'Appeal';
  caseStatus: 'Draft' | 'Filed' | 'Pending Hearing' | 'In Court' | 'Judgment Delivered' | 'Enforcement Ongoing' | 'Closed' | 'Settled';
  dateOpened: string;
  officerAssigned: string;
  caseNotes: string;
  nextHearingDate?: string;
  courtReferenceNumber?: string;
  employerName?: string;
  contributorName?: string;
}

export interface CaseDocument {
  documentID: string;
  caseID: string;
  documentType: 'Summons' | 'Affidavit' | 'Payroll Evidence' | 'Judgment' | 'Order' | 'Appeal Filing';
  uploadedBy: string;
  uploadDate: string;
  fileName: string;
  fileSize?: string;
}

export interface HearingJudgment {
  hearingID: string;
  caseID: string;
  hearingDate: string;
  courtNotes: string;
  outcome: 'Adjourned' | 'Judgment Reserved' | 'Judgment Delivered';
  judgmentSummary?: string;
  amountAwarded?: number;
  penalties?: number;
  paymentPlanDetails?: string;
}

export interface Enforcement {
  enforcementID: string;
  caseID: string;
  enforcementType: 'Garnishment' | 'Seizure of Assets' | 'Payment Plan' | 'Voluntary Settlement';
  enforcementStatus: 'Ongoing' | 'Completed' | 'Failed';
  amountOrdered: number;
  amountCollected: number;
  officerResponsible: string;
  dateCreated: string;
  notes?: string;
}

export interface LegalDashboardStats {
  totalOpenCases: number;
  casesByType: {
    employerArrears: number;
    contributorDispute: number;
    fraud: number;
    overpayment: number;
    appeal: number;
  };
  financialRecovery: {
    totalOrdered: number;
    totalCollected: number;
    collectionRate: number;
  };
  upcomingHearings: number;
  topEmployersInArrears: Array<{
    employerName: string;
    caseCount: number;
    amountOwed: number;
  }>;
}