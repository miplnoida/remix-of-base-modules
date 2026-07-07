/**
 * Epic 6 — Enterprise Identity types.
 * Extends the standard user profile with staff, assignment, security, and
 * delegation records without altering existing profiles/user_roles tables.
 */

export type EmploymentStatus =
  | 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED'
  | 'TERMINATED' | 'RETIRED' | 'CONTRACT_ENDED';

export type StaffType =
  | 'PERMANENT' | 'CONTRACT' | 'TEMPORARY'
  | 'CONSULTANT' | 'SYSTEM' | 'EXTERNAL';

export type AssignmentType =
  | 'PRIMARY' | 'SECONDARY' | 'ACTING'
  | 'TEMPORARY' | 'DELEGATED' | 'PROJECT';

export type AssignmentStatus =
  | 'ACTIVE' | 'PENDING' | 'ENDED' | 'SUSPENDED' | 'CANCELLED';

export type AccountStatus =
  | 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'DISABLED'
  | 'PENDING_ACTIVATION' | 'PASSWORD_RESET_REQUIRED';

export type DelegationType =
  | 'GENERAL' | 'APPROVAL' | 'WORKFLOW'
  | 'MODULE' | 'PERMISSION' | 'TEMPORARY';

export type DelegationApprovalStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED'
  | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'ACTIVE','INACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','RETIRED','CONTRACT_ENDED',
];
export const STAFF_TYPES: StaffType[] = [
  'PERMANENT','CONTRACT','TEMPORARY','CONSULTANT','SYSTEM','EXTERNAL',
];
export const ASSIGNMENT_TYPES: AssignmentType[] = [
  'PRIMARY','SECONDARY','ACTING','TEMPORARY','DELEGATED','PROJECT',
];
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'ACTIVE','PENDING','ENDED','SUSPENDED','CANCELLED',
];
export const ACCOUNT_STATUSES: AccountStatus[] = [
  'ACTIVE','LOCKED','SUSPENDED','DISABLED','PENDING_ACTIVATION','PASSWORD_RESET_REQUIRED',
];
export const DELEGATION_TYPES: DelegationType[] = [
  'GENERAL','APPROVAL','WORKFLOW','MODULE','PERMISSION','TEMPORARY',
];
export const DELEGATION_APPROVAL_STATUSES: DelegationApprovalStatus[] = [
  'DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','REVOKED','EXPIRED',
];

export interface CoreUserProfile {
  user_id: string;
  profile_id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  employee_code: string | null;
  office_code: string | null;
  department_id: string | null;
  designation_id: string | null;
  is_active: boolean | null;
  force_password_change: boolean | null;
  last_login: string | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  lockout_exempt: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  user_id: string;
  profile_id: string | null;
  employee_code: string | null;
  staff_number: string | null;
  legacy_employee_code: string | null;
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  display_name: string | null;
  work_email: string | null;
  work_phone: string | null;
  employment_status: EmploymentStatus;
  staff_type: StaffType;
  hire_date: string | null;
  termination_date: string | null;
  supervisor_user_id: string | null;
  manager_user_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffAssignment {
  id: string;
  staff_profile_id: string;
  user_id: string;
  office_code: string | null;
  department_id: string | null;
  designation_id: string | null;
  assignment_type: AssignmentType;
  assignment_status: AssignmentStatus;
  effective_from: string;
  effective_to: string | null;
  is_primary: boolean;
  is_acting: boolean;
  reason: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSecurityState {
  id: string;
  user_id: string;
  account_status: AccountStatus;
  is_locked: boolean;
  locked_at: string | null;
  locked_until: string | null;
  locked_reason: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  is_disabled: boolean;
  disabled_at: string | null;
  disabled_reason: string | null;
  failed_login_count: number;
  last_failed_login_at: string | null;
  last_login_at: string | null;
  mfa_required: boolean;
  mfa_enabled: boolean;
  password_reset_required: boolean;
  password_reset_reason: string | null;
  security_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDelegation {
  id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  delegation_type: DelegationType;
  scope_module_code: string | null;
  scope_permission_key: string | null;
  effective_from: string;
  effective_to: string;
  approval_status: DelegationApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  reason: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StaffProfileFormValues = Partial<Omit<StaffProfile,
  'id' | 'created_at' | 'updated_at'>> & { user_id: string };

export type StaffAssignmentFormValues = Partial<Omit<StaffAssignment,
  'id' | 'created_at' | 'updated_at'>> & {
  staff_profile_id: string;
  user_id: string;
};

export type UserSecurityStateFormValues = Partial<Omit<UserSecurityState,
  'id' | 'created_at' | 'updated_at' | 'user_id'>>;

export type UserDelegationFormValues = Partial<Omit<UserDelegation,
  'id' | 'created_at' | 'updated_at'>> & {
  delegator_user_id: string;
  delegate_user_id: string;
  effective_to: string;
};

export interface IdentityFilters {
  search?: string;
  office_code?: string;
  department_id?: string;
  account_status?: AccountStatus;
  employment_status?: EmploymentStatus;
  is_active?: boolean;
}

export interface UserProfileUpdatePayload {
  title?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  employee_code?: string | null;
  office_code?: string | null;
  department_id?: string | null;
  designation_id?: string | null;
  is_active?: boolean;
}
