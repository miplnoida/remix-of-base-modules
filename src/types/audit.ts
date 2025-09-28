export interface Zone {
  id: string;
  name: string;
  description: string;
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

export interface AuditPlan {
  id: string;
  period: string;
  monthYear: string;
  zone: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled';
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
  approvedDate?: string;
  approver?: string;
  approvalComments?: string;
  totalEmployers: number;
  assignedEmployers: number;
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

export interface AuditActivity {
  id: string;
  planId: string;
  employerId: string;
  auditor: string;
  auditorName: string;
  type: 'Compliance Check' | 'Records Review' | 'Site Visit' | 'Contribution Verification' | 'Payroll Sampling';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rescheduled';
  priority: 'Low' | 'Medium' | 'High';
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
  responsibleParty: 'Employer' | 'Audit Department' | 'Other';
  responsibleName: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  resolution?: string;
  resolvedDate?: string;
}

export interface AuditAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  uploadedBy: string;
  relatedTo: 'Plan' | 'Activity' | 'Result' | 'FollowUp';
  relatedId: string;
  url: string;
}

export interface AuditMetrics {
  totalPlans: number;
  activePlans: number;
  completedActivities: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  complianceRate: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'activity' | 'deadline' | 'reminder';
  activityId?: string;
  auditor: string;
  employer: string;
  status: string;
  location?: string;
}