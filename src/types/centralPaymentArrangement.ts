// ============================================
// CENTRAL PAYMENT ARRANGEMENT TYPES
// Shared across Compliance, Legal, Finance
// ============================================

export enum ArrangementStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED'
}

export enum ArrangementSourceModule {
  COMPLIANCE = 'COMPLIANCE',
  LEGAL = 'LEGAL',
  FINANCE = 'FINANCE',
  BENEFITS = 'BENEFITS',
  OTHER = 'OTHER'
}

export enum ArrangementType {
  VOLUNTARY_PLAN = 'VOLUNTARY_PLAN',
  COURT_ORDERED_PLAN = 'COURT_ORDERED_PLAN',
  NEGOTIATED_PLAN = 'NEGOTIATED_PLAN',
  ADMINISTRATIVE_PLAN = 'ADMINISTRATIVE_PLAN'
}

export enum SourceType {
  VIOLATION = 'VIOLATION',
  LEGAL_SUBCASE = 'LEGAL_SUBCASE',
  COURT_ORDER = 'COURT_ORDER',
  ARREARS_PERIOD = 'ARREARS_PERIOD',
  BENEFIT_OVERPAYMENT = 'BENEFIT_OVERPAYMENT',
  INVOICE = 'INVOICE',
  INTEREST_PENALTY = 'INTEREST_PENALTY'
}

export enum InstallmentStatus {
  PLANNED = 'PLANNED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

// ============================================
// Main Arrangement Entity
// ============================================
export interface PaymentArrangement {
  id: string;
  arrangementNumber: string;
  employerId: string;
  employerName: string;
  versionNumber: number;
  status: ArrangementStatus;
  arrangementSourceModule: ArrangementSourceModule;
  arrangementType: ArrangementType;
  startDate: string;
  plannedEndDate?: string;
  totalArrangedAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  
  // Relations
  items: PaymentArrangementItem[];
  installments: PaymentScheduleInstallment[];
}

// ============================================
// Arrangement Items (Links to Dues)
// ============================================
export interface PaymentArrangementItem {
  id: string;
  paymentArrangementId: string;
  sourceModule: ArrangementSourceModule;
  sourceType: SourceType;
  sourceReferenceId: string;
  sourceDescription: string;
  originalOutstandingAmount: number;
  arrangedAmount: number;
  paidAmount: number;
  remainingBalance: number;
}

// ============================================
// Installment Schedule
// ============================================
export interface PaymentScheduleInstallment {
  id: string;
  paymentArrangementId: string;
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  status: InstallmentStatus;
  paidAmount: number;
  remainingAmount: number;
  lastPaymentDate?: string;
  isCourtOrdered: boolean;
  notes?: string;
}

// ============================================
// Payment Allocation
// ============================================
export interface PaymentAllocation {
  id: string;
  receiptId: string;
  paymentScheduleInstallmentId: string;
  allocatedAmount: number;
  allocationDate: string;
  notes?: string;
}

// ============================================
// Create Arrangement Request
// ============================================
export interface CreateArrangementRequest {
  employerId: string;
  arrangementSourceModule: ArrangementSourceModule;
  arrangementType: ArrangementType;
  startDate: string;
  plannedEndDate?: string;
  notes?: string;
  
  // Items to include
  items: CreateArrangementItemRequest[];
  
  // Schedule configuration
  scheduleType: 'EQUAL' | 'FIXED_AMOUNT' | 'CUSTOM';
  numberOfInstallments?: number;
  installmentAmount?: number;
  frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customInstallments?: CustomInstallmentInput[];
}

export interface CreateArrangementItemRequest {
  sourceModule: ArrangementSourceModule;
  sourceType: SourceType;
  sourceReferenceId: string;
  sourceDescription: string;
  originalOutstandingAmount: number;
  arrangedAmount: number;
}

export interface CustomInstallmentInput {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

// ============================================
// Employer Dues Summary (for selection)
// ============================================
export interface EmployerDuesSummary {
  employerId: string;
  employerName: string;
  
  // By module
  complianceDues: DueItem[];
  legalDues: DueItem[];
  financeDues: DueItem[];
  benefitsDues: DueItem[];
  
  totalOutstanding: number;
}

export interface DueItem {
  sourceModule: ArrangementSourceModule;
  sourceType: SourceType;
  sourceReferenceId: string;
  description: string;
  outstandingAmount: number;
  isInActiveArrangement: boolean;
  canBeIncluded: boolean;
}

// ============================================
// Arrangement Summary
// ============================================
export interface ArrangementSummary {
  totalArrangements: number;
  activeArrangements: number;
  completedArrangements: number;
  supersededArrangements: number;
  totalArrangedValue: number;
  totalPaidToDate: number;
  totalOutstanding: number;
  onTimePaymentRate: number;
}
