export type CaseType = 'Prosecution' | 'Compliance' | 'Appeal' | 'Recovery' | 'Employer Dispute' | 'IP Dispute' | 'Garnishment' | 'Other';

export type CaseStatus = 
  | 'Draft' 
  | 'Filed' 
  | 'Under Review' 
  | 'Hearing Scheduled' 
  | 'Hearing Held' 
  | 'Decision Pending' 
  | 'Order Issued' 
  | 'Closed – Compliant' 
  | 'Closed – Non-Compliant' 
  | 'Withdrawn' 
  | 'Appealed' 
  | 'Reopened';

export type CaseFlag = 'Urgent' | 'Escalated' | 'On Hold' | 'Confidential' | 'External Counsel';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type CaseSource = 'Complaint' | 'Referral' | 'System' | 'Audit';

export type LegalRole = 'Clerk' | 'LegalOfficer' | 'Supervisor' | 'FinanceOfficer' | 'ReadOnly' | 'Admin';

export interface LegalCase {
  id: string;
  number: string;
  title: string;
  caseType: CaseType;
  status: CaseStatus;
  stage: string;
  priority: Priority;
  confidential: boolean;
  source: CaseSource;
  summary: string;
  reliefSought: string;
  assignee: string;
  createdOn: string;
  filedOn?: string;
  nextEventAt?: string;
  flags: CaseFlag[];
  relatedCaseIds: string[];
  ageDays: number;
  updatedOn: string;
}

export interface Party {
  id: string;
  caseId: string;
  role: 'Primary Respondent' | 'Complainant' | 'Representative' | 'Third Party';
  registryRef?: string;
  registryType?: 'person' | 'employer';
  name: string;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  representativeId?: string;
  serviceStatus: 'Not Served' | 'Served' | 'Service Failed';
  serviceMethod?: string;
  serviceDate?: string;
  notes?: string;
}

export interface Hearing {
  id: string;
  caseId: string;
  type: string;
  venue: string;
  startAt: string;
  endAt: string;
  panel: string[];
  agenda: string;
  attendance?: Record<string, boolean>;
  outcome?: string;
  minutesDocId?: string;
  recordingLink?: string;
}

export interface LegalTask {
  id: string;
  caseId: string;
  title: string;
  description: string;
  owner: string;
  priority: Priority;
  dueOn: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Deferred';
  recurrence?: string;
  checklist?: { item: string; completed: boolean }[];
  relatedEntity?: string;
}

export interface LegalDocument {
  id: string;
  caseId: string;
  type: 'Filings' | 'Evidence' | 'Notices' | 'Orders' | 'Correspondence' | 'Internal';
  name: string;
  version: number;
  size: string;
  uploadedBy: string;
  uploadedOn: string;
  linkedEntities: string[];
  confidential: boolean;
  checksum: string;
  url?: string;
}

export interface Order {
  id: string;
  caseId: string;
  number?: string;
  draftHtml: string;
  publishedPdfId?: string;
  findings: string;
  directives: string;
  complianceDue?: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Published';
  publishedOn?: string;
}

export interface Penalty {
  id: string;
  caseId: string;
  orderId?: string;
  type: string;
  amount: number;
  currency: string;
  dueOn: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Waived';
  payments: { date: string; amount: number }[];
}

export interface Settlement {
  id: string;
  caseId: string;
  terms: string;
  status: 'Proposed' | 'Accepted' | 'Rejected' | 'Completed';
  paymentPlan?: {
    installments: { dueDate: string; amount: number }[];
  };
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  type: string;
  actor: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
}

export const STATUS_COLOR_MAP: Record<CaseStatus, string> = {
  'Draft': 'bg-neutral-100 text-neutral-800 border-neutral-200',
  'Filed': 'bg-blue-100 text-blue-800 border-blue-200',
  'Under Review': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Hearing Scheduled': 'bg-teal-100 text-teal-800 border-teal-200',
  'Hearing Held': 'bg-teal-100 text-teal-800 border-teal-200',
  'Decision Pending': 'bg-amber-100 text-amber-800 border-amber-200',
  'Order Issued': 'bg-purple-100 text-purple-800 border-purple-200',
  'Closed – Compliant': 'bg-green-100 text-green-800 border-green-200',
  'Closed – Non-Compliant': 'bg-red-100 text-red-800 border-red-200',
  'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200',
  'Appealed': 'bg-pink-100 text-pink-800 border-pink-200',
  'Reopened': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const LEGAL_PERMISSIONS = {
  createCase: ['Clerk', 'LegalOfficer', 'Supervisor', 'Admin'],
  changeStatus: ['LegalOfficer', 'Supervisor', 'Admin'],
  assign: ['LegalOfficer', 'Supervisor', 'Admin'],
  publishOrder: ['Supervisor', 'Admin'],
  readConfidential: ['LegalOfficer', 'Supervisor', 'Admin'],
} as const;
