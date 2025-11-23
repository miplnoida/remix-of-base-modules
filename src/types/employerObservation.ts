// ============================================
// EMPLOYER OBSERVATION & NOTES TYPES
// ============================================

export interface EmployerObservation {
  id: string;
  employerId: string;
  inspectionVisitId?: string;
  authorUserId: string;
  authorName: string;
  noteText: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateObservationRequest {
  employerId: string;
  inspectionVisitId?: string;
  noteText: string;
}
