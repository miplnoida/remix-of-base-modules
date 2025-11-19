import { 
  ServiceCategory, 
  ServiceType, 
  Priority, 
  ProcessingUnit, 
  WorkflowStatus,
  ReasonCode,
  Officer 
} from '@/types/serviceRequest';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'CAT001',
    name: 'Card & Identity',
    description: 'Services related to social security cards and identity verification'
  },
  {
    id: 'CAT002',
    name: 'Contributions & Records',
    description: 'Contribution history, statements, and record requests'
  },
  {
    id: 'CAT003',
    name: 'Benefits & Claims',
    description: 'Benefit-related services and documentation'
  },
  {
    id: 'CAT004',
    name: 'Compliance & Penalties',
    description: 'Compliance matters and penalty-related services'
  },
  {
    id: 'CAT005',
    name: 'General Certification',
    description: 'General certifications and official letters'
  },
  {
    id: 'CAT006',
    name: 'Appeals & Reviews',
    description: 'Appeal submissions and case reviews'
  }
];

export const SERVICE_TYPES: ServiceType[] = [
  // Card & Identity
  {
    id: 'SVC001',
    categoryId: 'CAT001',
    name: 'Replacement Social Security Card',
    description: 'First or second replacement card',
    defaultProcessingUnitId: 'UNIT001'
  },
  {
    id: 'SVC002',
    categoryId: 'CAT001',
    name: 'Third/Subsequent Replacement Card',
    description: 'Third or subsequent card replacement (higher fee)',
    defaultProcessingUnitId: 'UNIT001'
  },
  {
    id: 'SVC003',
    categoryId: 'CAT001',
    name: 'Name/Address Change & New Card',
    description: 'Update personal details and issue new card',
    defaultProcessingUnitId: 'UNIT001'
  },
  // Contributions & Records
  {
    id: 'SVC004',
    categoryId: 'CAT002',
    name: 'Certified Contribution History',
    description: 'Official contribution history certificate',
    defaultProcessingUnitId: 'UNIT002'
  },
  {
    id: 'SVC005',
    categoryId: 'CAT002',
    name: 'Contribution Statement',
    description: 'Non-certified contribution statement',
    defaultProcessingUnitId: 'UNIT002'
  },
  // Benefits & Claims
  {
    id: 'SVC006',
    categoryId: 'CAT003',
    name: 'Benefit Award Letter Reprint',
    description: 'Reprint of benefit award letter',
    defaultProcessingUnitId: 'UNIT003'
  },
  {
    id: 'SVC007',
    categoryId: 'CAT003',
    name: 'Benefit Payment History',
    description: 'History of benefit payments',
    defaultProcessingUnitId: 'UNIT003'
  },
  // Compliance & Penalties
  {
    id: 'SVC008',
    categoryId: 'CAT004',
    name: 'Late Submission Appeal',
    description: 'Appeal for late submission penalties',
    defaultProcessingUnitId: 'UNIT004'
  },
  // General Certification
  {
    id: 'SVC009',
    categoryId: 'CAT005',
    name: 'Certificate of Coverage',
    description: 'Official certificate of social security coverage',
    defaultProcessingUnitId: 'UNIT002'
  },
  // Appeals & Reviews
  {
    id: 'SVC010',
    categoryId: 'CAT006',
    name: 'Voluntary Insured Registration',
    description: 'Register as voluntary insured person',
    defaultProcessingUnitId: 'UNIT005'
  },
  {
    id: 'SVC011',
    categoryId: 'CAT001',
    name: 'Express Handling Add-on',
    description: 'Expedited processing service',
    defaultProcessingUnitId: 'UNIT006',
    requiresExpressOption: true
  }
];

export const PRIORITIES: Priority[] = [
  { id: 'PRI001', name: 'Normal', sortOrder: 1 },
  { id: 'PRI002', name: 'High', sortOrder: 2 },
  { id: 'PRI003', name: 'Urgent', sortOrder: 3 }
];

export const PROCESSING_UNITS: ProcessingUnit[] = [
  {
    id: 'UNIT001',
    name: 'Registration Unit',
    description: 'Handles card issuance and registration'
  },
  {
    id: 'UNIT002',
    name: 'Records Unit',
    description: 'Manages contribution records and statements'
  },
  {
    id: 'UNIT003',
    name: 'Benefits Unit',
    description: 'Processes benefit-related requests'
  },
  {
    id: 'UNIT004',
    name: 'Compliance Unit',
    description: 'Handles compliance and penalty matters'
  },
  {
    id: 'UNIT005',
    name: 'General Customer Service',
    description: 'General inquiries and services'
  },
  {
    id: 'UNIT006',
    name: 'Finance Unit',
    description: 'Financial services and payments'
  }
];

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'ST001', code: 'Draft', label: 'Draft' },
  { id: 'ST002', code: 'Invoice Generated', label: 'Invoice Generated' },
  { id: 'ST003', code: 'Payment Pending', label: 'Payment Pending' },
  { id: 'ST004', code: 'Payment Received', label: 'Payment Received' },
  { id: 'ST005', code: 'Under Review', label: 'Under Review' },
  { id: 'ST006', code: 'Completed', label: 'Completed' },
  { id: 'ST007', code: 'Rejected', label: 'Rejected' }
];

export const REASON_CODES: ReasonCode[] = [
  { id: 'RSN001', serviceTypeId: 'SVC001', code: 'LOST', description: 'Card Lost' },
  { id: 'RSN002', serviceTypeId: 'SVC001', code: 'DAMAGED', description: 'Card Damaged' },
  { id: 'RSN003', serviceTypeId: 'SVC001', code: 'STOLEN', description: 'Card Stolen' },
  { id: 'RSN004', serviceTypeId: 'SVC003', code: 'MARRIAGE', description: 'Change of Name by Marriage' },
  { id: 'RSN005', serviceTypeId: 'SVC003', code: 'DEED_POLL', description: 'Change of Name by Deed Poll' },
  { id: 'RSN006', serviceTypeId: 'SVC003', code: 'ADDRESS', description: 'Address Change Only' }
];

export const OFFICERS: Officer[] = [
  { id: 'OFF001', name: 'Maria Thompson', email: 'maria.thompson@ssb.kn', department: 'Registration' },
  { id: 'OFF002', name: 'John Williams', email: 'john.williams@ssb.kn', department: 'Records' },
  { id: 'OFF003', name: 'Sarah Martinez', email: 'sarah.martinez@ssb.kn', department: 'Benefits' },
  { id: 'OFF004', name: 'David Chen', email: 'david.chen@ssb.kn', department: 'Compliance' },
  { id: 'OFF005', name: 'Lisa Anderson', email: 'lisa.anderson@ssb.kn', department: 'Customer Service' }
];
