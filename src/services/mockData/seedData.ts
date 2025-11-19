import { ServiceRequest, Invoice } from '@/types/serviceRequest';

const STORAGE_KEY_REQUESTS = 'service_requests';
const STORAGE_KEY_INVOICES = 'service_invoices';
const STORAGE_KEY_SEEDED = 'service_requests_seeded';

// Comprehensive Seed Service Requests - All possible workflow cases
export const SEED_SERVICE_REQUESTS: ServiceRequest[] = [
  // Case 1: Completed - No Verification Required
  {
    id: 'SR-2025001',
    insuredPersonId: 'IP10001',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC001',
    reason: 'Lost original social security card during travel. Need replacement for employment.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    assignedOfficerId: 'OFF001',
    status: 'Completed',
    invoiceId: 'INV-2025001',
    internalNotes: 'Verified with passport. Card issued.',
    createdAt: '2025-01-10T09:30:00.000Z',
    updatedAt: '2025-01-15T14:20:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-2025002',
    insuredPersonId: 'IP10002',
    serviceCategoryId: 'CAT002',
    serviceTypeId: 'SVC004',
    reason: 'Need certified contribution history for mortgage application.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    status: 'Draft',
    internalNotes: 'Documents uploaded. Awaiting verification.',
    verificationRequired: true,
    verificationStatus: 'Pending',
    createdAt: '2025-01-16T10:00:00.000Z',
    updatedAt: '2025-01-16T10:05:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-2025003',
    insuredPersonId: 'IP10003',
    serviceCategoryId: 'CAT002',
    serviceTypeId: 'SVC005',
    reason: 'Personal records update required.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    assignedOfficerId: 'OFF002',
    status: 'Under Review',
    invoiceId: 'INV-2025003',
    internalNotes: 'Payment received. Processing contribution data.',
    createdAt: '2025-01-14T11:20:00.000Z',
    updatedAt: '2025-01-18T09:15:00.000Z',
    createdBy: 'Sarah Martinez'
  },
  {
    id: 'SR-2025004',
    insuredPersonId: 'IP10004',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC003',
    reason: 'Name change due to marriage. Certificate dated 2024-12-15.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    status: 'Draft',
    internalNotes: 'Marriage certificate uploaded. Pending review.',
    verificationRequired: true,
    verificationStatus: 'Pending',
    createdAt: '2025-01-17T14:30:00.000Z',
    updatedAt: '2025-01-17T14:35:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-2025005',
    insuredPersonId: 'IP10005',
    serviceCategoryId: 'CAT003',
    serviceTypeId: 'SVC006',
    reason: 'Lost benefit award letter. Need reprint for pension application.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT003',
    status: 'Payment Pending',
    invoiceId: 'INV-2025005',
    internalNotes: 'Invoice generated. Awaiting payment.',
    createdAt: '2025-01-18T08:45:00.000Z',
    updatedAt: '2025-01-18T08:50:00.000Z',
    createdBy: 'Lisa Anderson'
  },
  {
    id: 'SR-2025006',
    insuredPersonId: 'IP10001',
    serviceCategoryId: 'CAT005',
    serviceTypeId: 'SVC009',
    reason: 'Need certificate of coverage for overseas employment.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    status: 'Invoice Generated',
    invoiceId: 'INV-2025006',
    internalNotes: 'Verification approved. Invoice generated.',
    verificationRequired: true,
    verificationStatus: 'Approved',
    verifiedBy: 'OFF005',
    verifiedAt: '2025-01-17T11:00:00.000Z',
    verificationNotes: 'All documents verified. Approved for processing.',
    createdAt: '2025-01-16T13:20:00.000Z',
    updatedAt: '2025-01-17T11:05:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-2025007',
    insuredPersonId: 'IP10002',
    serviceCategoryId: 'CAT004',
    serviceTypeId: 'SVC008',
    reason: 'Appeal for late C3 submission penalty - Q4 2024.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT004',
    status: 'Rejected',
    internalNotes: 'Verification rejected due to incomplete documentation.',
    verificationRequired: true,
    verificationStatus: 'Rejected',
    verifiedBy: 'OFF004',
    verifiedAt: '2025-01-18T16:30:00.000Z',
    verificationNotes: 'Missing required supporting documents. Request rejected.',
    createdAt: '2025-01-17T09:00:00.000Z',
    updatedAt: '2025-01-18T16:35:00.000Z',
    createdBy: 'Sarah Martinez'
  },
  {
    id: 'SR-2025008',
    insuredPersonId: 'IP10003',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC001',
    reason: 'Card damaged in accident. Need replacement.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    status: 'Invoice Generated',
    invoiceId: 'INV-2025008',
    internalNotes: 'Invoice generated. Customer reviewing payment options.',
    createdAt: '2025-01-18T15:10:00.000Z',
    updatedAt: '2025-01-18T15:15:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-2025009',
    insuredPersonId: 'IP10004',
    serviceCategoryId: 'CAT003',
    serviceTypeId: 'SVC007',
    reason: 'Need payment history for tax filing purposes.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT003',
    assignedOfficerId: 'OFF003',
    status: 'Payment Received',
    invoiceId: 'INV-2025009',
    internalNotes: 'Payment confirmed. Ready for processing.',
    createdAt: '2025-01-17T13:00:00.000Z',
    updatedAt: '2025-01-18T10:30:00.000Z',
    createdBy: 'Lisa Anderson'
  },
  {
    id: 'SR-2025010',
    insuredPersonId: 'IP10005',
    serviceCategoryId: 'CAT006',
    serviceTypeId: 'SVC010',
    reason: 'Self-employed. Wish to register as voluntary contributor.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT005',
    status: 'Draft',
    internalNotes: 'Business registration documents uploaded. Pending verification.',
    verificationRequired: true,
    verificationStatus: 'Pending',
    createdAt: '2025-01-18T11:00:00.000Z',
    updatedAt: '2025-01-18T11:10:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-2025011',
    insuredPersonId: 'IP10001',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC002',
    reason: 'Third card replacement - previous two lost.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    status: 'Draft',
    internalNotes: 'Draft saved. Customer to return with payment.',
    createdAt: '2025-01-18T16:00:00.000Z',
    updatedAt: '2025-01-18T16:05:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-2025012',
    insuredPersonId: 'IP10002',
    serviceCategoryId: 'CAT002',
    serviceTypeId: 'SVC004',
    reason: 'Urgent - emigration visa application deadline approaching.',
    priorityId: 'PRI002',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    assignedOfficerId: 'OFF002',
    status: 'Payment Received',
    invoiceId: 'INV-2025012',
    internalNotes: 'Verification approved. Payment received. Expedited processing.',
    verificationRequired: true,
    verificationStatus: 'Approved',
    verifiedBy: 'OFF005',
    verifiedAt: '2025-01-18T09:00:00.000Z',
    verificationNotes: 'Fast-tracked due to urgent circumstances.',
    createdAt: '2025-01-17T16:00:00.000Z',
    updatedAt: '2025-01-18T14:00:00.000Z',
    createdBy: 'John Williams'
  }
];

export const SEED_INVOICES: Invoice[] = [
  { id: 'INV-2025001', invoiceNumber: 'INV-2025-000001', insuredPersonId: 'IP10001', serviceRequestId: 'SR-2025001', baseFee: 20.00, additionalFee: 0, totalAmount: 20.00, accountingHeadCode: 'FEE_CARD_REPLACEMENT', status: 'Paid', createdAt: '2025-01-10T09:35:00.000Z', paidAt: '2025-01-10T10:00:00.000Z' },
  { id: 'INV-2025003', invoiceNumber: 'INV-2025-000003', insuredPersonId: 'IP10003', serviceRequestId: 'SR-2025003', baseFee: 15.00, additionalFee: 0, totalAmount: 15.00, accountingHeadCode: 'FEE_CONTRIBUTION_STMT', status: 'Paid', createdAt: '2025-01-14T11:25:00.000Z', paidAt: '2025-01-14T12:00:00.000Z' },
  { id: 'INV-2025005', invoiceNumber: 'INV-2025-000005', insuredPersonId: 'IP10005', serviceRequestId: 'SR-2025005', baseFee: 10.00, additionalFee: 0, totalAmount: 10.00, accountingHeadCode: 'FEE_BENEFIT_REPRINT', status: 'Pending', createdAt: '2025-01-18T08:50:00.000Z' },
  { id: 'INV-2025006', invoiceNumber: 'INV-2025-000006', insuredPersonId: 'IP10001', serviceRequestId: 'SR-2025006', baseFee: 35.00, additionalFee: 0, totalAmount: 35.00, accountingHeadCode: 'FEE_COVERAGE_CERT', status: 'Pending', createdAt: '2025-01-17T11:05:00.000Z' },
  { id: 'INV-2025008', invoiceNumber: 'INV-2025-000008', insuredPersonId: 'IP10003', serviceRequestId: 'SR-2025008', baseFee: 20.00, additionalFee: 0, totalAmount: 20.00, accountingHeadCode: 'FEE_CARD_REPLACEMENT', status: 'Pending', createdAt: '2025-01-18T15:15:00.000Z' },
  { id: 'INV-2025009', invoiceNumber: 'INV-2025-000009', insuredPersonId: 'IP10004', serviceRequestId: 'SR-2025009', baseFee: 20.00, additionalFee: 0, totalAmount: 20.00, accountingHeadCode: 'FEE_BENEFIT_HISTORY', status: 'Paid', createdAt: '2025-01-17T13:05:00.000Z', paidAt: '2025-01-17T14:00:00.000Z' },
  { id: 'INV-2025012', invoiceNumber: 'INV-2025-000012', insuredPersonId: 'IP10002', serviceRequestId: 'SR-2025012', baseFee: 40.00, additionalFee: 75.00, totalAmount: 115.00, accountingHeadCode: 'FEE_CONTRIBUTION_CERT', status: 'Paid', createdAt: '2025-01-17T16:10:00.000Z', paidAt: '2025-01-18T08:00:00.000Z' }
];

export const initializeSeedData = () => {
  const alreadySeeded = localStorage.getItem(STORAGE_KEY_SEEDED);
  if (alreadySeeded) return;
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(SEED_SERVICE_REQUESTS));
  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(SEED_INVOICES));
  localStorage.setItem(STORAGE_KEY_SEEDED, 'true');
};

export const resetSeedData = () => {
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(SEED_SERVICE_REQUESTS));
  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(SEED_INVOICES));
  localStorage.setItem(STORAGE_KEY_SEEDED, 'true');
};
