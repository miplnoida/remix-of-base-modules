import { supabase } from "@/integrations/supabase/client";

const WIZ_ADMIN_API_KEY = "uiop906754drd35fvg";

interface WizApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  error?: string;
  total_records?: number;
  page_offset?: number;
  page_limit?: number;
}

async function callWizApi<T = any>(action: string, params: Record<string, any> = {}): Promise<WizApiResponse<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/wiz-admin-api`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
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

// ─── Employer ──────────────────────────────────────────
export interface WizEmployer {
  id: number;
  registration_number: string;
  registration_date: string;
  company_name: string;
  trade_name: string | null;
  contact_person: string;
  mobile: string | null;
  phone: string | null;
  email: string;
  parent_company_id: number | null;
  is_deleted: boolean;
  user_count: number;
  employee_count: number;
}

export interface WizEmployerDetails {
  company: Record<string, any>;
  primary_user: { id: number; first_name: string; last_name: string; username: string; email: string } | null;
  security_questions: { question: string; answer_hash: string; question_number: number }[];
  parent_company_id: number;
}

export async function getEmployerList(params: {
  search?: string;
  sort_col?: string;
  sort_dir?: "asc" | "desc";
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{ employers: WizEmployer[] }>("get_employer_list", params);
}

export async function getEmployerDetails(companyId: number) {
  return callWizApi<WizEmployerDetails>("get_employer_details", { company_id: companyId });
}

export async function updateEmployer(params: {
  company_id: number;
  company_data: Record<string, any>;
  user_data?: Record<string, any>;
  security_questions?: Record<string, string>;
}) {
  return callWizApi("update_employer", params);
}

export async function updateCompanyMapping(parentId: number, childIds: number[]) {
  return callWizApi("update_company_mapping", { parent_id: parentId, child_ids: childIds });
}

// ─── Users ─────────────────────────────────────────────
export interface WizUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_id: number;
  company_id: number;
  is_locked: boolean;
  created_at: string;
  auth_user_id: string | null;
}

export async function getCompanyUsers(companyId: number) {
  return callWizApi<{ users: WizUser[] }>("get_company_users", { company_id: companyId });
}

export async function getUserDetails(userId: number) {
  return callWizApi<{ user: WizUser }>("get_user_details", { user_id: userId });
}

export async function updateUser(userId: number, userData: Record<string, any>) {
  return callWizApi("update_user", { user_id: userId, user_data: userData });
}

export async function toggleUserStatus(userId: number) {
  return callWizApi<{ is_locked: boolean; message: string }>("toggle_user_status", { user_id: userId });
}

export async function changePassword(userId: number, newPassword: string, confirmPassword: string) {
  return callWizApi("change_password", { user_id: userId, new_password: newPassword, confirm_password: confirmPassword });
}

export async function resetPassword(userId: number) {
  return callWizApi("reset_password", { user_id: userId });
}

// ─── Employees ─────────────────────────────────────────
export interface WizEmployee {
  id: number;
  social_security_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string;
  date_of_birth: string | null;
  marital_status: string | null;
  department: string | null;
  pay_period: string;
  hire_date: string | null;
  termination_date: string | null;
  is_director: boolean;
  is_levy_exempt: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  salary: number;
  wages: number;
}

export async function getEmployeeList(companyId: number) {
  return callWizApi<{ employees: WizEmployee[]; company: { company_name: string; registration_number: string } }>(
    "get_employee_list",
    { company_id: companyId }
  );
}

export async function getEmployeeDetails(companyId: number, employeeId: number) {
  return callWizApi<{ employee: WizEmployee }>("get_employee_details", { company_id: companyId, employee_id: employeeId });
}

export async function updateEmployee(companyId: number, employeeId: number, employeeData: Record<string, any>) {
  return callWizApi("update_employee", { company_id: companyId, employee_id: employeeId, employee_data: employeeData });
}

export async function deleteEmployee(companyId: number, employeeId: number) {
  return callWizApi("delete_employee", { company_id: companyId, employee_id: employeeId });
}

// ─── Utility ───────────────────────────────────────────
export interface WizCompanyDropdown {
  id: number;
  company_name: string;
  registration_number: string;
}

export async function getCompaniesDropdown() {
  return callWizApi<{ companies: WizCompanyDropdown[] }>("get_companies_dropdown");
}
