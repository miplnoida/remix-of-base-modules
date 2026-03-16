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
  transaction_id?: string | null;
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
  transaction_id?: string | null;
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
  transaction_id?: string | null;
}

export interface SelfEmployedDropdownItem {
  id: number;
  social_security_number: string;
  name: string;
  display: string;
}

// ─── Offline Payment Types ────────────────────────────

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
  existing_payment: any | null;
  is_paid: boolean;
}

export interface BimaSearchResult {
  batch: {
    batchNumber: string;
    batchDate: string;
  };
  mopCode: string;
  totalAmount: number;
  payments: any[];
}

export interface TransactionReceiptData {
  refCustomerName: string;
  paymentGatewayTransactionID: string;
  paymentStatus: string;
  paymentAmount: number;
  createTime: string;
  receiptNumber: string;
  regNo: string;
  period: string;
  bankName: string | null;
  checkNum: string | null;
  checkDate: string | null;
  jvNumber: string | null;
  jvDate: string | null;
  transactionDate: string;
  bimaRefNum: string;
  mode: string;
  totalSscontributions: number | null;
  totalSspenalty: number | null;
  totalLevy: number | null;
  totalLevyeepenalty: number | null;
  totalServayance: number | null;
  totalPepenalty: number | null;
}

export interface SubmitPaymentResult {
  paymentStatus: string;
  mode: string;
  bimaRefNum: string;
  paymentGatewayTransactionID: string;
  needToPay: number;
  refCustomerName: string;
  transactionDate: string;
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

/**
 * Get offline payment page data (C3 details + existing payment if any).
 * Legacy: GET /Payment/GetOfflinePaymentData?HeaderId={headerID}
 */
export async function getOfflinePaymentData(params: {
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
}) {
  return callWizApi<OfflinePaymentPageData>('get_offline_payment_data', params);
}

/**
 * Auto-fetch BIMA payments for period (called on page load, NOT manual).
 * Returns all BIMA payments matching the employer/SE registration and period.
 */
export interface BimaPeriodPayment {
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
}

export interface PeriodPaymentListData {
  payments: BimaPeriodPayment[];
  multiple: boolean;
  period: string;
}

export async function getPeriodPaymentList(params: {
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
  registration_number: string;
  period_month: string;
  period_year: string;
}) {
  return callWizApi<PeriodPaymentListData>('get_period_payment_list', params);
}

/**
 * Apply offline payment — links the BIMA receipt to the C3 record.
 */
export interface ApplyPaymentResult {
  payment_id: number;
  receipt_number: string;
  message: string;
  receipt: {
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
  };
}

export async function applyOfflinePayment(params: {
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
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
  return callWizApi<ApplyPaymentResult>('apply_offline_payment', params);
}

/**
 * Get transaction receipt for "Paid" button modal.
 */
export async function getTransactionReceipt(params: {
  header_id: number;
  transaction_id?: string | null;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
}) {
  return callWizApi<TransactionReceiptData>('get_transaction_receipt', params);
}

export async function getContributionPreview(headerId: number, companyId: number) {
  return callWizApi<any>('get_contribution_preview', { header_id: headerId, company_id: companyId });
}

export async function getNwdContributionPreview(headerId: number, companyId: number) {
  return callWizApi<any>('get_nwd_contribution_preview', { header_id: headerId, company_id: companyId });
}

export async function getSeContributionPreview(contributionId: number) {
  return callWizApi<any>('get_se_contribution_preview', { contribution_id: contributionId });
}

// ─── Offline Payment APIs (Legacy-aligned) ────────────

/**
 * Get offline payment report data (right column of payment page).
 * Legacy: GET /Payment/GetOfflinePaymentData?HeaderId={headerID}
 */
export async function getOfflinePaymentData(params: {
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
}) {
  return callWizApi<OfflinePaymentPageData>('get_offline_payment_data', params);
}

/**
 * Search BIMA receipt by receipt number (triggered on blur).
 * Legacy: GET /Payment/getOfflinePaymentsDetails?receiptId={}&userId={}
 */
export async function searchBimaReceipt(params: {
  receipt_id: string;
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
}) {
  return callWizApi<BimaSearchResult>('search_bima_receipt', params);
}

/**
 * Submit offline payment.
 * Legacy: POST /Payment/OfflinepayNowDataCyberSource
 */
export async function submitOfflinePayment(params: {
  header_id: number;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
  mode: string;
  transaction_date: string;
  bima_ref_num: string;
  need_to_pay: number;
  bank_name?: string | null;
  check_num?: string | null;
  check_date?: string | null;
  jv_number?: string | null;
  jv_date?: string | null;
  credit_card_code?: string | null;
}) {
  return callWizApi<SubmitPaymentResult>('submit_offline_payment', params);
}

/**
 * Get transaction receipt for "Paid" button modal.
 * Legacy: GET /Payment/TransactionReport?transactionId={}&c3HeaderId={}
 */
export async function getTransactionReceipt(params: {
  header_id: number;
  transaction_id?: string | null;
  entity_type: 'c3' | 'nw_director' | 'self_employed';
}) {
  return callWizApi<TransactionReceiptData>('get_transaction_receipt', params);
}
