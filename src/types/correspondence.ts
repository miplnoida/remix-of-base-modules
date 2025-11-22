// ============================================
// CENTRAL CORRESPONDENCE MODULE TYPES
// ============================================

// ============================================
// ENUMS: Correspondence Types
// ============================================

export enum CorrespondenceDirection {
  OUTGOING = 'OUTGOING',
  INCOMING = 'INCOMING'
}

export enum CorrespondenceChannel {
  LETTER = 'LETTER',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  IN_PERSON = 'IN_PERSON',
  PORTAL = 'PORTAL',
  FAX = 'FAX',
  OTHER = 'OTHER'
}

export enum CorrespondenceStatus {
  // Outgoing statuses
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  
  // Incoming statuses
  RECEIVED = 'RECEIVED',
  LOGGED = 'LOGGED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESPONDED = 'RESPONDED',
  CLOSED = 'CLOSED'
}

export enum CorrespondencePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum PartyType {
  EMPLOYER = 'EMPLOYER',
  INSURED_PERSON = 'INSURED_PERSON',
  OTHER = 'OTHER'
}

export enum ContextType {
  COMPLIANCE_CASE = 'COMPLIANCE_CASE',
  COMPLIANCE_SUBCASE = 'COMPLIANCE_SUBCASE',
  BENEFIT_CLAIM = 'BENEFIT_CLAIM',
  C3_SUBMISSION = 'C3_SUBMISSION',
  AUDIT_PLAN = 'AUDIT_PLAN',
  AUDIT_VISIT = 'AUDIT_VISIT',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  LEGAL_REFERRAL = 'LEGAL_REFERRAL',
  REGISTRATION = 'REGISTRATION',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  PAYMENT_ARRANGEMENT = 'PAYMENT_ARRANGEMENT',
  OTHER = 'OTHER'
}

export enum CorrespondenceModule {
  COMPLIANCE = 'COMPLIANCE',
  BENEFITS = 'BENEFITS',
  CONTRIBUTIONS = 'CONTRIBUTIONS',
  FINANCE = 'FINANCE',
  REGISTRATION = 'REGISTRATION',
  INTERNAL_AUDIT = 'INTERNAL_AUDIT',
  LEGAL = 'LEGAL',
  GENERAL = 'GENERAL'
}

// ============================================
// INTERFACES: Party & Context Links
// ============================================

export interface CorrespondenceParty {
  id: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  isPrimary: boolean;
}

export interface CorrespondenceContext {
  contextType: ContextType;
  contextId: string;
  contextDescription: string;
  module: CorrespondenceModule;
}

// ============================================
// INTERFACES: Delivery Metadata
// ============================================

export interface DeliveryMetadata {
  // For electronic channels
  to?: string[];
  cc?: string[];
  bcc?: string[];
  
  // Delivery info
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'awaiting_acknowledgement' | 'acknowledged';
  deliveryProvider?: string; // 'resend', 'twilio', etc.
  deliveryReference?: string; // External provider reference
  deliveryAttempts?: number;
  lastDeliveryAttempt?: string;
  deliveryError?: string;
  
  // Physical delivery tracking (for letters/in-person)
  assignedInspectorId?: string;
  assignedInspectorName?: string;
  assignedAt?: string;
  deliveredByInspectorId?: string;
  deliveredByInspectorName?: string;
  deliveredAt?: string;
  
  // Acknowledgement/Signature
  recipientSignatureData?: string; // Base64 signature image
  recipientName?: string;
  recipientSignedAt?: string;
  deliveryNotes?: string; // Notes from inspector
  gpsLatitude?: number;
  gpsLongitude?: number;
  
  // Read receipts (for electronic)
  openedAt?: string;
  clickedAt?: string;
}

// ============================================
// INTERFACES: Template Info
// ============================================

export interface TemplateInfo {
  templateId: string;
  templateName: string;
  templateVersion: string;
  language: string;
  mergeFields?: Record<string, any>;
}

// ============================================
// INTERFACES: Correspondence Document
// ============================================

export interface CorrespondenceDocument {
  id: string;
  documentId: string; // Reference to Document Management System
  documentName: string;
  documentType: string; // 'generated_letter', 'attachment', 'scan', 'signature_page'
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
  uploadedDate: string;
  storageUrl?: string;
}

// ============================================
// INTERFACES: Main Correspondence Record
// ============================================

export interface Correspondence {
  id: string;
  correspondenceNumber: string; // Auto-generated: CORR-2024-00001
  
  // Basic Info
  direction: CorrespondenceDirection;
  channel: CorrespondenceChannel;
  status: CorrespondenceStatus;
  
  // Content
  subject: string;
  body: string;
  summary?: string; // For quick preview
  
  // Priority & Sensitivity
  priority: CorrespondencePriority;
  isConfidential: boolean;
  
  // Parties
  parties: CorrespondenceParty[];
  
  // Context Links
  contexts?: CorrespondenceContext[];
  
  // Template (for outgoing)
  templateInfo?: TemplateInfo;
  
  // Delivery (for electronic channels)
  deliveryMetadata?: DeliveryMetadata;
  
  // Documents & Attachments
  documents: CorrespondenceDocument[];
  
  // Dates
  createdDate: string;
  sentDate?: string; // For outgoing
  receivedDate?: string; // For incoming
  respondByDate?: string; // For incoming requiring response
  
  // Additional tracking for physical letters and emails
  communicationDate?: string; // Actual date of letter/email (different from system logged date)
  referenceNumber?: string; // External reference number for tracking
  storingTime?: string; // Timestamp when physical document was stored/filed
  
  // User Info
  createdBy: string;
  createdByName: string;
  sentBy?: string; // For outgoing
  sentByName?: string;
  loggedBy?: string; // For incoming
  loggedByName?: string;
  assignedTo?: string; // For incoming requiring action
  assignedToName?: string;
  
  // Workflow
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  
  // Thread/Reply Info
  inReplyTo?: string; // CorrespondenceID if this is a reply
  threadId?: string; // Group related correspondence
  
  // Audit Trail
  lastModifiedDate: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  
  // Notes
  internalNotes?: string;
}

// ============================================
// INTERFACES: Create Requests
// ============================================

export interface CreateOutgoingCorrespondenceRequest {
  channel: CorrespondenceChannel;
  subject: string;
  body: string;
  parties: Array<{
    partyType: PartyType;
    partyId: string;
    isPrimary: boolean;
  }>;
  contexts?: Array<{
    contextType: ContextType;
    contextId: string;
    module: CorrespondenceModule;
  }>;
  priority?: CorrespondencePriority;
  isConfidential?: boolean;
  templateId?: string;
  mergeFields?: Record<string, any>;
  documentIds?: string[];
  to?: string[]; // For email
  cc?: string[];
  phone?: string; // For SMS
  sendImmediately?: boolean;
  requiresApproval?: boolean;
  inReplyTo?: string;
}

export interface CreateIncomingCorrespondenceRequest {
  channel: CorrespondenceChannel;
  subject: string;
  body: string;
  summary?: string;
  parties: Array<{
    partyType: PartyType;
    partyId: string;
    isPrimary: boolean;
  }>;
  contexts?: Array<{
    contextType: ContextType;
    contextId: string;
    module: CorrespondenceModule;
  }>;
  priority?: CorrespondencePriority;
  isConfidential?: boolean;
  receivedDate: string;
  documentIds?: string[];
  assignTo?: string;
  respondByDate?: string;
}

// ============================================
// INTERFACES: Search & Filter
// ============================================

export interface CorrespondenceFilters {
  direction?: CorrespondenceDirection;
  channel?: CorrespondenceChannel[];
  status?: CorrespondenceStatus[];
  priority?: CorrespondencePriority[];
  partyType?: PartyType;
  partyId?: string;
  contextType?: ContextType;
  contextId?: string;
  module?: CorrespondenceModule[];
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
  searchQuery?: string;
  isConfidential?: boolean;
}

export interface CorrespondenceSummary {
  totalCount: number;
  byDirection: {
    outgoing: number;
    incoming: number;
  };
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  byModule: Record<string, number>;
  pendingResponse: number;
  overdueResponse: number;
}

// ============================================
// INTERFACES: Statistics
// ============================================

export interface CorrespondenceStats {
  totalCorrespondence: number;
  outgoingCount: number;
  incomingCount: number;
  draftCount: number;
  sentCount: number;
  receivedCount: number;
  pendingResponseCount: number;
  overdueResponseCount: number;
  byChannel: Record<CorrespondenceChannel, number>;
  byModule: Record<CorrespondenceModule, number>;
  averageResponseTime: number; // in days
  recentActivity: Correspondence[];
}
