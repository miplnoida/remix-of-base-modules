/**
 * BN Module — Platform Integration Contracts
 * 
 * These interfaces define what the BN module needs from the rest of the platform.
 * Each adapter has a concrete implementation that talks to the actual platform services.
 * To integrate with a different backend, only the adapter implementations change.
 */

// ─── Person Registry ───────────────────────────────────────────────

export interface PersonSummary {
  ssn: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'N';
  status: 'active' | 'deceased' | 'suspended' | 'pending';
  address?: AddressRecord;
  phone?: string;
  email?: string;
}

export interface AddressRecord {
  line1: string;
  line2?: string;
  city?: string;
  parish?: string;
  country: string;
  postalCode?: string;
}

export interface Dependant {
  ssn?: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'N';
}

export interface IBnPersonAdapter {
  lookupPerson(ssn: string): Promise<PersonSummary | null>;
  getPersonDOB(ssn: string): Promise<string | null>;
  getPersonStatus(ssn: string): Promise<string>;
  getPersonAddress(ssn: string): Promise<AddressRecord | null>;
  getDependants(ssn: string): Promise<Dependant[]>;
}

// ─── Contribution History ──────────────────────────────────────────

export interface ContributionSummary {
  ssn: string;
  totalWeeks: number;
  totalAmount: number;
  averageWeeklyWage: number;
  bestWeeks?: WageRecord[];
  windowStart: string;
  windowEnd: string;
}

export interface WageRecord {
  period: string;
  employerRegNo: string;
  employerName?: string;
  wages: number;
  weeks: number;
  contributions: number;
}

export interface IBnContributionAdapter {
  getContributionSummary(ssn: string, windowStart: string, windowEnd: string): Promise<ContributionSummary>;
  getWeeklyWages(ssn: string, periodStart: string, periodEnd: string): Promise<WageRecord[]>;
  getTotalContributions(ssn: string): Promise<{ weeks: number; amount: number }>;
  hasMinimumContributions(ssn: string, requiredWeeks: number, windowWeeks: number, referenceDate: string): Promise<boolean>;
}

// ─── Employer Registry ─────────────────────────────────────────────

export interface EmployerSummary {
  regNo: string;
  name: string;
  status: string;
  address?: string;
  industry?: string;
}

export interface EmploymentVerification {
  verified: boolean;
  employerRegNo: string;
  employerName: string;
  startDate?: string;
  endDate?: string;
  lastContributionPeriod?: string;
}

export interface IBnEmployerAdapter {
  lookupEmployer(regNo: string): Promise<EmployerSummary | null>;
  getEmployerStatus(regNo: string): Promise<string>;
  verifyEmployment(ssn: string, regNo: string, asOfDate: string): Promise<EmploymentVerification>;
}

// ─── Payment Services ──────────────────────────────────────────────

export interface PaymentInstruction {
  awardId: string;
  claimId: string;
  ssn: string;
  amount: number;
  currency: string;
  paymentMethod: 'EFT' | 'CHEQUE' | 'CASH';
  bankCode?: string;
  accountNumber?: string;
  dueDate: string;
  frequency: 'one_off' | 'weekly' | 'biweekly' | 'monthly';
  description: string;
}

export interface PaymentResult {
  instructionId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  reference?: string;
  message?: string;
}

export interface PaymentStatus {
  instructionId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paidDate?: string;
  reference?: string;
}

export interface IBnPaymentAdapter {
  submitPaymentInstruction(instruction: PaymentInstruction): Promise<PaymentResult>;
  getPaymentStatus(instructionId: string): Promise<PaymentStatus>;
  cancelPayment(instructionId: string, reason: string): Promise<void>;
  getPaymentHistory(ssn: string): Promise<PaymentStatus[]>;
}

// ─── Notification Services ─────────────────────────────────────────

export type BnNotificationType =
  | 'CLAIM_RECEIVED'
  | 'DOCS_REQUIRED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_DENIED'
  | 'PAYMENT_SCHEDULED'
  | 'REVIEW_DUE'
  | 'AWARD_SUSPENDED'
  | 'AWARD_RESUMED'
  | 'AWARD_TERMINATED'
  | 'LIFE_CERT_DUE';

export interface BnNotificationRequest {
  type: BnNotificationType;
  recipientSsn: string;
  claimId?: string;
  awardId?: string;
  channel: 'email' | 'sms' | 'both';
  templateData: Record<string, string | number>;
}

export interface IBnNotificationAdapter {
  sendClaimNotification(request: BnNotificationRequest): Promise<{ sent: boolean; messageId?: string }>;
  getNotificationHistory(ssn: string, claimId?: string): Promise<Array<{ type: string; sentAt: string; channel: string }>>;
}

// ─── Document Management ───────────────────────────────────────────

export interface DocumentRef {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  storageUrl: string;
  checksum?: string;
}

export interface DocumentUploadRequest {
  entityType: 'claim' | 'award' | 'evidence';
  entityId: string;
  file: File;
  category: string;
  description?: string;
}

export interface IBnDocumentAdapter {
  uploadEvidence(request: DocumentUploadRequest): Promise<DocumentRef>;
  getDocument(docRefId: string): Promise<Blob>;
  listDocuments(entityType: string, entityId: string): Promise<DocumentRef[]>;
  deleteDocument(docRefId: string, reason: string): Promise<void>;
}

// ─── Workflow Engine ───────────────────────────────────────────────

export interface WorkflowStartRequest {
  templateKey: string;
  entityType: 'claim' | 'award';
  entityId: string;
  context: Record<string, any>;
  initiatedBy: string;
}

export interface WorkflowState {
  instanceId: string;
  templateKey: string;
  currentStep: string;
  stepNumber: number;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  startedAt: string;
  history: Array<{ step: string; completedAt: string; outcome: string; actor: string }>;
}

export interface IBnWorkflowAdapter {
  startWorkflow(request: WorkflowStartRequest): Promise<{ instanceId: string }>;
  completeStep(instanceId: string, stepId: string, outcome: string, data?: Record<string, any>): Promise<void>;
  getWorkflowStatus(instanceId: string): Promise<WorkflowState>;
  cancelWorkflow(instanceId: string, reason: string): Promise<void>;
}

// ─── Audit (read-only — BN uses platform triggers) ────────────────

export interface IBnAuditAdapter {
  getAuditTrail(entityType: string, entityId: string): Promise<Array<{
    action: string;
    module: string;
    before_value: Record<string, any> | null;
    after_value: Record<string, any> | null;
    user_name: string;
    created_at: string;
  }>>;
}
