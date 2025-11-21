export type BeneficiaryStatus = 
  | 'ACTIVE'
  | 'SUSPENDED_NO_LIFE_CERT'
  | 'SUSPENDED_INVESTIGATION'
  | 'SUSPENDED_OVERPAYMENT'
  | 'DECEASED'
  | 'TERMINATED';

export type LifeCertificateStatus = 
  | 'NOT_REQUIRED'
  | 'REQUIRED_PENDING'
  | 'RECEIVED_VALID'
  | 'EXPIRED';

export type PaymentMethod = 'EFT' | 'CHEQUE' | 'CASH';

export type PayOffice = 'ST_KITTS' | 'NEVIS' | 'OTHER';

export type PayRunStatus = 
  | 'DRAFT'
  | 'CALCULATED'
  | 'APPROVED'
  | 'POSTED'
  | 'CLOSED';

export type APBatchStatus = 'OPEN' | 'POSTED' | 'CLOSED';

export type APInvoiceStatus = 'OPEN' | 'PAID' | 'CANCELLED';

export type APPaymentStatus = 
  | 'UNPRINTED'
  | 'PRINTED'
  | 'SENT'
  | 'CLEARED'
  | 'VOIDED';

export interface LongTermBeneficiary {
  id: string;
  insuredPersonId: string;
  insuredPersonName: string;
  insuredPersonSSN: string;
  primaryBenefitType: 'AGE' | 'INVALIDITY' | 'ASSISTANCE' | 'SURVIVORS';
  benefitAwardId: string;
  status: BeneficiaryStatus;
  startDate: string;
  endDate?: string;
  monthlyBenefitAmount: number;
  otherAmounts?: Record<string, number>;
  paymentFrequency: 'MONTHLY';
  paymentMethod: PaymentMethod;
  bankDetailsId?: string;
  bankAccountNumber?: string;
  bankName?: string;
  payOffice: PayOffice;
  nextPaymentDueDate: string;
  lastPaymentDate?: string;
  lifeCertificateStatus: LifeCertificateStatus;
  lifeCertificateLastReceivedDate?: string;
  lifeCertificateNextDueDate?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LifeCertificateRecord {
  id: string;
  beneficiaryId: string;
  receivedDate: string;
  method: 'IN_PERSON' | 'POSTAL' | 'SCANNED' | 'EMAIL';
  outcome: 'ALIVE' | 'DECEASED' | 'UNCONFIRMED';
  recordedBy: string;
  notes?: string;
  documentId?: string;
}

export interface BenefitPayRun {
  id: string;
  payRunName: string;
  benefitTypesIncluded: string[];
  periodYear: number;
  periodMonth: number;
  payDate: string;
  status: PayRunStatus;
  totalBeneficiariesCount: number;
  totalGrossAmount: number;
  totalDeductionsAmount: number;
  totalNetAmount: number;
  glSummary?: GLSummary;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  filters?: PayRunFilters;
}

export interface PayRunFilters {
  payOffice?: PayOffice;
  paymentMethod?: PaymentMethod;
  excludeSuspended: boolean;
  includeOverride: boolean;
}

export interface BenefitPayRunDetail {
  id: string;
  payRunId: string;
  beneficiaryId: string;
  insuredPersonId: string;
  insuredPersonName: string;
  insuredPersonSSN: string;
  benefitType: string;
  grossAmount: number;
  deductions?: Record<string, number>;
  netAmount: number;
  paymentMethod: PaymentMethod;
  apEntryId?: string;
  included: boolean;
  lifeCertificateStatus: LifeCertificateStatus;
  beneficiaryStatus: BeneficiaryStatus;
  payOffice: PayOffice;
  comments?: string;
}

export interface GLSummary {
  byBenefitType: GLSummaryByType[];
  apControl: GLControlEntry;
}

export interface GLSummaryByType {
  benefitType: string;
  glExpenseAccount: string;
  amount: number;
}

export interface GLControlEntry {
  apControlAccount: string;
  totalCredits: number;
}

export interface APBatch {
  id: string;
  sourceModule: 'BENEFITS';
  batchType: 'BENEFITS_PAY_RUN' | 'SHORT_TERM_BENEFITS';
  batchReference: string;
  status: APBatchStatus;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  postedBy?: string;
  postedAt?: string;
}

export interface APInvoice {
  id: string;
  apBatchId: string;
  payeeType: 'BENEFICIARY' | 'EMPLOYER' | 'OTHER';
  payeeId: string;
  payeeName: string;
  reference: string;
  amount: number;
  currency: string;
  glAccount: string;
  status: APInvoiceStatus;
  createdAt: string;
}

export interface APPayment {
  id: string;
  apInvoiceId: string;
  paymentMethod: PaymentMethod;
  chequeNumber?: string;
  eftBatchId?: string;
  paymentDate: string;
  printedFlag: boolean;
  status: APPaymentStatus;
  createdBy: string;
  createdAt: string;
}

export interface BenefitFinanceMapping {
  id: string;
  benefitType: string;
  isLongTerm: boolean;
  glExpenseAccount: string;
  apControlAccount: string;
  includeInPayRun: boolean;
  active: boolean;
}

export interface LifeCertificateConfig {
  id: string;
  benefitType: string;
  requiresCertificate: boolean;
  frequencyMonths: number;
  gracePeriodDays: number;
  autoSuspendAfterDays: number;
  requireManualReviewBeforeSuspension: boolean;
}
