// ============================================
// WEEKLY AUDIT PLANNING & EXECUTION - TYPE DEFINITIONS
// ============================================

export enum WeeklyPlanWorkflowStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  NEED_CHANGES = 'NEED_CHANGES',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  IN_EXECUTION = 'IN_EXECUTION',
  COMPLETED = 'COMPLETED'
}

export enum VisitType {
  C3_FOLLOW_UP = 'C3_FOLLOW_UP',
  PAYMENT_FOLLOW_UP = 'PAYMENT_FOLLOW_UP',
  AUDIT = 'AUDIT',
  INSPECTION = 'INSPECTION',
  SCOUTING = 'SCOUTING',
  RISK_BASED_AUDIT = 'RISK_BASED_AUDIT',
  COMPLAINT_INVESTIGATION = 'COMPLAINT_INVESTIGATION'
}

export enum VisitDuration {
  HALF_DAY_AM = 'HALF_DAY_AM',
  HALF_DAY_PM = 'HALF_DAY_PM',
  FULL_DAY = 'FULL_DAY',
  SHORT = 'SHORT' // 1-2 hours
}

export enum VisitExecutionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED'
}

export enum EvidenceType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SIGNATURE = 'SIGNATURE'
}

// ============================================
// PLANNED VISIT
// ============================================
export interface PlannedVisit {
  id: string;
  planId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  visitDate: string; // YYYY-MM-DD
  employerId: string;
  employerName: string;
  visitType: VisitType;
  duration: VisitDuration;
  purpose: string;
  plannedStartTime?: string; // HH:MM
  plannedEndTime?: string; // HH:MM
  
  // Unplanned Sighting Support
  isUnplannedSighting?: boolean;
  sightingLocation?: string; // For unplanned sightings without employer
  
  // Execution tracking
  executionStatus: VisitExecutionStatus;
  checkInTime?: string;
  checkInGPSLat?: number;
  checkInGPSLng?: number;
  checkOutTime?: string;
  checkOutGPSLat?: number;
  checkOutGPSLng?: number;
  
  // Links
  caseId?: string;
  riskFactorId?: string;
  
  // Notes
  visitNotes?: string;
  findings?: string;
  
  // Rescheduling
  rescheduledTo?: string; // new date
  rescheduledReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EVIDENCE
// ============================================
export interface Evidence {
  id: string;
  visitId: string;
  type: EvidenceType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  description?: string;
  capturedAt: string;
  capturedBy: string;
  gpsLat?: number;
  gpsLng?: number;
}

// ============================================
// AUDIT CHECKLIST
// ============================================
export interface AuditChecklistItem {
  id: string;
  category: string;
  question: string;
  response?: 'Yes' | 'No' | 'N/A' | 'Partial';
  notes?: string;
  evidenceRequired: boolean;
  evidenceIds: string[];
}

export interface AuditChecklist {
  id: string;
  visitId: string;
  riskFactorId?: string;
  templateName: string;
  items: AuditChecklistItem[];
  completionPercentage: number;
  completedAt?: string;
}

// ============================================
// WEEKLY PLAN
// ============================================
export interface WeeklyAuditPlan {
  id: string;
  planNumber: string;
  inspectorId: string;
  inspectorName: string;
  weekStartDate: string; // Monday
  weekEndDate: string; // Sunday
  
  // Workflow
  status: WeeklyPlanWorkflowStatus;
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerRole?: 'SENIOR_INSPECTOR' | 'MANAGER';
  reviewComments?: string;
  approvedAt?: string;
  approvedBy?: string;
  
  // Visits
  plannedVisits: PlannedVisit[];
  totalPlannedVisits: number;
  completedVisits: number;
  
  // Holidays
  holidays: string[]; // Array of dates marked as holidays
  
  // Weekly Report
  weeklyReportNarrative?: string;
  weeklyReportSubmittedAt?: string;
  weeklyReportApprovedAt?: string;
  weeklyReportApprovedBy?: string;
  weeklyReportComments?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WEEKLY REPORT SUMMARY
// ============================================
export interface WeeklyReportSummary {
  planId: string;
  plannedVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  rescheduledVisits: number;
  totalHoursSpent: number;
  evidenceCollected: number;
  casesOpened: number;
  casesUpdated: number;
  findingsSummary: string;
  inspectorNarrative: string;
  generatedAt: string;
}

// ============================================
// GPS LOCATION
// ============================================
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

// ============================================
// REQUESTS
// ============================================
export interface CreateWeeklyPlanRequest {
  inspectorId: string;
  weekStartDate: string;
  weekEndDate: string;
  visits: Omit<PlannedVisit, 'id' | 'planId' | 'executionStatus' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateVisitExecutionRequest {
  visitId: string;
  checkInTime?: string;
  checkInGPS?: GPSLocation;
  checkOutTime?: string;
  checkOutGPS?: GPSLocation;
  visitNotes?: string;
  findings?: string;
  executionStatus: VisitExecutionStatus;
}

export interface SubmitWeeklyReportRequest {
  planId: string;
  narrative: string;
}

export interface ReviewPlanRequest {
  planId: string;
  approved: boolean;
  comments: string;
  reviewerRole: 'SENIOR_INSPECTOR' | 'MANAGER';
}
