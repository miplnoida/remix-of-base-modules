/**
 * Legal Matter Workspace — unified DTO consumed by Legal screens.
 *
 * Phase 1 (read-only): produced by `legalMatterWorkspaceService` from
 * existing tables (legal_referral, lg_case_intake, lg_case, la_advice_request
 * and friends). No schema changes.
 */

export type LegalMatterLifecycleObjectType =
  | "REFERRAL"
  | "INTAKE"
  | "CASE"
  | "ADVICE_REQUEST";

export type LegalMatterCategory =
  | "ENFORCEMENT"
  | "BENEFITS"
  | "COMPLIANCE"
  | "ADVISORY"
  | "CONTRACT"
  | "INTERNAL";

export type LegalMatterSourceModule =
  | "BENEFITS"
  | "COMPLIANCE"
  | "LEGAL"
  | "INTERNAL"
  | string;

export type LegalMatterOverallStatus =
  | "NEW"
  | "WAITING_ON_SOURCE"
  | "WAITING_ON_LEGAL"
  | "IN_PROGRESS"
  | "ACCEPTED"
  | "CASE_OPEN"
  | "CLOSED"
  | "REJECTED";

export type LegalMatterSlaStatus =
  | "ON_TIME"
  | "AT_RISK"
  | "OVERDUE"
  | "ESCALATED"
  | null;

export interface LegalMatterWorkspaceIdentity {
  matter_id: string;
  matter_no: string;
  lifecycle_object_type: LegalMatterLifecycleObjectType;
  referral_id: string | null;
  intake_id: string | null;
  legal_case_id: string | null;
  legal_advice_request_id: string | null;
}

export interface LegalMatterWorkspaceClassification {
  matter_type_code: string | null;
  matter_type_name: string | null;
  case_type_code: string | null;
  case_type_name: string | null;
  category: LegalMatterCategory;
}

export interface LegalMatterWorkspaceSource {
  source_module: LegalMatterSourceModule;
  source_record_type: string | null;
  source_record_id: string | null;
  source_reference_no: string | null;
  submitted_by: string | null;
  submitted_department: string | null;
  submitted_at: string | null;
}

export interface LegalMatterWorkspaceParty {
  primary_entity_type: string | null;
  primary_entity_id: string | null;
  primary_display_name: string | null;
  employer_id: string | null;
  employer_no: string | null;
  employer_name: string | null;
  insured_person_id: string | null;
  insured_person_name: string | null;
  claim_id: string | null;
  claim_no: string | null;
}

export interface LegalMatterWorkspaceStatus {
  referral_status: string | null;
  intake_status: string | null;
  case_status: string | null;
  current_stage_code: string | null;
  current_stage_name: string | null;
  overall_status: LegalMatterOverallStatus;
}

export interface LegalMatterWorkspaceAssignment {
  workbasket_code: string | null;
  workbasket_name: string | null;
  team_code: string | null;
  team_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_user_code: string | null;
  assigned_at: string | null;
  reassignment_count: number;
}

export interface LegalMatterWorkspaceSla {
  due_date: string | null;
  sla_status: LegalMatterSlaStatus;
  overdue_days: number | null;
  escalation_status: string | null;
}

export interface LegalMatterWorkspaceCounts {
  document_count: number;
  letter_count: number;
  pending_info_request_count: number;
  open_task_count: number;
  open_action_count: number;
  unread_activity_count: number;
}

export interface LegalMatterWorkspaceLatest {
  last_activity_at: string | null;
  last_activity_type: string | null;
  last_activity_by: string | null;
  latest_document_at: string | null;
  latest_letter_at: string | null;
}

export interface LegalMatterWorkspaceNavigation {
  open_url: string;
  source_url: string | null;
  case_url: string | null;
  intake_url: string | null;
  referral_url: string | null;
}

export interface LegalMatterWorkspacePermissions {
  can_view: boolean;
  can_request_info: boolean;
  can_accept: boolean;
  can_reject: boolean;
  can_create_case: boolean;
  can_reassign: boolean;
  can_generate_letter: boolean;
  can_upload_document: boolean;
}

export interface LegalMatterWorkspace {
  identity: LegalMatterWorkspaceIdentity;
  classification: LegalMatterWorkspaceClassification;
  source: LegalMatterWorkspaceSource;
  party: LegalMatterWorkspaceParty;
  status: LegalMatterWorkspaceStatus;
  assignment: LegalMatterWorkspaceAssignment;
  sla: LegalMatterWorkspaceSla;
  counts: LegalMatterWorkspaceCounts;
  latest: LegalMatterWorkspaceLatest;
  navigation: LegalMatterWorkspaceNavigation;
  permissions: LegalMatterWorkspacePermissions;
}

export interface LegalMatterWorkspaceFilters {
  lifecycle?: LegalMatterLifecycleObjectType[];
  source_module?: LegalMatterSourceModule[];
  category?: LegalMatterCategory[];
  overall_status?: LegalMatterOverallStatus[];
  workbasket_code?: string;
  team_code?: string;
  owner_user_id?: string;
  search?: string;
  limit?: number;
}

export interface LegalMatterWorkspaceUserContext {
  userId: string | null;
  userCode: string | null;
  teamCodes: string[];
  workbasketCodes: string[];
}

/** Standard fallbacks used by UI to keep grids non-empty. */
export const LMW_FALLBACK = {
  notLinked: "Not linked",
  pendingAssignment: "Pending assignment",
  notApplicable: "Not applicable",
  noActivity: "No activity yet",
  unknownParty: "Unknown party",
} as const;
