// ============================================
// PAYMENT ARRANGEMENT - COMPONENT-BASED TYPES
// ============================================

import { ContributionComponent } from './contributionComponents';

// ============================================
// Component Breakdown for Arrangements
// ============================================
export interface ComponentInstallmentBreakdown {
  component: ContributionComponent;
  principalAmount: number;
  penaltyAmount: number;
  interestAmount: number;
  totalAmount: number;
}

// ============================================
// Enhanced Installment with Component Tracking
// ============================================
export interface ComponentInstallmentRecord {
  id: string;
  arrangementId: string;
  installmentNumber: number;
  dueDate: string;
  totalAmount: number;
  componentBreakdown: ComponentInstallmentBreakdown[];
  
  // Payment Status
  paid: boolean;
  paidAmount?: number;
  paidDate?: string;
  paymentReference?: string;
  
  // Overdue Tracking
  overdue: boolean;
  daysPastDue?: number;
  
  // Partial Payment Support
  partialPaymentAllowed: boolean;
  remainingBalance?: number;
}

// ============================================
// Enhanced Payment Arrangement with Components
// ============================================
export interface ComponentPaymentArrangement {
  id: string;
  arrangementNumber: string;
  caseId: string;
  employerId: string;
  employerName: string;
  
  // Component-Level Financial Breakdown
  componentBreakdown: ComponentInstallmentBreakdown[];
  totalDebtAmount: number;
  
  // Down Payment
  downPaymentRequired: boolean;
  downPaymentAmount: number;
  downPaymentPaid: boolean;
  downPaymentDate?: string;
  downPaymentReference?: string;
  
  // Installment Configuration
  installmentType: 'EQUAL' | 'CUSTOM';
  numberOfInstallments: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  
  // Schedule
  startDate: string;
  endDate: string;
  nextDueDate?: string;
  
  // Installments
  installments: ComponentInstallmentRecord[];
  
  // Status Tracking
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
  installmentsPaid: number;
  installmentsOverdue: number;
  totalPaid: number;
  outstandingBalance: number;
  
  // Payment Compliance
  consecutiveMissedPayments: number;
  onTimePaymentRate: number; // percentage
  lastPaymentDate?: string;
  
  // Terms & Conditions
  terms: string;
  conditions: string[];
  requiresCurrentPayments: boolean;
  defaultThreshold: number; // Number of missed payments before default
  
  // Approval Workflow
  createdDate: string;
  createdBy: string;
  createdByName: string;
  approvedDate?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectedDate?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Agreement
  agreementSigned: boolean;
  signedDate?: string;
  signatureData?: string;
  agreementDocumentUrl?: string;
  
  // Default Tracking
  defaultDate?: string;
  defaultReason?: string;
  missedInstallmentIds: string[];
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

// ============================================
// Arrangement Creation Request
// ============================================
export interface CreateArrangementRequest {
  caseId: string;
  employerId: string;
  componentBreakdown: ComponentInstallmentBreakdown[];
  
  // Down Payment
  downPaymentRequired: boolean;
  downPaymentAmount?: number;
  
  // Installment Configuration
  installmentType: 'EQUAL' | 'CUSTOM';
  numberOfInstallments?: number; // Required for EQUAL
  customInstallments?: CustomInstallmentInput[]; // Required for CUSTOM
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  startDate: string;
  
  // Terms
  terms: string;
  conditions: string[];
  requiresCurrentPayments: boolean;
  defaultThreshold: number;
  
  // Notes
  notes?: string;
}

export interface CustomInstallmentInput {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  componentBreakdown: ComponentInstallmentBreakdown[];
}

// ============================================
// Arrangement Status Summary
// ============================================
export interface ArrangementStatusSummary {
  totalArrangements: number;
  activeArrangements: number;
  completedArrangements: number;
  defaultedArrangements: number;
  totalValueActive: number;
  totalPaidToDate: number;
  totalOutstanding: number;
  onTimePaymentRate: number;
}
