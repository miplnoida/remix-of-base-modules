import { ServiceRequest, Invoice } from '@/types/serviceRequest';

const STORAGE_KEY_REQUESTS = 'service_requests';
const STORAGE_KEY_INVOICES = 'service_invoices';
const STORAGE_KEY_SEEDED = 'service_requests_seeded';

// Seed Service Requests - Full workflow examples
export const SEED_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'SR-1737316800000-123',
    insuredPersonId: 'IP10001',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC001',
    reason: 'Lost original social security card during recent travel. Need replacement for employment verification.',
    priorityId: 'PRI002',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    assignedOfficerId: 'OFF001',
    status: 'Completed',
    invoiceId: 'INV-1737316800000-123',
    internalNotes: 'Verified identity with passport. Card issued on 2025-01-15.',
    createdAt: '2025-01-10T09:30:00.000Z',
    updatedAt: '2025-01-15T14:20:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-1737403200000-456',
    insuredPersonId: 'IP10002',
    serviceCategoryId: 'CAT002',
    serviceTypeId: 'SVC004',
    reason: 'Applying for mortgage - bank requires certified contribution history for past 10 years.',
    priorityId: 'PRI002',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    assignedOfficerId: 'OFF002',
    status: 'Under Review',
    invoiceId: 'INV-1737403200000-456',
    internalNotes: 'Payment received. Records team reviewing contribution data for completeness.',
    createdAt: '2025-01-11T10:15:00.000Z',
    updatedAt: '2025-01-18T11:30:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-1737489600000-789',
    insuredPersonId: 'IP10003',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC003',
    reason: 'Name change due to marriage. Marriage certificate dated 2024-12-15. Need new card with updated surname.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    assignedOfficerId: 'OFF001',
    status: 'Payment Received',
    invoiceId: 'INV-1737489600000-789',
    internalNotes: 'Payment confirmed. Marriage certificate verified. Ready for card production.',
    createdAt: '2025-01-12T14:00:00.000Z',
    updatedAt: '2025-01-18T09:45:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-1737576000000-101',
    insuredPersonId: 'IP10004',
    serviceCategoryId: 'CAT003',
    serviceTypeId: 'SVC006',
    reason: 'Original benefit award letter misplaced. Need reprint for pension application with private company.',
    priorityId: 'PRI003',
    source: 'COUNTER',
    processingUnitId: 'UNIT003',
    assignedOfficerId: 'OFF003',
    status: 'Payment Pending',
    invoiceId: 'INV-1737576000000-101',
    internalNotes: 'Invoice generated. Awaiting payment at cashier.',
    createdAt: '2025-01-13T11:20:00.000Z',
    updatedAt: '2025-01-13T11:25:00.000Z',
    createdBy: 'Sarah Martinez'
  },
  {
    id: 'SR-1737662400000-202',
    insuredPersonId: 'IP10005',
    serviceCategoryId: 'CAT006',
    serviceTypeId: 'SVC010',
    reason: 'Self-employed entrepreneur. Wish to register as voluntary contributor for social security benefits.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT005',
    assignedOfficerId: 'OFF005',
    status: 'Invoice Generated',
    invoiceId: 'INV-1737662400000-202',
    internalNotes: 'Invoice generated. Customer reviewing payment options.',
    createdAt: '2025-01-14T09:00:00.000Z',
    updatedAt: '2025-01-14T09:10:00.000Z',
    createdBy: 'Lisa Anderson'
  },
  {
    id: 'SR-1737748800000-303',
    insuredPersonId: 'IP10001',
    serviceCategoryId: 'CAT002',
    serviceTypeId: 'SVC005',
    reason: 'Informal contribution statement request for personal records.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    status: 'Draft',
    internalNotes: 'Initial request captured. Customer will return tomorrow to complete.',
    createdAt: '2025-01-15T15:30:00.000Z',
    updatedAt: '2025-01-15T15:30:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-1737835200000-404',
    insuredPersonId: 'IP10003',
    serviceCategoryId: 'CAT001',
    serviceTypeId: 'SVC002',
    reason: 'Fourth replacement card - previous cards lost/damaged on multiple occasions.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT001',
    assignedOfficerId: 'OFF001',
    status: 'Completed',
    invoiceId: 'INV-1737835200000-404',
    internalNotes: 'Higher fee collected. Card issued. Customer advised on card care.',
    createdAt: '2025-01-16T10:00:00.000Z',
    updatedAt: '2025-01-17T16:30:00.000Z',
    createdBy: 'Maria Thompson'
  },
  {
    id: 'SR-1737921600000-505',
    insuredPersonId: 'IP10002',
    serviceCategoryId: 'CAT004',
    serviceTypeId: 'SVC008',
    reason: 'Appeal late C3 submission penalty - medical emergency prevented timely filing.',
    priorityId: 'PRI002',
    source: 'COUNTER',
    processingUnitId: 'UNIT004',
    assignedOfficerId: 'OFF004',
    status: 'Under Review',
    invoiceId: 'INV-1737921600000-505',
    internalNotes: 'Payment received. Compliance team reviewing medical documentation.',
    createdAt: '2025-01-17T13:45:00.000Z',
    updatedAt: '2025-01-18T10:00:00.000Z',
    createdBy: 'David Chen'
  },
  {
    id: 'SR-1738008000000-606',
    insuredPersonId: 'IP10004',
    serviceCategoryId: 'CAT005',
    serviceTypeId: 'SVC009',
    reason: 'Certificate of coverage needed for work assignment in Barbados - international reciprocal agreement.',
    priorityId: 'PRI003',
    source: 'COUNTER',
    processingUnitId: 'UNIT002',
    assignedOfficerId: 'OFF002',
    status: 'Payment Received',
    invoiceId: 'INV-1738008000000-606',
    internalNotes: 'Urgent request. Payment confirmed. Certificate being prepared for same-day issuance.',
    createdAt: '2025-01-18T08:00:00.000Z',
    updatedAt: '2025-01-18T08:30:00.000Z',
    createdBy: 'John Williams'
  },
  {
    id: 'SR-1738094400000-707',
    insuredPersonId: 'IP10005',
    serviceCategoryId: 'CAT003',
    serviceTypeId: 'SVC007',
    reason: 'Requesting benefit payment history for past 5 years - needed for tax filing purposes.',
    priorityId: 'PRI001',
    source: 'COUNTER',
    processingUnitId: 'UNIT003',
    status: 'Rejected',
    internalNotes: 'Request rejected - customer does not have any benefit payment history in system.',
    createdAt: '2025-01-19T11:00:00.000Z',
    updatedAt: '2025-01-19T11:15:00.000Z',
    createdBy: 'Sarah Martinez'
  }
];

// Seed Invoices - matching the service requests
export const SEED_INVOICES: Invoice[] = [
  {
    id: 'INV-1737316800000-123',
    invoiceNumber: 'INV-2025-000001',
    insuredPersonId: 'IP10001',
    serviceRequestId: 'SR-1737316800000-123',
    baseFee: 20.00,
    additionalFee: 0,
    totalAmount: 20.00,
    accountingHeadCode: 'FEE_CARD_REPLACEMENT',
    status: 'Paid',
    createdAt: '2025-01-10T09:35:00.000Z',
    paidAt: '2025-01-10T10:15:00.000Z'
  },
  {
    id: 'INV-1737403200000-456',
    invoiceNumber: 'INV-2025-000002',
    insuredPersonId: 'IP10002',
    serviceRequestId: 'SR-1737403200000-456',
    baseFee: 40.00,
    additionalFee: 0,
    totalAmount: 40.00,
    accountingHeadCode: 'FEE_CONTRIBUTION_CERT',
    status: 'Paid',
    createdAt: '2025-01-11T10:20:00.000Z',
    paidAt: '2025-01-11T11:00:00.000Z'
  },
  {
    id: 'INV-1737489600000-789',
    invoiceNumber: 'INV-2025-000003',
    insuredPersonId: 'IP10003',
    serviceRequestId: 'SR-1737489600000-789',
    baseFee: 25.00,
    additionalFee: 0,
    totalAmount: 25.00,
    accountingHeadCode: 'FEE_NAME_CHANGE',
    status: 'Paid',
    createdAt: '2025-01-12T14:05:00.000Z',
    paidAt: '2025-01-12T15:30:00.000Z'
  },
  {
    id: 'INV-1737576000000-101',
    invoiceNumber: 'INV-2025-000004',
    insuredPersonId: 'IP10004',
    serviceRequestId: 'SR-1737576000000-101',
    baseFee: 10.00,
    additionalFee: 0,
    totalAmount: 10.00,
    accountingHeadCode: 'FEE_BENEFIT_REPRINT',
    status: 'Pending',
    createdAt: '2025-01-13T11:25:00.000Z'
  },
  {
    id: 'INV-1737662400000-202',
    invoiceNumber: 'INV-2025-000005',
    insuredPersonId: 'IP10005',
    serviceRequestId: 'SR-1737662400000-202',
    baseFee: 50.00,
    additionalFee: 0,
    totalAmount: 50.00,
    accountingHeadCode: 'FEE_VOLUNTARY_REG',
    status: 'Pending',
    createdAt: '2025-01-14T09:10:00.000Z'
  },
  {
    id: 'INV-1737835200000-404',
    invoiceNumber: 'INV-2025-000006',
    insuredPersonId: 'IP10003',
    serviceRequestId: 'SR-1737835200000-404',
    baseFee: 150.00,
    additionalFee: 0,
    totalAmount: 150.00,
    accountingHeadCode: 'FEE_CARD_REPLACEMENT_3RD',
    status: 'Paid',
    createdAt: '2025-01-16T10:05:00.000Z',
    paidAt: '2025-01-16T10:30:00.000Z'
  },
  {
    id: 'INV-1737921600000-505',
    invoiceNumber: 'INV-2025-000007',
    insuredPersonId: 'IP10002',
    serviceRequestId: 'SR-1737921600000-505',
    baseFee: 30.00,
    additionalFee: 0,
    totalAmount: 30.00,
    accountingHeadCode: 'FEE_LATE_APPEAL',
    status: 'Paid',
    createdAt: '2025-01-17T13:50:00.000Z',
    paidAt: '2025-01-17T14:20:00.000Z'
  },
  {
    id: 'INV-1738008000000-606',
    invoiceNumber: 'INV-2025-000008',
    insuredPersonId: 'IP10004',
    serviceRequestId: 'SR-1738008000000-606',
    baseFee: 35.00,
    additionalFee: 75.00,
    totalAmount: 110.00,
    accountingHeadCode: 'FEE_COVERAGE_CERT',
    status: 'Paid',
    createdAt: '2025-01-18T08:05:00.000Z',
    paidAt: '2025-01-18T08:20:00.000Z'
  }
];

// Initialize seed data
export const initializeSeedData = () => {
  const seeded = localStorage.getItem(STORAGE_KEY_SEEDED);
  
  if (!seeded) {
    // Seed service requests
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(SEED_SERVICE_REQUESTS));
    
    // Seed invoices
    localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(SEED_INVOICES));
    
    // Mark as seeded
    localStorage.setItem(STORAGE_KEY_SEEDED, 'true');
    
    console.log('✅ Service Request system initialized with seed data');
  }
};

// Reset seed data (useful for testing)
export const resetSeedData = () => {
  localStorage.removeItem(STORAGE_KEY_SEEDED);
  initializeSeedData();
  console.log('🔄 Service Request system reset with fresh seed data');
};
