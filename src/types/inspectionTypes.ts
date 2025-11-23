// ============================================
// INSPECTION VISIT & EVIDENCE TYPES
// ============================================

export enum InspectionVisitStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  RESCHEDULED = 'RESCHEDULED',
  NOT_DONE = 'NOT_DONE'
}

export enum EvidenceType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SIGNATURE = 'SIGNATURE'
}

export enum FindingType {
  COMPLIANT = 'COMPLIANT',
  MINOR_ISSUE = 'MINOR_ISSUE',
  POSSIBLE_VIOLATION = 'POSSIBLE_VIOLATION',
  CONFIRMED_VIOLATION = 'CONFIRMED_VIOLATION'
}

export interface InspectionVisit {
  id: string;
  weeklyPlanItemId: string;
  employerId?: string;
  employerName?: string;
  visitDate: string;
  checkInTime?: string;
  checkInGPSLat?: number;
  checkInGPSLng?: number;
  checkOutTime?: string;
  checkOutGPSLat?: number;
  checkOutGPSLng?: number;
  status: InspectionVisitStatus;
  visitNotes?: string;
  inspectorId: string;
  inspectorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionEvidence {
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

export interface InspectionFinding {
  id: string;
  visitId: string;
  findingType: FindingType;
  category: string;
  description: string;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  evidenceIds: string[];
  isViolationCreated: boolean;
  violationId?: string;
  inspectorNotes?: string;
  createdAt: string;
  createdBy: string;
}

export interface WeeklyPlanItem {
  id: string;
  planId: string;
  itemType: 'EMPLOYER_VISIT' | 'SCOUTING';
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  visitDate: string;
  employerId?: string;
  employerName?: string;
  areaName?: string;
  territory: 'St Kitts' | 'Nevis';
  visitType: string;
  duration: string;
  purpose: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  status: InspectionVisitStatus;
  rescheduleReason?: string;
  rescheduledTo?: string;
  notDoneReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportSummary {
  weekStartDate: string;
  weekEndDate: string;
  inspectorId: string;
  inspectorName: string;
  totalPlannedVisits: number;
  completedVisits: number;
  rescheduledVisits: number;
  notDoneVisits: number;
  totalEvidence: number;
  totalFindings: number;
  totalViolations: number;
  submittedAt?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}
