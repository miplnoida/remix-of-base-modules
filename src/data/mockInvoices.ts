import { Invoice, Payment, DailyBatch, CheckRegisterEntry, GLPostingEntry } from '@/types/invoice';

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    type: 'contribution',
    payerName: 'ABC Manufacturing Ltd',
    payerType: 'employer',
    payerId: 'EMP001',
    amount: 5000.00,
    currency: 'XCD',
    status: 'pending',
    createdDate: '2024-09-20',
    dueDate: '2024-10-15',
    paidAmount: 0,
    balanceAmount: 5000.00,
    description: 'Social Security Contributions - September 2024',
    category: 'Social Security',
    glAccount: '4100-SS-CONTRIB',
    reference: 'SS-SEP-2024',
    isRecurring: true,
    recurringFrequency: 'monthly'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    type: 'rent',
    payerName: 'John Smith',
    payerType: 'individual',
    payerId: 'IND001',
    amount: 1200.00,
    currency: 'XCD',
    status: 'partial',
    createdDate: '2024-09-15',
    dueDate: '2024-10-01',
    paidAmount: 600.00,
    balanceAmount: 600.00,
    description: 'Office Rent - October 2024',
    category: 'Rent',
    glAccount: '4200-RENT-INCOME',
    reference: 'RENT-OCT-2024'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    type: 'loan',
    payerName: 'Mary Johnson',
    payerType: 'contributor',
    payerId: 'CON001',
    amount: 800.00,
    currency: 'XCD',
    status: 'overdue',
    createdDate: '2024-08-20',
    dueDate: '2024-09-20',
    paidAmount: 0,
    balanceAmount: 800.00,
    description: 'Personal Loan Installment - September 2024',
    category: 'Loan Repayment',
    glAccount: '1200-LOANS-RECV',
    reference: 'LOAN-SEP-2024'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    type: 'service',
    payerName: 'David Brown',
    payerType: 'individual',
    payerId: 'IND002',
    amount: 50.00,
    currency: 'XCD',
    status: 'pending',
    createdDate: '2024-09-22',
    dueDate: '2024-10-07',
    paidAmount: 0,
    balanceAmount: 50.00,
    description: 'ID Card Replacement Fee',
    category: 'Service Fee',
    glAccount: '4300-SERVICE-FEES',
    reference: 'CARD-REP-001'
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-005',
    type: 'contribution',
    payerName: 'XYZ Hotel Group',
    payerType: 'employer',
    payerId: 'EMP002',
    amount: 12000.00,
    currency: 'XCD',
    status: 'paid',
    createdDate: '2024-09-10',
    dueDate: '2024-09-25',
    paidDate: '2024-09-24',
    paidAmount: 12000.00,
    balanceAmount: 0,
    description: 'Social Security & Levy Contributions - September 2024',
    category: 'Social Security',
    glAccount: '4100-SS-CONTRIB',
    reference: 'SS-LEV-SEP-2024',
    isRecurring: true,
    recurringFrequency: 'monthly'
  }
];

export const mockPayments: Payment[] = [
  {
    id: '1',
    receiptNumber: 'RCP-2024-001',
    invoiceIds: ['5'],
    payerName: 'XYZ Hotel Group',
    totalAmount: 12000.00,
    currency: 'XCD',
    paymentMode: 'check',
    paymentDate: '2024-09-24',
    batchId: 'BATCH-2024-001',
    cashierId: 'CASH001',
    checkNumber: 'CHK-789456',
    bankName: 'Bank of St. Kitts',
    checkDate: '2024-09-24',
    createdBy: 'cashier@sksb.com',
    createdAt: '2024-09-24T14:30:00Z'
  }
];

export const mockBatches: DailyBatch[] = [
  {
    id: 'BATCH-2024-001',
    batchNumber: 'BATCH-240924-001',
    cashierId: 'CASH001',
    cashierName: 'Jane Doe',
    date: '2024-09-24',
    status: 'closed',
    openingCashXCD: 1000.00,
    openingCashUSD: 500.00,
    closingCashXCD: 2500.00,
    closingCashUSD: 800.00,
    totalCash: 15800.00,
    totalChecks: 12000.00,
    totalCards: 2500.00,
    totalEFT: 0,
    grandTotal: 30300.00,
    systemTotal: 30300.00,
    physicalTotal: 30250.00,
    variance: -50.00,
    varianceApproved: true,
    approvedBy: 'supervisor@sksb.com',
    approvalReason: 'Minor cash counting difference',
    openedAt: '2024-09-24T08:00:00Z',
    closedAt: '2024-09-24T17:00:00Z'
  }
];

export const mockCheckRegister: CheckRegisterEntry[] = [
  {
    id: '1',
    checkNumber: 'CHK-789456',
    payerName: 'XYZ Hotel Group',
    bankName: 'Bank of St. Kitts',
    amount: 12000.00,
    currency: 'XCD',
    invoiceNumber: 'INV-2024-005',
    receiptNumber: 'RCP-2024-001',
    date: '2024-09-24',
    status: 'pending',
    batchId: 'BATCH-2024-001'
  }
];

export const mockGLPostings: GLPostingEntry[] = [
  {
    id: '1',
    batchId: 'BATCH-2024-001',
    accountCode: '1100-CASH-EC',
    accountName: 'Cash in Hand - XCD',
    debit: 15800.00,
    credit: 0,
    currency: 'XCD',
    description: 'Daily cash receipts',
    reference: 'BATCH-240924-001',
    postingDate: '2024-09-24',
    posted: false
  },
  {
    id: '2',
    batchId: 'BATCH-2024-001',
    accountCode: '4100-SS-CONTRIB',
    accountName: 'Social Security Contributions',
    debit: 0,
    credit: 12000.00,
    currency: 'XCD',
    description: 'SS contributions received',
    reference: 'BATCH-240924-001',
    postingDate: '2024-09-24',
    posted: false
  }
];