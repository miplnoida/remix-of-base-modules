/**
 * C3 Details API service
 * Calls the wiz-admin-api edge function for C3 contribution detail screens.
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

// ─── Types ────────────────────────────────────────────

export interface C3ContributionRecord {
  header_id: number;
  month: string;
  month_number: number;
  year: string;
  wages: number;
  social_security: number;
  levy: number;
  fines_and_penalties: number;
  severance: number;
  total: number;
  creation_date: string;
  schedule: number;
  is_nil: boolean;
  notes: string;
  is_submitted: boolean;
  is_finalized: boolean;
  is_imported_from_bema: boolean;
  payment_status: string;
  payment_id: number | null;
}

export interface NwdContributionRecord {
  header_id: number;
  month: string;
  month_number: number;
  year: string;
  wages: number;
  levy: number;
  fines_and_penalties: number;
  total: number;
  creation_date: string;
  schedule: number;
  is_nil: boolean;
  notes: string;
  is_submitted: boolean;
  is_finalized: boolean;
  is_imported_from_bema: boolean;
  payment_status: string;
  payment_id: number | null;
}

export interface SeContributionRecord {
  contribution_id: number;
  month: string;
  month_number: number;
  year: string;
  wages: number;
  fine: number;
  total: number;
  creation_date: string;
  notes: string;
  is_submitted: boolean;
  is_finalized: boolean;
  is_imported_from_bema: boolean;
  is_paid: boolean;
  payment_status: string;
  payment_id: number | null;
}

export interface SelfEmployedDropdownItem {
  id: number;
  social_security_number: string;
  name: string;
  display: string;
}

// ─── API Functions ────────────────────────────────────

export async function getContributionList(params: {
  company_id: number;
  period_from?: string;
  period_to?: string;
}) {
  return callWizApi<{ contributions: C3ContributionRecord[]; total_records: number }>(
    'get_contribution_list', params
  );
}

export async function getNwdContributionList(params: {
  company_id: number;
  period_from?: string;
  period_to?: string;
}) {
  return callWizApi<{ contributions: NwdContributionRecord[]; total_records: number }>(
    'get_nwd_contribution_list', params
  );
}

export async function getSeContributionList(params: {
  self_employed_id: number;
  period_from?: string;
  period_to?: string;
}) {
  return callWizApi<{ contributions: SeContributionRecord[]; total_records: number }>(
    'get_se_contribution_list', params
  );
}

export async function getSelfEmployedDropdown() {
  return callWizApi<{ self_employed: SelfEmployedDropdownItem[] }>(
    'get_self_employed_dropdown', {}
  );
}

export async function deleteContribution(headerId: number, type: 'employer' | 'nwd' | 'self_employed') {
  return callWizApi('delete_contribution', { header_id: headerId, type });
}

// ─── Preview APIs ─────────────────────────────────────
// These call the existing c3-preview or equivalent actions

export async function getContributionPreview(headerId: number, companyId: number) {
  return callWizApi<any>('get_contribution_preview', { header_id: headerId, company_id: companyId });
}

export async function getNwdContributionPreview(headerId: number, companyId: number) {
  return callWizApi<any>('get_nwd_contribution_preview', { header_id: headerId, company_id: companyId });
}

export async function getSeContributionPreview(contributionId: number) {
  return callWizApi<any>('get_se_contribution_preview', { contribution_id: contributionId });
}

// ─── Offline Payment APIs ─────────────────────────────

export interface OfflinePaymentPageData {
  c3_details: {
    period: string;
    period_month: string;
    period_year: string;
    creation_date: string;
    schedule: number;
    is_nil_return: boolean;
    wages: number;
    ss_contributions: number;
    lv_contributions: number;
    pe_contributions: number;
    ss_penalty: number;
    lv_penalty: number;
    pe_penalty: number;
    total: number;
    company_id: number;
    company_name: string;
    registration_number: string;
    trade_name: string;
    address: string;
  };
  existing_payment: {
    payment_id: number;
    receipt_number: string;
    batch_number: string;
    payment_date: string;
    payment_mode: string;
    ss_amount: number;
    lv_amount: number;
    pe_amount: number;
    total: number;
    payment_status: string;
    bima_receipt_number: string;
  } | null;
  is_paid: boolean;
}

export interface BimaPayment {
  receipt_number: string;
  batch_number: string;
  payment_date: string;
  payment_mode: string;
  ss_amount: number;
  lv_amount: number;
  pe_amount: number;
  total: number;
  is_applied: boolean;
  validation_warnings: string[];
  applied_to_header_id?: number | null;
}

export interface BimaSearchResult {
  payments: BimaPayment[];
  multiple: boolean;
  period: string;
}

export interface OfflinePaymentReceipt {
  receipt_number: string;
  reg_no: string;
  customer_name: string;
  period: string;
  batch_number: string;
  payment_date: string;
  payment_mode: string;
  status: string;
  ss_contributions: number;
  lv_contribution: number;
  pe_contributions: number;
  amount: number;
}

export async function getOfflinePaymentPage(params: {
  header_id: number;
  entity_type: 'employer' | 'nwd' | 'self_employed';
}) {
  return callWizApi<OfflinePaymentPageData>('get_offline_payment_page', params);
}

export async function searchBimaReceipt(params: {
  receipt_number: string;
  header_id: number;
  entity_type: 'employer' | 'nwd' | 'self_employed';
}) {
  return callWizApi<BimaSearchResult>('search_bima_receipt', params);
}

export async function applyOfflinePayment(params: {
  header_id: number;
  entity_type: 'employer' | 'nwd' | 'self_employed';
  receipt_number: string;
  batch_number: string;
  payment_date: string;
  payment_mode: string;
  ss_amount: number;
  lv_amount: number;
  pe_amount: number;
  total_amount: number;
  admin_user_id: number;
  notes?: string;
}) {
  return callWizApi<{ payment_id: number; receipt_number: string; message: string; receipt: OfflinePaymentReceipt }>(
    'apply_offline_payment', params
  );
}

export async function getPeriodPaymentList(params: {
  header_id: number;
  entity_type: 'employer' | 'nwd' | 'self_employed';
  registration_number?: string;
  period_month?: string;
  period_year?: string;
}) {
  return callWizApi<{ payments: BimaPayment[]; period: string }>(
    'get_period_payment_list', params
  );
}

export async function getExistingPaymentReceipt(params: {
  header_id: number;
  entity_type: 'employer' | 'nwd' | 'self_employed';
}) {
  return callWizApi<{ receipt: OfflinePaymentReceipt }>(
    'get_existing_payment_receipt', params
  );
}
