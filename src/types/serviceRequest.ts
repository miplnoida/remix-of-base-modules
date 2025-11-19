export type ServiceSource = 'COUNTER' | 'QUEUE' | 'ONLINE';

export type InvoiceStatus = 'Pending' | 'Paid' | 'Cancelled';

export type ServiceRequestStatus = 
  | 'Draft' 
  | 'Invoice Generated' 
  | 'Payment Pending' 
  | 'Payment Received' 
  | 'Under Review' 
  | 'Completed' 
  | 'Rejected';

// Master Data Types
export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
}

export interface ServiceType {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  defaultProcessingUnitId?: string;
  requiresExpressOption?: boolean;
  requiresVerification?: boolean;
}

export interface Priority {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ProcessingUnit {
  id: string;
  name: string;
  description: string;
}

export interface WorkflowStatus {
  id: string;
  code: ServiceRequestStatus;
  label: string;
}

export interface ReasonCode {
  id: string;
  serviceTypeId: string;
  code: string;
  description: string;
}

// Fee Configuration
export interface FeeConfiguration {
  id: string;
  serviceTypeId: string;
  amount: number;
  accountingHeadCode: string;
  accountingHeadName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}

// Insured Person
export interface InsuredPerson {
  id: string;
  ssn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  contactPhone: string;
  email: string;
  address?: string;
}

// Invoice
export interface Invoice {
  id: string;
  invoiceNumber: string;
  insuredPersonId: string;
  serviceRequestId: string;
  baseFee: number;
  additionalFee: number;
  totalAmount: number;
  accountingHeadCode: string;
  status: InvoiceStatus;
  createdAt: string;
  paidAt?: string;
}

// Service Request
export interface ServiceRequest {
  id: string;
  insuredPersonId: string;
  serviceCategoryId: string;
  serviceTypeId: string;
  reason: string;
  priorityId: string;
  source: ServiceSource;
  queueTokenId?: string;
  processingUnitId: string;
  assignedOfficerId?: string;
  status: ServiceRequestStatus;
  invoiceId?: string;
  internalNotes?: string;
  attachments?: ServiceRequestAttachment[];
  verificationRequired?: boolean;
  verificationStatus?: 'Pending' | 'Approved' | 'Rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ServiceRequestAttachment {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

// Officer/User
export interface Officer {
  id: string;
  name: string;
  email: string;
  department: string;
}
