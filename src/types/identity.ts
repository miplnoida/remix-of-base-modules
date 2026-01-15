// Microsoft Identity Compatible Types

export interface AspNetUser {
  Id: string;
  UserName: string | null;
  NormalizedUserName: string | null;
  Email: string | null;
  NormalizedEmail: string | null;
  EmailConfirmed: boolean;
  PasswordHash: string | null;
  SecurityStamp: string | null;
  ConcurrencyStamp: string | null;
  PhoneNumber: string | null;
  PhoneNumberConfirmed: boolean;
  TwoFactorEnabled: boolean;
  LockoutEnd: string | null;
  LockoutEnabled: boolean;
  AccessFailedCount: number;
  // Extended fields
  user_code: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  title: string | null;
  gender: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  force_password_change: boolean;
  mfa_method: string | null;
  department_id: string | null;
  designation_id: string | null;
  office_id: string | null;
  employee_code: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  last_login: string | null;
  last_password_change: string | null;
}

export interface AspNetRole {
  Id: string;
  Name: string;
  NormalizedName: string;
  ConcurrencyStamp: string | null;
  description: string | null;
  is_privileged: boolean;
  require_mfa: boolean;
  session_timeout_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AspNetUserRole {
  UserId: string;
  RoleId: string;
  assigned_at: string;
  assigned_by: string | null;
  expires_at: string | null;
}

export interface AspNetUserClaim {
  Id: number;
  UserId: string;
  ClaimType: string | null;
  ClaimValue: string | null;
  created_at: string;
}

export interface AspNetRoleClaim {
  Id: number;
  RoleId: string;
  ClaimType: string | null;
  ClaimValue: string | null;
  created_at: string;
}

export interface AspNetUserLogin {
  LoginProvider: string;
  ProviderKey: string;
  ProviderDisplayName: string | null;
  UserId: string;
  created_at: string;
}

export interface AspNetUserToken {
  UserId: string;
  LoginProvider: string;
  Name: string;
  Value: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface UserIdentityMap {
  id: string;
  legacy_user_id: string;
  identity_user_id: string;
  generated_user_code: string;
  supabase_auth_id: string | null;
  migration_date: string;
  migration_notes: string | null;
}

// Identity context types
export interface IdentityUser {
  id: string;
  user_code: string;
  email: string;
  userName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  emailConfirmed: boolean;
  twoFactorEnabled: boolean;
  forcePasswordChange: boolean;
  mfaMethod: string | null;
  departmentId: string | null;
  designationId: string | null;
  officeId: string | null;
  employeeCode: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export interface IdentityRole {
  id: string;
  name: string;
  description: string | null;
  isPrivileged: boolean;
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
}

export interface UserWithRoles extends IdentityUser {
  roles: IdentityRole[];
}

// Form types for user management
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  title?: string;
  phoneNumber?: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  employeeCode?: string;
  roleIds: string[];
  forcePasswordChange?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  phoneNumber?: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  employeeCode?: string;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  forcePasswordChange?: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

export interface RemoveRoleRequest {
  userId: string;
  roleId: string;
}
