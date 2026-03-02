/**
 * Payment Details API service
 * Calls the wiz-admin-api edge function for payment-related actions.
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

export interface PaymentPayDetail {
  transaction_id: string;
  transaction_status: string;
  transaction_date: string | null;
  payment_amount: number;
  mode: string | null;
  receipt_number: string | null;
  receipt_date: string | null;
}

export interface PaymentRecord {
  header_id: number;
  user_id: number;
  reg_no: string;
  period_month: string;
  period_month_number: number;
  period_year: string;
  total_wages: number;
  total_ss_contributions: number;
  total_levy_employee: number;
  total_ss_penalty: number;
  total_levy_penalty: number;
  total_pe_penalty: number;
  total_fines_and_penalties: number;
  total_severance: number;
  insert_datetime: string;
  is_submitted: boolean;
  is_finalized: boolean;
  schedule_no: number | null;
  record_type: string; // "company" | "self_employed"
  pay_details: PaymentPayDetail[];
}

export interface PaymentListResponse {
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  records: PaymentRecord[];
}

export interface TransactionReceipt {
  ref_customer_name: string;
  payment_gateway_transaction_id: string;
  payment_status: string;
  payment_amount: number;
  create_time: string;
  receipt_number: string;
  reg_no: string;
  period: string;
  bank_name: string | null;
  check_num: string | null;
  check_date: string | null;
  jv_number: string | null;
  jv_date: string | null;
  transaction_date: string | null;
  bima_ref_num: string | null;
  mode: string | null;
  total_ss_contributions: number;
  total_ss_penalty: number;
  total_levy: number;
  total_levy_penalty: number;
  total_severance: number;
  total_pe_penalty: number;
}

export interface SelfEmployedDropdownItem {
  id: number;
  full_name: string;
  ssn: string;
}

// ─── API Functions ────────────────────────────────────

export async function getPaymentDetailsList(params: {
  payment_status?: string;
  from_date?: string | null;
  to_date?: string | null;
  company_id?: number | null;
  user_id?: number | null;
  types?: string; // "SSB" | "Company" | "SelfEmployee"
  page_number?: number;
  page_size?: number;
  export_all?: boolean;
}) {
  return callWizApi<PaymentListResponse>("get_payment_details_list", params);
}

export async function getTransactionReceipt(params: {
  user_id: number;
  c3_header_id: number;
  transaction_id?: string;
}) {
  return callWizApi<TransactionReceipt>("get_transaction_receipt", params);
}

export async function getSelfEmployedDropdown() {
  return callWizApi<{ records: SelfEmployedDropdownItem[] }>("get_self_employed_dropdown");
}
