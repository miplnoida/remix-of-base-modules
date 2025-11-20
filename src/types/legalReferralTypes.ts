// ============================================
// LEGAL REFERRAL TYPES - Component-Based
// ============================================

import { ContributionComponent, ComponentSubcase, LegalReferralComponentSummary } from './contributionComponents';

export interface LegalReferralDraft {
  id: string;
  employerId: string;
  employerName: string;
  employerZone: string;
  selectedSubcases: ComponentSubcase[];
  componentSummary: LegalReferralComponentSummary;
  complianceNarrative: string;
  noticesSent: number;
  lastNoticeDate?: string;
  paymentPlanHistory?: string;
  auditFindings?: string;
  contactAttempts?: string;
  attachments: ReferralAttachment[];
  createdBy: string;
  createdDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

export interface ReferralAttachment {
  id: string;
  fileName: string;
  fileType: string;
  uploadedDate: string;
  uploadedBy: string;
}

export interface LegalReferralSubmission {
  referralId: string;
  referralNumber: string;
  employerId: string;
  employerName: string;
  componentSummary: LegalReferralComponentSummary;
  selectedSubcaseIds: string[];
  periodFrom: string;
  periodTo: string;
  periodsCount: number;
  complianceHistory: string;
  noticesSent: number;
  lastNoticeDate?: string;
  paymentPlanHistory?: string;
  auditFindings?: string;
  contactAttempts?: string;
  attachments: ReferralAttachment[];
  submittedDate: string;
  submittedBy: string;
  submittedByName: string;
}
