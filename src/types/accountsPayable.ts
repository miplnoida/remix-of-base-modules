// Accounts Payable Module Types for Benefits & Overpayments

export type APItemStatus = 
  | 'PENDING_AP_CREATION'
  | 'AP_BATCH_CREATED'
  | 'PENDING_VERIFICATION'
  | 'ACCOUNTS_VERIFIED'
  | 'BENEFITS_VERIFIED'
  | 'READY_FOR_PAYMENT'
  | 'CHECK_PRINTING'
  | 'DD_PROCESSING'
  | 'PAYMENT_COMPLETED'
  | 'POSTED'
  | 'REVERSED';

export type APBatchStatus = 
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'ACCOUNTS_VERIFIED'
  | 'BENEFITS_VERIFIED'
  | 'READY_FOR_CHECK_PRINTING'
  | 'READY_FOR_DIRECT_DEPOSIT'
  | 'CHECKS_PRINTED'
  | 'DD_FILE_GENERATED'
  | 'POSTED'
  | 'REVERSED';

export type PaymentMethod = 'CHECK' | 'DIRECT_DEPOSIT' | 'MIXED';

export type PaymentSource = 
  | 'BENEFIT_CLAIM'
  | 'REFUND'
  | 'MEDICAL_CLAIM'
  | 'OVERPAYMENT_REPAYMENT'
  | 'MANUAL_PAYOUT';

export interface PendingPayable {
  id: string;
  claimId: string;
  claimNumber: string;
  insuredPersonId: string;
  insuredPersonSSN: string;
  insuredPersonName: string;
  benefitType: string;
  payableAmount: number;
  paymentReason: string;
  paymentMethod: 'CHECK' | 'DIRECT_DEPOSIT';
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  routingNumber?: string;
  deductions: APDeduction[];
  netPayableAmount: number;
  approvalDate: string;
  approvedBy: string;
  status: 'PENDING_AP_CREATION';
  source: PaymentSource;
  notes?: string;
  createdAt: string;
}

export interface APDeduction {
  id: string;
  deductionType: 'OVERPAYMENT_OFFSET' | 'CHILD_SUPPORT' | 'TAX_WITHHOLDING' | 'OTHER';
  description: string;
  amount: number;
  referenceId?: string;
}

export interface APBatch {
  id: string;
  batchNumber: string;
  batchDate: string;
  totalItems: number;
  totalAmount: number;
  totalDeductions: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  status: APBatchStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  accountsVerifiedBy?: string;
  accountsVerifiedByName?: string;
  accountsVerifiedAt?: string;
  benefitsVerifiedBy?: string;
  benefitsVerifiedByName?: string;
  benefitsVerifiedAt?: string;
  checkSubBatchId?: string;
  ddSubBatchId?: string;
  postedBy?: string;
  postedByName?: string;
  postedAt?: string;
  notes?: string;
}

export interface APItem {
  id: string;
  batchId: string;
  batchNumber: string;
  claimId: string;
  claimNumber: string;
  insuredPersonId: string;
  insuredPersonSSN: string;
  insuredPersonName: string;
  benefitType: string;
  grossAmount: number;
  deductions: APDeduction[];
  netAmount: number;
  paymentMethod: 'CHECK' | 'DIRECT_DEPOSIT';
  bankAccountNumber?: string;
  bankName?: string;
  accountingCode: string;
  accountingDescription: string;
  description: string;
  status: APItemStatus;
  checkNumber?: string;
  ddBatchReference?: string;
  paymentDate?: string;
  accountsVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  accountsVerificationNotes?: string;
  accountsVerifiedBy?: string;
  accountsVerifiedAt?: string;
  benefitsVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  benefitsVerificationNotes?: string;
  benefitsVerifiedBy?: string;
  benefitsVerifiedAt?: string;
  createdAt: string;
  source: PaymentSource;
}

export interface CheckPrintJob {
  id: string;
  batchId: string;
  batchNumber: string;
  checkStartNumber: number;
  checkEndNumber: number;
  totalChecks: number;
  totalAmount: number;
  printedBy: string;
  printedByName: string;
  printedAt: string;
  printerName?: string;
  status: 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  items: APItem[];
}

export interface DDFile {
  id: string;
  batchId: string;
  batchNumber: string;
  fileName: string;
  fileFormat: 'ACH' | 'CSV' | 'XML';
  totalRecords: number;
  totalAmount: number;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  downloadUrl?: string;
  status: 'GENERATED' | 'DOWNLOADED' | 'UPLOADED_TO_BANK';
}

export interface APPosting {
  id: string;
  batchId: string;
  batchNumber: string;
  postingDate: string;
  totalDebits: number;
  totalCredits: number;
  journalEntries: APJournalEntry[];
  postedBy: string;
  postedByName: string;
  postedAt: string;
  status: 'POSTED' | 'REVERSED';
  reversalReason?: string;
  reversedBy?: string;
  reversedAt?: string;
}

export interface APJournalEntry {
  id: string;
  postingId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  benefitType?: string;
}

export interface APVerificationAction {
  id: string;
  itemId: string;
  verificationType: 'ACCOUNTS' | 'BENEFITS';
  action: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  notes?: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}

export interface APCorrection {
  id: string;
  originalItemId: string;
  correctionType: 'WRONG_PAYEE' | 'WRONG_AMOUNT' | 'CLAIM_REVOKED' | 'WRONG_BANK' | 'LOST_CHECK_REPRINT' | 'OTHER';
  description: string;
  originalAmount: number;
  correctedAmount?: number;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  newBatchId?: string;
  newItemId?: string;
}

export interface APAuditLog {
  id: string;
  entityType: 'BATCH' | 'ITEM' | 'CHECK' | 'DD_FILE' | 'POSTING' | 'CORRECTION';
  entityId: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  ipAddress?: string;
}
