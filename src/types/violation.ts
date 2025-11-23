// ============================================
// VIOLATION TYPES
// ============================================

export enum ViolationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED'
}

export enum ViolationType {
  NON_REGISTRATION = 'NON_REGISTRATION',
  UNDER_REPORTING = 'UNDER_REPORTING',
  LATE_SUBMISSION = 'LATE_SUBMISSION',
  NON_PAYMENT = 'NON_PAYMENT',
  WAGE_BOOK_VIOLATION = 'WAGE_BOOK_VIOLATION',
  EMPLOYEE_MISCLASSIFICATION = 'EMPLOYEE_MISCLASSIFICATION',
  OTHER = 'OTHER'
}

export interface Violation {
  id: string;
  violationNumber: string;
  employerId: string;
  employerName: string;
  territory: 'St Kitts' | 'Nevis';
  violationType: ViolationType;
  status: ViolationStatus;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  discoveredDate: string;
  discoveredBy: string;
  discoveryMethod: 'Inspection Visit' | 'Audit' | 'Complaint' | 'Data Analysis' | 'Other';
  inspectionVisitId?: string;
  findingIds: string[];
  evidenceIds: string[];
  assignedToUserId?: string;
  assignedToName?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateViolationRequest {
  employerId: string;
  violationType: ViolationType;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  discoveryMethod: string;
  inspectionVisitId?: string;
  findingIds?: string[];
  evidenceIds?: string[];
  assignedToUserId?: string;
  dueDate?: string;
}
