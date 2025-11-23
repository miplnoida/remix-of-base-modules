// ============================================
// VIOLATION TYPES
// ============================================

export enum ViolationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum ViolationType {
  NON_REGISTRATION = 'NON_REGISTRATION',
  UNDER_REPORTING = 'UNDER_REPORTING',
  LATE_SUBMISSION = 'LATE_SUBMISSION',
  LATE_PAYMENT = 'LATE_PAYMENT',
  NON_PAYMENT = 'NON_PAYMENT',
  WAGE_BOOK_VIOLATION = 'WAGE_BOOK_VIOLATION',
  EMPLOYEE_MISCLASSIFICATION = 'EMPLOYEE_MISCLASSIFICATION',
  UNREPORTED_EMPLOYEE = 'UNREPORTED_EMPLOYEE',
  UNREGISTERED_BUSINESS_ACTIVITY = 'UNREGISTERED_BUSINESS_ACTIVITY',
  OTHER = 'OTHER'
}

export interface Violation {
  id: string;
  violationNumber: string;
  employerId?: string;
  employerName?: string;
  territory: 'St Kitts' | 'Nevis';
  violationType: ViolationType;
  status: ViolationStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  severity?: 'Low' | 'Medium' | 'High' | 'Critical'; // Backward compatibility
  summary: string;
  description?: string;
  // Links to inspection
  inspectionVisitId?: string;
  inspectionFindingId?: string;
  // Scouting violations (no employer yet)
  isUnlinked: boolean;
  candidateBusinessName?: string;
  candidateLocation?: string;
  candidateActivityType?: string;
  estimatedEmployees?: number;
  // Assignment
  assignedToUserId?: string;
  assignedToName?: string;
  // Dates
  discoveredDate: string;
  discoveredBy: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  createdAt: string;
  updatedAt: string;
  // Backward compatibility
  findingIds?: string[];
  evidenceIds?: string[];
  discoveryMethod?: string;
}

export interface CreateViolationRequest {
  employerId?: string;
  violationType: ViolationType;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  description?: string;
  inspectionVisitId?: string;
  inspectionFindingId?: string;
  // For scouting violations
  isUnlinked?: boolean;
  candidateBusinessName?: string;
  candidateLocation?: string;
  candidateActivityType?: string;
  estimatedEmployees?: number;
  assignedToUserId?: string;
  dueDate?: string;
}

export interface UpdateViolationRequest {
  status?: ViolationStatus;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedToUserId?: string;
  dueDate?: string;
  resolutionNotes?: string;
}

export interface LinkViolationToEmployerRequest {
  violationId: string;
  employerId: string;
}
