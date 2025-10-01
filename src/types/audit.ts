// ============= CORE ENTITIES =============

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  email: string;
  location: string;
  riskRating?: 'Low' | 'Medium' | 'High';
}

export interface Employer {
  id: string;
  name: string;
  registrationNumber: string;
  zone: string;
  status: 'Active' | 'Inactive';
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
}

// ============= AUDITOR MANAGEMENT =============

export interface Auditor {
  id: string;
  name: string;
  employeeNo: string;
  email: string;
  phone: string;
  role: 'Audit Director' | 'Audit Manager' | 'Auditor' | 'Admin';
  skills: string[];
  certifications: string[];
  seniorityLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  employmentStatus: 'Active' | 'Inactive';
  workLocation: string;
  supervisorId?: string;
  signatureImage?: string;
}

export interface AuditorWorkload {
  id: string;
  auditorId: string;
  fiscalYear: string;
  assignedHours: number;
  bookedHours: number;
  remainingHours: number;
}

export interface AuditorAvailability {
  id: string;
  auditorId: string;
  date: string;
  availability: 'Available' | 'On Leave' | 'Public Holiday' | 'Training';
}

export interface AuditorKPI {
  id: string;
  auditorId: string;
  periodStart: string;
  periodEnd: string;
  auditsCompleted: number;
  findingsQualityScore: number;
  onTimeRate: number;
}

// ============= LEAVE & CALENDAR =============

export interface Holiday {
  id: string;
  date: string;
  name: string;
  country: string;
  isSSBSpecific: boolean;
}

export interface LeaveRequest {
  id: string;
  requestId: string;
  auditorId: string;
  auditorName: string;
  leaveType: 'Annual' | 'Sick' | 'Training' | 'Other';
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approverId?: string;
  approverName?: string;
  decisionNote?: string;
  submittedDate?: string;
  decidedDate?: string;
}

// ============= AUDIT PLANNING =============

export interface AuditPlan {
  id: string;
  title: string;
  fiscalYear: string;
  period: string;
  monthYear: string;
  zone?: string;
  departments: string[];
  objective: string;
  scope: string;
  methodology: string;
  riskBasis: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Scheduled' | 'In Progress' | 'Completed' | 'Closed' | 'Rejected' | 'Cancelled';
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
  approvedDate?: string;
  approver?: string;
  approvalComments?: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  totalEmployers: number;
  assignedEmployers: number;
  attachments: string[];
}

export interface AuditPlanEmployer {
  id: string;
  planId: string;
  employerId: string;
  employer: Employer;
  riskRating: 'Low' | 'Medium' | 'High';
  rationale: string;
  auditor?: string;
  auditorName?: string;
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
}

// ============= AUDIT EXECUTION =============

export interface AuditActivity {
  id: string;
  planId: string;
  deptId?: string;
  employerId?: string;
  name: string;
  description: string;
  controlArea: 'Contributions' | 'Benefits' | 'Finance/AP' | 'IT' | 'HR' | 'Compliance' | 'Other';
  type: 'Compliance Check' | 'Records Review' | 'Site Visit' | 'Contribution Verification' | 'Payroll Sampling';
  checklistTemplateId?: string;
  evidenceExpected: string[];
  assignedAuditors: string[];
  title: string;
  auditor: string;
  auditorName: string;
  startDate: string;
  endDate: string;
  plannedDateFrom: string;
  plannedDateTo: string;
  actualDateFrom?: string;
  actualDateTo?: string;
  location: string;
  status: 'Planned' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rescheduled';
  priority: 'Low' | 'Medium' | 'High';
}

export interface ProcedureStep {
  id: string;
  activityId: string;
  stepNo: number;
  procedureDesc: string;
  sampleSize: number;
  population: number;
  criteria: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface Evidence {
  id: string;
  evidenceId: string;
  activityId?: string;
  findingId?: string;
  file: string;
  description: string;
  referenceNo: string;
  hash: string;
  uploadedBy: string;
  uploadDate: string;
}

// ============= FINDINGS & RESPONSES =============

export interface Finding {
  id: string;
  findingId: string;
  planId: string;
  activityId: string;
  deptId?: string;
  title: string;
  condition: string;
  criteria: string;
  cause: string;
  effect: string;
  recommendation: string;
  riskRating: 'High' | 'Medium' | 'Low';
  impactArea: 'Financial' | 'Compliance' | 'Operational' | 'IT' | 'Other';
  ownerRole: string;
  status: 'Draft' | 'For Mgmt Response' | 'Under Review' | 'Agreed' | 'Not Agreed' | 'Finalized';
  createdBy: string;
  createdDate: string;
}

export interface ManagementResponse {
  id: string;
  findingId: string;
  responseText: string;
  actionPlan: string;
  responsiblePerson: string;
  targetDate: string;
  supportingDocs: string[];
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Accepted';
  submittedBy: string;
  submittedDate?: string;
}

export interface ActionTracking {
  id: string;
  findingId: string;
  actionStatus: 'Not Started' | 'In Progress' | 'Implemented' | 'Verified' | 'Closed';
  evidenceOfImplementation: string[];
  verifiedBy?: string;
  verificationDate?: string;
  notes: string;
}

export interface AuditActivityResult {
  id: string;
  activityId: string;
  observations: string;
  findings: string;
  complianceStatus: 'Compliant' | 'Partially Compliant' | 'Non-Compliant';
  monetaryVariance: number;
  recommendation: string;
  followUpRequired: boolean;
  completedDate: string;
  attachments: string[];
}

export interface AuditFollowUp {
  id: string;
  activityResultId: string;
  activityId: string;
  planId: string;
  actionRequired: string;
  dueDate: string;
  responsibleParty: 'Employer' | 'Audit Department' | 'Department Head' | 'Other';
  responsibleName: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  resolution?: string;
  resolvedDate?: string;
}

// ============= DOCUMENTS & TEMPLATES =============

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'Notice of Audit' | 'PBC Request' | 'Reminder/Escalation' | 'Exit Meeting Invite' | 'Draft Report Transmittal' | 'Final Report Transmittal' | 'Follow-up Notice';
  content: string;
  mergeFields: string[];
  active: boolean;
}

export interface DocumentInstance {
  id: string;
  templateId: string;
  planId?: string;
  activityId?: string;
  findingId?: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  content: string;
  status: 'Draft' | 'Sent' | 'Acknowledged';
  generatedDate: string;
  sentDate?: string;
  acknowledgedDate?: string;
}

// ============= SYSTEM & TRACKING =============

export interface AuditAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  uploadedBy: string;
  relatedTo: 'Plan' | 'Activity' | 'Result' | 'FollowUp' | 'Finding' | 'Response';
  relatedId: string;
  url: string;
}

export interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  message: string;
  status: 'Pending' | 'Sent' | 'Failed';
  sentDate?: string;
  relatedEntity: string;
  relatedId: string;
}

export interface AuditTrail {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedDate: string;
  changes: string;
}

export interface AuditMetrics {
  totalPlans: number;
  activePlans: number;
  completedActivities: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  complianceRate: number;
  openFindings: number;
  overdueActions: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'activity' | 'deadline' | 'reminder' | 'leave' | 'holiday';
  activityId?: string;
  auditor: string;
  employer: string;
  status: string;
  location?: string;
}