// Mock Accounts Payable Service for Benefits Payments

import { 
  PendingPayable, 
  APBatch, 
  APItem, 
  CheckPrintJob, 
  DDFile, 
  APPosting,
  APCorrection,
  APAuditLog,
  APDeduction,
  APBatchStatus,
  APItemStatus
} from '@/types/accountsPayable';

// Mock Data
const mockDeductions: APDeduction[] = [
  { id: 'ded-1', deductionType: 'OVERPAYMENT_OFFSET', description: 'Overpayment Recovery - Jan 2024', amount: 150.00, referenceId: 'OVP-2024-001' },
  { id: 'ded-2', deductionType: 'CHILD_SUPPORT', description: 'Court Order #CS-2023-445', amount: 200.00, referenceId: 'CS-2023-445' },
];

const mockPendingPayables: PendingPayable[] = [
  {
    id: 'pp-001',
    claimId: 'CLM-2024-0001',
    claimNumber: 'CLM-2024-0001',
    insuredPersonId: 'IP-001',
    insuredPersonSSN: '123-45-6789',
    insuredPersonName: 'John Williams',
    benefitType: 'AGE',
    payableAmount: 2500.00,
    paymentReason: 'Monthly Age Pension',
    paymentMethod: 'DIRECT_DEPOSIT',
    bankAccountNumber: '****4567',
    bankName: 'First Caribbean Bank',
    bankBranch: 'Basseterre',
    routingNumber: '021000021',
    deductions: [],
    netPayableAmount: 2500.00,
    approvalDate: '2024-01-15',
    approvedBy: 'Sarah Johnson',
    status: 'PENDING_AP_CREATION',
    source: 'BENEFIT_CLAIM',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'pp-002',
    claimId: 'CLM-2024-0002',
    claimNumber: 'CLM-2024-0002',
    insuredPersonId: 'IP-002',
    insuredPersonSSN: '234-56-7890',
    insuredPersonName: 'Mary Thompson',
    benefitType: 'SICKNESS',
    payableAmount: 1200.00,
    paymentReason: 'Sickness Benefit - Week 1-4',
    paymentMethod: 'CHECK',
    deductions: [mockDeductions[0]],
    netPayableAmount: 1050.00,
    approvalDate: '2024-01-16',
    approvedBy: 'Michael Brown',
    status: 'PENDING_AP_CREATION',
    source: 'BENEFIT_CLAIM',
    createdAt: '2024-01-16T09:15:00Z'
  },
  {
    id: 'pp-003',
    claimId: 'CLM-2024-0003',
    claimNumber: 'CLM-2024-0003',
    insuredPersonId: 'IP-003',
    insuredPersonSSN: '345-67-8901',
    insuredPersonName: 'David Charles',
    benefitType: 'MATERNITY',
    payableAmount: 3200.00,
    paymentReason: 'Maternity Benefit - Full Term',
    paymentMethod: 'DIRECT_DEPOSIT',
    bankAccountNumber: '****8901',
    bankName: 'Bank of Nevis',
    deductions: [],
    netPayableAmount: 3200.00,
    approvalDate: '2024-01-17',
    approvedBy: 'Sarah Johnson',
    status: 'PENDING_AP_CREATION',
    source: 'BENEFIT_CLAIM',
    createdAt: '2024-01-17T14:20:00Z'
  },
  {
    id: 'pp-004',
    claimId: 'CLM-2024-0004',
    claimNumber: 'CLM-2024-0004',
    insuredPersonId: 'IP-004',
    insuredPersonSSN: '456-78-9012',
    insuredPersonName: 'Patricia Adams',
    benefitType: 'FUNERAL_GRANT',
    payableAmount: 5000.00,
    paymentReason: 'Funeral Grant - Spouse Death',
    paymentMethod: 'CHECK',
    deductions: [],
    netPayableAmount: 5000.00,
    approvalDate: '2024-01-18',
    approvedBy: 'Michael Brown',
    status: 'PENDING_AP_CREATION',
    source: 'BENEFIT_CLAIM',
    createdAt: '2024-01-18T11:45:00Z'
  },
  {
    id: 'pp-005',
    claimId: 'REF-2024-0001',
    claimNumber: 'REF-2024-0001',
    insuredPersonId: 'IP-005',
    insuredPersonSSN: '567-89-0123',
    insuredPersonName: 'Robert Johnson',
    benefitType: 'REFUND',
    payableAmount: 850.00,
    paymentReason: 'Contribution Refund - Overpayment',
    paymentMethod: 'CHECK',
    deductions: [],
    netPayableAmount: 850.00,
    approvalDate: '2024-01-19',
    approvedBy: 'Finance Dept',
    status: 'PENDING_AP_CREATION',
    source: 'REFUND',
    createdAt: '2024-01-19T08:30:00Z'
  },
  {
    id: 'pp-006',
    claimId: 'CLM-2024-0005',
    claimNumber: 'CLM-2024-0005',
    insuredPersonId: 'IP-006',
    insuredPersonSSN: '678-90-1234',
    insuredPersonName: 'Linda Martinez',
    benefitType: 'INVALIDITY',
    payableAmount: 1800.00,
    paymentReason: 'Monthly Invalidity Pension',
    paymentMethod: 'DIRECT_DEPOSIT',
    bankAccountNumber: '****2345',
    bankName: 'CIBC FirstCaribbean',
    deductions: [mockDeductions[1]],
    netPayableAmount: 1600.00,
    approvalDate: '2024-01-20',
    approvedBy: 'Sarah Johnson',
    status: 'PENDING_AP_CREATION',
    source: 'BENEFIT_CLAIM',
    createdAt: '2024-01-20T16:00:00Z'
  }
];

const mockAPBatches: APBatch[] = [
  {
    id: 'batch-001',
    batchNumber: 'APB-2024-0001',
    batchDate: '2024-01-22',
    totalItems: 15,
    totalAmount: 45000.00,
    totalDeductions: 1250.00,
    netAmount: 43750.00,
    paymentMethod: 'MIXED',
    status: 'POSTED',
    createdBy: 'user-001',
    createdByName: 'Jennifer Clark',
    createdAt: '2024-01-22T09:00:00Z',
    accountsVerifiedBy: 'user-002',
    accountsVerifiedByName: 'Thomas Wilson',
    accountsVerifiedAt: '2024-01-22T11:30:00Z',
    benefitsVerifiedBy: 'user-003',
    benefitsVerifiedByName: 'Amanda Lee',
    benefitsVerifiedAt: '2024-01-22T14:00:00Z',
    postedBy: 'user-004',
    postedByName: 'Richard Davis',
    postedAt: '2024-01-23T10:00:00Z'
  },
  {
    id: 'batch-002',
    batchNumber: 'APB-2024-0002',
    batchDate: '2024-01-25',
    totalItems: 8,
    totalAmount: 22500.00,
    totalDeductions: 500.00,
    netAmount: 22000.00,
    paymentMethod: 'DIRECT_DEPOSIT',
    status: 'READY_FOR_DIRECT_DEPOSIT',
    createdBy: 'user-001',
    createdByName: 'Jennifer Clark',
    createdAt: '2024-01-25T09:30:00Z',
    accountsVerifiedBy: 'user-002',
    accountsVerifiedByName: 'Thomas Wilson',
    accountsVerifiedAt: '2024-01-25T13:00:00Z',
    benefitsVerifiedBy: 'user-003',
    benefitsVerifiedByName: 'Amanda Lee',
    benefitsVerifiedAt: '2024-01-25T15:30:00Z'
  },
  {
    id: 'batch-003',
    batchNumber: 'APB-2024-0003',
    batchDate: '2024-01-28',
    totalItems: 12,
    totalAmount: 35000.00,
    totalDeductions: 750.00,
    netAmount: 34250.00,
    paymentMethod: 'CHECK',
    status: 'BENEFITS_VERIFIED',
    createdBy: 'user-001',
    createdByName: 'Jennifer Clark',
    createdAt: '2024-01-28T10:00:00Z',
    accountsVerifiedBy: 'user-002',
    accountsVerifiedByName: 'Thomas Wilson',
    accountsVerifiedAt: '2024-01-28T14:00:00Z',
    benefitsVerifiedBy: 'user-003',
    benefitsVerifiedByName: 'Amanda Lee',
    benefitsVerifiedAt: '2024-01-28T16:00:00Z'
  },
  {
    id: 'batch-004',
    batchNumber: 'APB-2024-0004',
    batchDate: '2024-01-30',
    totalItems: 6,
    totalAmount: 18000.00,
    totalDeductions: 350.00,
    netAmount: 17650.00,
    paymentMethod: 'MIXED',
    status: 'PENDING_VERIFICATION',
    createdBy: 'user-001',
    createdByName: 'Jennifer Clark',
    createdAt: '2024-01-30T08:45:00Z'
  }
];

const mockAPItems: APItem[] = [
  {
    id: 'item-001',
    batchId: 'batch-004',
    batchNumber: 'APB-2024-0004',
    claimId: 'CLM-2024-0010',
    claimNumber: 'CLM-2024-0010',
    insuredPersonId: 'IP-010',
    insuredPersonSSN: '111-22-3333',
    insuredPersonName: 'James Wilson',
    benefitType: 'AGE',
    grossAmount: 2800.00,
    deductions: [],
    netAmount: 2800.00,
    paymentMethod: 'DIRECT_DEPOSIT',
    bankAccountNumber: '****5678',
    bankName: 'First Caribbean Bank',
    accountingCode: '6100-001',
    accountingDescription: 'Age Pension Expense',
    description: 'Monthly Age Pension - January 2024',
    status: 'PENDING_VERIFICATION',
    accountsVerificationStatus: 'PENDING',
    benefitsVerificationStatus: 'PENDING',
    createdAt: '2024-01-30T08:45:00Z',
    source: 'BENEFIT_CLAIM'
  },
  {
    id: 'item-002',
    batchId: 'batch-004',
    batchNumber: 'APB-2024-0004',
    claimId: 'CLM-2024-0011',
    claimNumber: 'CLM-2024-0011',
    insuredPersonId: 'IP-011',
    insuredPersonSSN: '222-33-4444',
    insuredPersonName: 'Elizabeth Brown',
    benefitType: 'SICKNESS',
    grossAmount: 1500.00,
    deductions: [{ id: 'ded-3', deductionType: 'OVERPAYMENT_OFFSET', description: 'Prior Overpayment', amount: 150.00 }],
    netAmount: 1350.00,
    paymentMethod: 'CHECK',
    accountingCode: '6100-002',
    accountingDescription: 'Sickness Benefit Expense',
    description: 'Sickness Benefit - 4 Weeks',
    status: 'PENDING_VERIFICATION',
    accountsVerificationStatus: 'PENDING',
    benefitsVerificationStatus: 'PENDING',
    createdAt: '2024-01-30T08:45:00Z',
    source: 'BENEFIT_CLAIM'
  },
  {
    id: 'item-003',
    batchId: 'batch-004',
    batchNumber: 'APB-2024-0004',
    claimId: 'CLM-2024-0012',
    claimNumber: 'CLM-2024-0012',
    insuredPersonId: 'IP-012',
    insuredPersonSSN: '333-44-5555',
    insuredPersonName: 'Michael Green',
    benefitType: 'MATERNITY',
    grossAmount: 3500.00,
    deductions: [],
    netAmount: 3500.00,
    paymentMethod: 'DIRECT_DEPOSIT',
    bankAccountNumber: '****9012',
    bankName: 'Bank of Nevis',
    accountingCode: '6100-003',
    accountingDescription: 'Maternity Benefit Expense',
    description: 'Maternity Benefit - Full Term',
    status: 'PENDING_VERIFICATION',
    accountsVerificationStatus: 'PENDING',
    benefitsVerificationStatus: 'PENDING',
    createdAt: '2024-01-30T08:45:00Z',
    source: 'BENEFIT_CLAIM'
  }
];

const mockCheckPrintJobs: CheckPrintJob[] = [
  {
    id: 'cpj-001',
    batchId: 'batch-001',
    batchNumber: 'APB-2024-0001',
    checkStartNumber: 10001,
    checkEndNumber: 10008,
    totalChecks: 8,
    totalAmount: 25000.00,
    printedBy: 'user-005',
    printedByName: 'Karen White',
    printedAt: '2024-01-23T09:00:00Z',
    printerName: 'Finance Check Printer 1',
    status: 'COMPLETED',
    items: []
  }
];

const mockDDFiles: DDFile[] = [
  {
    id: 'dd-001',
    batchId: 'batch-001',
    batchNumber: 'APB-2024-0001',
    fileName: 'DD_APB-2024-0001_20240123.ach',
    fileFormat: 'ACH',
    totalRecords: 7,
    totalAmount: 18750.00,
    generatedBy: 'user-005',
    generatedByName: 'Karen White',
    generatedAt: '2024-01-23T09:30:00Z',
    downloadUrl: '/files/dd/DD_APB-2024-0001_20240123.ach',
    status: 'UPLOADED_TO_BANK'
  }
];

const mockAPPostings: APPosting[] = [
  {
    id: 'post-001',
    batchId: 'batch-001',
    batchNumber: 'APB-2024-0001',
    postingDate: '2024-01-23',
    totalDebits: 43750.00,
    totalCredits: 43750.00,
    journalEntries: [
      { id: 'je-001', postingId: 'post-001', accountCode: '6100-001', accountName: 'Age Pension Expense', debitAmount: 15000.00, creditAmount: 0, description: 'Age Pension Payments', benefitType: 'AGE' },
      { id: 'je-002', postingId: 'post-001', accountCode: '6100-002', accountName: 'Sickness Benefit Expense', debitAmount: 8500.00, creditAmount: 0, description: 'Sickness Benefit Payments', benefitType: 'SICKNESS' },
      { id: 'je-003', postingId: 'post-001', accountCode: '6100-003', accountName: 'Maternity Benefit Expense', debitAmount: 12000.00, creditAmount: 0, description: 'Maternity Benefit Payments', benefitType: 'MATERNITY' },
      { id: 'je-004', postingId: 'post-001', accountCode: '6100-004', accountName: 'Other Benefits Expense', debitAmount: 8250.00, creditAmount: 0, description: 'Other Benefit Payments' },
      { id: 'je-005', postingId: 'post-001', accountCode: '2100-001', accountName: 'AP Liability - Checks', debitAmount: 0, creditAmount: 25000.00, description: 'Check Payments Clearing' },
      { id: 'je-006', postingId: 'post-001', accountCode: '1100-001', accountName: 'Bank - Operating Account', debitAmount: 0, creditAmount: 18750.00, description: 'Direct Deposit Settlement' }
    ],
    postedBy: 'user-004',
    postedByName: 'Richard Davis',
    postedAt: '2024-01-23T10:00:00Z',
    status: 'POSTED'
  }
];

const mockCorrections: APCorrection[] = [
  {
    id: 'corr-001',
    originalItemId: 'item-old-001',
    correctionType: 'WRONG_AMOUNT',
    description: 'Original amount was XCD 1,200 but should be XCD 1,500',
    originalAmount: 1200.00,
    correctedAmount: 1500.00,
    status: 'COMPLETED',
    requestedBy: 'user-003',
    requestedByName: 'Amanda Lee',
    requestedAt: '2024-01-20T10:00:00Z',
    approvedBy: 'user-002',
    approvedByName: 'Thomas Wilson',
    approvedAt: '2024-01-20T14:00:00Z',
    newBatchId: 'batch-002',
    newItemId: 'item-new-001'
  }
];

const mockAuditLogs: APAuditLog[] = [
  {
    id: 'log-001',
    entityType: 'BATCH',
    entityId: 'batch-001',
    action: 'CREATED',
    details: 'AP Batch APB-2024-0001 created with 15 items',
    performedBy: 'user-001',
    performedByName: 'Jennifer Clark',
    performedAt: '2024-01-22T09:00:00Z',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'log-002',
    entityType: 'BATCH',
    entityId: 'batch-001',
    action: 'ACCOUNTS_VERIFIED',
    details: 'Batch verified by Accounts department',
    performedBy: 'user-002',
    performedByName: 'Thomas Wilson',
    performedAt: '2024-01-22T11:30:00Z',
    ipAddress: '192.168.1.101'
  },
  {
    id: 'log-003',
    entityType: 'BATCH',
    entityId: 'batch-001',
    action: 'BENEFITS_VERIFIED',
    details: 'Batch verified by Benefits department',
    performedBy: 'user-003',
    performedByName: 'Amanda Lee',
    performedAt: '2024-01-22T14:00:00Z',
    ipAddress: '192.168.1.102'
  },
  {
    id: 'log-004',
    entityType: 'CHECK',
    entityId: 'cpj-001',
    action: 'CHECKS_PRINTED',
    details: 'Checks 10001-10008 printed successfully',
    performedBy: 'user-005',
    performedByName: 'Karen White',
    performedAt: '2024-01-23T09:00:00Z',
    ipAddress: '192.168.1.103'
  },
  {
    id: 'log-005',
    entityType: 'POSTING',
    entityId: 'post-001',
    action: 'POSTED',
    details: 'Batch APB-2024-0001 posted to GL',
    performedBy: 'user-004',
    performedByName: 'Richard Davis',
    performedAt: '2024-01-23T10:00:00Z',
    ipAddress: '192.168.1.104'
  }
];

// Service Class
class AccountsPayableService {
  // Pending Payables
  getPendingPayables(): Promise<PendingPayable[]> {
    return Promise.resolve([...mockPendingPayables]);
  }

  getPendingPayableById(id: string): Promise<PendingPayable | undefined> {
    return Promise.resolve(mockPendingPayables.find(p => p.id === id));
  }

  // AP Batches
  getAPBatches(): Promise<APBatch[]> {
    return Promise.resolve([...mockAPBatches]);
  }

  getAPBatchById(id: string): Promise<APBatch | undefined> {
    return Promise.resolve(mockAPBatches.find(b => b.id === id));
  }

  getAPBatchByNumber(batchNumber: string): Promise<APBatch | undefined> {
    return Promise.resolve(mockAPBatches.find(b => b.batchNumber === batchNumber));
  }

  createAPBatch(payableIds: string[], paymentMethod: 'CHECK' | 'DIRECT_DEPOSIT' | 'MIXED'): Promise<APBatch> {
    const selectedPayables = mockPendingPayables.filter(p => payableIds.includes(p.id));
    const totalAmount = selectedPayables.reduce((sum, p) => sum + p.payableAmount, 0);
    const totalDeductions = selectedPayables.reduce((sum, p) => sum + p.deductions.reduce((d, ded) => d + ded.amount, 0), 0);
    
    const newBatch: APBatch = {
      id: `batch-${Date.now()}`,
      batchNumber: `APB-2024-${String(mockAPBatches.length + 1).padStart(4, '0')}`,
      batchDate: new Date().toISOString().split('T')[0],
      totalItems: selectedPayables.length,
      totalAmount,
      totalDeductions,
      netAmount: totalAmount - totalDeductions,
      paymentMethod,
      status: 'PENDING_VERIFICATION',
      createdBy: 'current-user',
      createdByName: 'Current User',
      createdAt: new Date().toISOString()
    };
    
    mockAPBatches.push(newBatch);
    return Promise.resolve(newBatch);
  }

  // AP Items
  getAPItemsByBatchId(batchId: string): Promise<APItem[]> {
    return Promise.resolve(mockAPItems.filter(i => i.batchId === batchId));
  }

  getAPItemById(id: string): Promise<APItem | undefined> {
    return Promise.resolve(mockAPItems.find(i => i.id === id));
  }

  // Verification
  verifyAPItem(itemId: string, verificationType: 'ACCOUNTS' | 'BENEFITS', action: 'APPROVED' | 'REJECTED', notes?: string): Promise<APItem> {
    const item = mockAPItems.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    
    if (verificationType === 'ACCOUNTS') {
      item.accountsVerificationStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      item.accountsVerificationNotes = notes;
      item.accountsVerifiedBy = 'current-user';
      item.accountsVerifiedAt = new Date().toISOString();
    } else {
      item.benefitsVerificationStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      item.benefitsVerificationNotes = notes;
      item.benefitsVerifiedBy = 'current-user';
      item.benefitsVerifiedAt = new Date().toISOString();
    }
    
    // Update status if both verified
    if (item.accountsVerificationStatus === 'APPROVED' && item.benefitsVerificationStatus === 'APPROVED') {
      item.status = 'READY_FOR_PAYMENT';
    }
    
    return Promise.resolve(item);
  }

  // Check Printing
  getCheckPrintJobs(): Promise<CheckPrintJob[]> {
    return Promise.resolve([...mockCheckPrintJobs]);
  }

  createCheckPrintJob(batchId: string, checkStartNumber: number): Promise<CheckPrintJob> {
    const batch = mockAPBatches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    
    const checkItems = mockAPItems.filter(i => i.batchId === batchId && i.paymentMethod === 'CHECK');
    const totalAmount = checkItems.reduce((sum, i) => sum + i.netAmount, 0);
    
    const job: CheckPrintJob = {
      id: `cpj-${Date.now()}`,
      batchId,
      batchNumber: batch.batchNumber,
      checkStartNumber,
      checkEndNumber: checkStartNumber + checkItems.length - 1,
      totalChecks: checkItems.length,
      totalAmount,
      printedBy: 'current-user',
      printedByName: 'Current User',
      printedAt: new Date().toISOString(),
      status: 'COMPLETED',
      items: checkItems
    };
    
    mockCheckPrintJobs.push(job);
    return Promise.resolve(job);
  }

  // Direct Deposit
  getDDFiles(): Promise<DDFile[]> {
    return Promise.resolve([...mockDDFiles]);
  }

  generateDDFile(batchId: string, format: 'ACH' | 'CSV' | 'XML'): Promise<DDFile> {
    const batch = mockAPBatches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    
    const ddItems = mockAPItems.filter(i => i.batchId === batchId && i.paymentMethod === 'DIRECT_DEPOSIT');
    const totalAmount = ddItems.reduce((sum, i) => sum + i.netAmount, 0);
    
    const ddFile: DDFile = {
      id: `dd-${Date.now()}`,
      batchId,
      batchNumber: batch.batchNumber,
      fileName: `DD_${batch.batchNumber}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.${format.toLowerCase()}`,
      fileFormat: format,
      totalRecords: ddItems.length,
      totalAmount,
      generatedBy: 'current-user',
      generatedByName: 'Current User',
      generatedAt: new Date().toISOString(),
      status: 'GENERATED'
    };
    
    mockDDFiles.push(ddFile);
    return Promise.resolve(ddFile);
  }

  // Postings
  getAPPostings(): Promise<APPosting[]> {
    return Promise.resolve([...mockAPPostings]);
  }

  postBatch(batchId: string): Promise<APPosting> {
    const batch = mockAPBatches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    
    batch.status = 'POSTED';
    batch.postedBy = 'current-user';
    batch.postedByName = 'Current User';
    batch.postedAt = new Date().toISOString();
    
    const posting: APPosting = {
      id: `post-${Date.now()}`,
      batchId,
      batchNumber: batch.batchNumber,
      postingDate: new Date().toISOString().split('T')[0],
      totalDebits: batch.netAmount,
      totalCredits: batch.netAmount,
      journalEntries: [],
      postedBy: 'current-user',
      postedByName: 'Current User',
      postedAt: new Date().toISOString(),
      status: 'POSTED'
    };
    
    mockAPPostings.push(posting);
    return Promise.resolve(posting);
  }

  // Corrections
  getCorrections(): Promise<APCorrection[]> {
    return Promise.resolve([...mockCorrections]);
  }

  createCorrection(correction: Omit<APCorrection, 'id' | 'status' | 'requestedAt'>): Promise<APCorrection> {
    const newCorrection: APCorrection = {
      ...correction,
      id: `corr-${Date.now()}`,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };
    mockCorrections.push(newCorrection);
    return Promise.resolve(newCorrection);
  }

  // Audit Logs
  getAuditLogs(): Promise<APAuditLog[]> {
    return Promise.resolve([...mockAuditLogs]);
  }

  getAuditLogsByEntity(entityType: string, entityId: string): Promise<APAuditLog[]> {
    return Promise.resolve(mockAuditLogs.filter(l => l.entityType === entityType && l.entityId === entityId));
  }
}

export const accountsPayableService = new AccountsPayableService();
