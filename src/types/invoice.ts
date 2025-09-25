export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'contribution' | 'rent' | 'loan' | 'service';
  payerName: string;
  payerType: 'employer' | 'individual' | 'contributor';
  payerId: string;
  amount: number;
  currency: 'XCD' | 'USD';
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdDate: string;
  dueDate: string;
  paidDate?: string;
  paidAmount: number;
  balanceAmount: number;
  description: string;
  category: string;
  glAccount?: string;
  reference?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annually';
}

export interface Payment {
  id: string;
  receiptNumber: string;
  invoiceIds: string[];
  payerName: string;
  totalAmount: number;
  currency: 'XCD' | 'USD';
  paymentMode: 'cash' | 'check' | 'card' | 'eft';
  paymentDate: string;
  batchId: string;
  cashierId: string;
  
  // Check details (if payment mode is check)
  checkNumber?: string;
  bankName?: string;
  checkDate?: string;
  
  // Card/EFT details
  transactionReference?: string;
  
  // Audit fields
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

export interface DailyBatch {
  id: string;
  batchNumber: string;
  cashierId: string;
  cashierName: string;
  date: string;
  status: 'open' | 'closed' | 'balanced' | 'posted';
  
  // Opening balances
  openingCashXCD: number;
  openingCashUSD: number;
  
  // Closing balances
  closingCashXCD?: number;
  closingCashUSD?: number;
  
  // Payment totals
  totalCash: number;
  totalChecks: number;
  totalCards: number;
  totalEFT: number;
  grandTotal: number;
  
  // Denomination breakdown
  denominationsXCD?: { [key: string]: number };
  denominationsUSD?: { [key: string]: number };
  
  // Variance
  systemTotal: number;
  physicalTotal: number;
  variance: number;
  varianceApproved?: boolean;
  approvedBy?: string;
  approvalReason?: string;
  
  // Timestamps
  openedAt: string;
  closedAt?: string;
  postedAt?: string;
}

export interface CheckRegisterEntry {
  id: string;
  checkNumber: string;
  payerName: string;
  bankName: string;
  amount: number;
  currency: 'XCD' | 'USD';
  invoiceNumber: string;
  receiptNumber: string;
  date: string;
  status: 'pending' | 'cleared' | 'returned' | 'cancelled';
  batchId: string;
  returnedDate?: string;
  returnReason?: string;
}

export interface GLPostingEntry {
  id: string;
  batchId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: 'XCD' | 'USD';
  description: string;
  reference: string;
  postingDate: string;
  posted: boolean;
  postedAt?: string;
}

export interface SageSettings {
  connectionString: string;
  lastSyncDate?: string;
  autoSync: boolean;
  syncFrequency: 'manual' | 'daily' | 'weekly';
  defaultBankAccountXCD: string;
  defaultBankAccountUSD: string;
  chartOfAccounts: { [key: string]: string };
  testConnection: boolean;
}