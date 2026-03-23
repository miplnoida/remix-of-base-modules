/**
 * Manage Users API service for C3 Management
 * Calls the wiz-admin-api edge function for user/role management actions.
 */

const WIZ_API_URL = 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api';
const WIZ_ADMIN_API_KEY = import.meta.env.VITE_WIZ_ADMIN_API_KEY || "uiop906754drd35fvg";

interface WizApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  error?: string;
}

async function callWizApi<T = any>(action: string, params: Record<string, any> = {}): Promise<WizApiResponse<T>> {
  const res = await fetch(WIZ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": WIZ_ADMIN_API_KEY,
    },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (!res.ok || json.status === "error") {
    throw new Error(json.error || `API error: ${res.status}`);
  }
  return json;
}

// ─── Types ─────────────────────────────────────────────

export interface CompanyDropdownItem {
  id: number;
  company_name: string;
  registration_number: string;
  parent_company_id: number | null;
}

export interface CompanyUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_id: number;
  role_label: string;
  company_id: number;
  created_at: string;
  is_active: boolean;
  is_locked: boolean;
  auth_user_id: string | null;
}

export interface SEUser {
  employee_id: number;
  user_id: number | null;
  full_name: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  inserted_on: string | null;
  is_active: boolean;
}

export interface WizRole {
  role_id: number;
  role_name: string;
  description: string | null;
  role_category: string;
}

export interface ModulePermission {
  module_id: number;
  module_name: string;
  module_code: string | null;
  parent_id: number | null;
  is_parent: boolean;
  view_permission: boolean;
  add_permission: boolean;
  update_permission: boolean;
  delete_permission: boolean;
  is_preview: boolean;
  is_print: boolean;
  is_submitted: boolean;
  is_pay: boolean;
}

export interface UserForEdit {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_id: number;
  company_id: number;
}

// ─── Company Dropdown ──────────────────────────────────

export async function getCompanyDropdown() {
  return callWizApi<{ companies: CompanyDropdownItem[] }>("get_company_dropdown");
}

// ─── Company Users ─────────────────────────────────────

export async function getCompanyUsers(companyId: number) {
  return callWizApi<{ users: CompanyUser[] }>("get_company_users", { company_id: companyId });
}

// ─── Self-Employed Users ───────────────────────────────

export async function getSEUsers() {
  return callWizApi<{ users: SEUser[] }>("get_se_users");
}

// ─── Toggle User Status ───────────────────────────────

export async function toggleUserStatus(userId: number) {
  return callWizApi<{ success: boolean; message: string; is_active: boolean }>(
    "toggle_user_status", { user_id: userId }
  );
}

// ─── Reset Password ───────────────────────────────────

export async function resetUserPassword(userId: number) {
  return callWizApi<{ success: boolean; message: string }>(
    "reset_user_password", { user_id: userId }
  );
}

// ─── Change Password ──────────────────────────────────

export async function changeUserPassword(userId: number, newPassword: string, confirmPassword: string) {
  return callWizApi<{ success: boolean; message: string }>(
    "change_user_password", { user_id: userId, new_password: newPassword, confirm_password: confirmPassword }
  );
}

// ─── Get User For Edit ────────────────────────────────

export async function getUserForEdit(userId: number) {
  return callWizApi<{ user: UserForEdit }>("get_user_for_edit", { user_id: userId });
}

// ─── Save Company User ────────────────────────────────

export async function saveCompanyUser(params: {
  company_id: number;
  first_name: string;
  last_name: string;
  login_id: string;
  email: string;
  role_id: number;
}) {
  return callWizApi<{ success: boolean; message: string }>("save_company_user", params);
}

// ─── Update Company User ──────────────────────────────

export async function updateCompanyUser(params: {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id?: number;
  company_id?: number;
}) {
  return callWizApi<{ success: boolean; message: string }>("update_company_user", params);
}

// ─── Roles ─────────────────────────────────────────────

export async function getRolesByCategory() {
  return callWizApi<{ roles: WizRole[] }>("get_roles_by_category");
}

export async function getRoleById(roleId: number) {
  return callWizApi<{ role: WizRole }>("get_role_by_id", { role_id: roleId });
}

export async function saveRole(params: { role_name: string; description: string; role_category: string }) {
  return callWizApi<{ success: boolean; message: string }>("save_role", params);
}

export async function updateRole(params: { role_id: number; role_name: string; description: string }) {
  return callWizApi<{ success: boolean; message: string }>("update_role", params);
}

export async function deleteRole(roleId: number) {
  return callWizApi<{ success: boolean; message: string }>("delete_role", { role_id: roleId });
}

// ─── Role Permissions ──────────────────────────────────

export async function getRolePermissions(roleId: number) {
  return callWizApi<{ permissions: ModulePermission[] }>("get_role_permissions", { role_id: roleId });
}

export async function saveRolePermissions(permissions: ModulePermission[]) {
  return callWizApi<{ success: boolean; message: string }>("save_role_permissions", { permissions });
}
