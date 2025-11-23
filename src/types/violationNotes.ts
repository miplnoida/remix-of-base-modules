export enum NoteType {
  INSPECTOR_COMMENT = 'InspectorComment',
  MANAGER_COMMENT = 'ManagerComment',
  SYSTEM = 'System',
  FIELD_NOTE = 'FieldNote',
  FOLLOW_UP = 'FollowUp'
}

export interface ViolationNote {
  id: string;
  violationId: string;
  authorUserId: string;
  authorName: string;
  noteType: NoteType;
  noteText: string;
  createdAt: string;
  linkedWeeklyPlanItemId?: string;
}

export interface CreateViolationNoteRequest {
  violationId: string;
  noteType: NoteType;
  noteText: string;
  linkedWeeklyPlanItemId?: string;
}
