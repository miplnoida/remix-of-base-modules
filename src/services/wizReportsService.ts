import { supabase } from "@/integrations/supabase/client";

const WIZ_API_URL = 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api';
const WIZ_ADMIN_API_KEY = import.meta.env.VITE_WIZ_ADMIN_API_KEY || "uiop906754drd35fvg";

async function callWizApi<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  // Get current session for Authorization header
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-admin-api-key": WIZ_ADMIN_API_KEY,
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(WIZ_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (!res.ok || json.status === "error") {
    throw new Error(json.error || `API error: ${res.status}`);
  }
  return json;
}

// ─── Types ─────────────────────────────────────────────

export interface EmployerReportRow {
  id: number;
  registration_number: string;
  registration_date: string;
  contact_person: string;
  company_name: string;
  mobile: string | null;
  email: string;
}

export interface SelfEmployedReportRow {
  id: number;
  social_security_number: string;
  created_at: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
}

export interface PaymentReportRow {
  header_id: number;
  user_id: number;
  reg_no: string;
  period_month: string;
  period_year: string;
  total_wages: number;
  total_ss_contributions: number;
  total_levy: number;
  total_fines_penalties: number;
  total_severance: number;
  is_submitted: boolean;
  is_finalized: boolean;
  schedule_no: number | null;
  creation_date: string;
  pay_details: {
    transaction_id: string;
    transaction_date: string;
    transaction_status: string;
    payment_amount: number;
  }[];
}

export interface ReconciliationReportRow {
  id: number;
  payment_transaction_id: string;
  transaction_date: string;
  payment_amount: number;
  payment_status: string;
  reconciled_by_name: string;
  reconciled_by_date: string | null;
  notes: string | null;
}

export interface CompanyUserReportRow {
  user_id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  username: string;
  email: string;
  role_id: number;
  role_name: string;
  company_id: number;
  company_name: string;
  registration_number: string;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface SelfEmployedUserReportRow {
  user_id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  username: string;
  email: string;
  role_id: number;
  role_name: string;
  self_employed_id: number;
  ssn: string;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface UserRole {
  id: number;
  role_name: string;
  role_code: string;
  role_category: string;
}

// ─── Report 1: Employer History ────────────────────────

export async function getEmployerReport(params: {
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_col?: string;
  sort_dir?: 'asc' | 'desc';
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{ data: { employers: EmployerReportRow[] }; total_records: number; page_offset: number; page_limit: number }>(
    'get_employer_report', params
  );
}

export async function getEmployerReportDropdown() {
  return callWizApi<{ data: { companies: { id: number; company_name: string; registration_number: string }[] } }>(
    'get_employer_report_dropdown', {}
  );
}

export async function exportEmployerReport(search?: string) {
  return callWizApi<{ data: { employers: EmployerReportRow[] } }>(
    'export_employer_report', { search }
  );
}

// ─── Report 2: Self Employed History ───────────────────

export async function getSelfEmployedReport(params: {
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_col?: string;
  sort_dir?: 'asc' | 'desc';
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{ data: { self_employed: SelfEmployedReportRow[] }; total_records: number }>(
    'get_self_employed_report', params
  );
}

export async function getSelfEmployedReportDropdown() {
  return callWizApi<{ data: { self_employed: { id: number; first_name: string; social_security_number: string }[] } }>(
    'get_self_employed_report_dropdown', {}
  );
}

export async function exportSelfEmployedReport(search?: string) {
  return callWizApi<{ data: { self_employed: SelfEmployedReportRow[] } }>(
    'export_self_employed_report', { search }
  );
}

// ─── Report 3: Payments History ────────────────────────

export async function getPaymentReport(params: {
  payment_status?: string;
  from_date?: string;
  to_date?: string;
  company_id?: number | null;
  user_id?: number | null;
  types?: string;
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{ data: { records: PaymentReportRow[]; total_records: number } }>(
    'get_payment_report', params
  );
}

export async function exportPaymentReport(params: {
  payment_status?: string;
  types?: string;
  company_id?: number | null;
  user_id?: number | null;
}) {
  return callWizApi<{ data: { records: PaymentReportRow[] } }>(
    'export_payment_report', params
  );
}

// ─── Report 4: Reconciliation History ──────────────────

export async function getReconciliationReport(params: {
  status?: string | null;
  card_holder_name?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{ data: { records: ReconciliationReportRow[]; total_records: number } }>(
    'get_reconciliation_report', params
  );
}

export async function getReconciliationCardHolders() {
  return callWizApi<{ data: { card_holders: { card_holder_name: string }[] } }>(
    'get_reconciliation_card_holders', {}
  );
}

export async function exportReconciliationReport(params: {
  status?: string | null;
  card_holder_name?: string | null;
}) {
  return callWizApi<{ data: { records: ReconciliationReportRow[] } }>(
    'export_reconciliation_report', params
  );
}

// ─── Report 5: Users History ───────────────────────────

export async function getCompanyUsersReport(params: {
  search?: string;
  company_id?: number | null;
  role_id?: number | null;
  sort_column?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}) {
  return callWizApi<{ data: CompanyUserReportRow[]; pagination: { page: number; page_size: number; total_records: number; total_pages: number } }>(
    'get_company_users_report', params
  );
}

export async function getSelfEmployedUsersReport(params: {
  search?: string;
  role_id?: number | null;
  sort_column?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}) {
  return callWizApi<{ data: SelfEmployedUserReportRow[]; pagination: { page: number; page_size: number; total_records: number; total_pages: number } }>(
    'get_self_employed_users_report', params
  );
}

export async function getUsersReportRoles(category?: string | null) {
  return callWizApi<{ data: UserRole[] }>(
    'get_users_report_roles', { category }
  );
}

export async function exportUsersReport(params: {
  category: string;
  search?: string;
  company_id?: number | null;
  role_id?: number | null;
}) {
  return callWizApi<{ data: any[] }>(
    'export_users_report', params
  );
}
