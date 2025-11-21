// Fee Waiver Module Types

import { FeeCategory } from './feeConfiguration';

export type WaiverType = 'Amount' | 'Percentage';
export type WaiverStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Cancelled';
export type InitiatorType = 'Officer' | 'Supervisor' | 'Manager' | 'Director' | 'System';

export interface FeeWaiverConfiguration {
  configId: string;
  feeCategory: FeeCategory;
  feeCode: string;
  feeName: string;
  allowWaiver: boolean;
  maxWaiverPercentage: number; // 0-100
  maxWaiverAmount: number; // XCD
  requiresJustification: boolean;
  allowedInitiators: InitiatorType[];
  minimumApprovalLevel: 'Supervisor' | 'Manager' | 'Director' | 'Board';
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdBy: string;
  createdOn: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
}

export interface FeeWaiverRequest {
  waiverRequestId: string;
  waiverNumber: string;
  
  // Fee Information
  feeCategory: FeeCategory;
  feeCode: string;
  feeName: string;
  originalFeeAmount: number; // XCD
  
  // Waiver Details
  waiverType: WaiverType;
  waiverAmount?: number; // For Amount type
  waiverPercentage?: number; // For Percentage type (0-100)
  calculatedWaiverAmount: number; // Computed based on type
  amountAfterWaiver: number; // Original - Calculated Waiver
  
  // Context
  contextModule: string; // Legal, Compliance, Benefits, etc.
  contextEntityType: string; // 'LegalCase', 'Invoice', 'BenefitClaim', etc.
  contextEntityId: string;
  contextReference: string; // Case Number, Invoice Number, etc.
  
  // Initiator Information
  initiatorType: InitiatorType;
  initiatorId: string;
  initiatorName: string;
  initiatorPosition: string;
  initiatedOn: string;
  
  // Payer/Beneficiary Information
  payerType: 'Employer' | 'InsuredPerson' | 'Other';
  payerId: string;
  payerName: string;
  payerIdentification: string; // TIN, SSN, etc.
  
  // Justification
  waiverReason: string;
  justificationDetails: string;
  supportingDocuments: {
    documentId: string;
    documentName: string;
    documentType: string;
    uploadedBy: string;
    uploadedOn: string;
  }[];
  
  // Workflow & Approval
  status: WaiverStatus;
  currentApprovalLevel: string;
  approvalHistory: FeeWaiverApproval[];
  
  // Financial Impact
  financialImpact: {
    lostRevenue: number;
    affectedGLAccount: string;
    financialYear: string;
    posted: boolean;
    postedOn?: string;
  };
  
  // Audit Trail
  createdBy: string;
  createdOn: string;
  submittedOn?: string;
  reviewedBy?: string;
  reviewedOn?: string;
  approvedBy?: string;
  approvedOn?: string;
  rejectedBy?: string;
  rejectedOn?: string;
  rejectionReason?: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
  
  // Additional
  internalNotes?: string;
  expiryDate?: string; // If waiver has time limit
}

export interface FeeWaiverApproval {
  approvalId: string;
  waiverRequestId: string;
  approvalLevel: string;
  approverType: 'Role' | 'Position';
  approverRoleId?: string;
  approverPositionId?: string;
  approverUserId: string;
  approverName: string;
  approvalAction: 'Approved' | 'Rejected' | 'RequestedChanges' | 'Forwarded';
  approvalDate: string;
  comments: string;
  sequenceOrder: number;
}

export interface FeeWaiverStatistics {
  totalRequests: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  totalWaivedAmount: number;
  averageWaiverPercentage: number;
  byCategory: {
    category: FeeCategory;
    count: number;
    totalAmount: number;
  }[];
  byInitiator: {
    initiatorType: InitiatorType;
    count: number;
    totalAmount: number;
  }[];
}
