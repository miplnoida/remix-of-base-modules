/**
 * Reconciliation & CyberSource Settings API service
 * Calls the wiz-admin-api edge function.
 */

const WIZ_API_URL = 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api';
const WIZ_ADMIN_API_KEY = import.meta.env.VITE_WIZ_ADMIN_API_KEY || "uiop906754drd35fvg";

async function callWizApi<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  const res = await fetch(WIZ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": WIZ_ADMIN_API_KEY,
    },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || json.error || `API error: ${res.status}`);
  }
  return json;
}


// ─── CyberSource Settings Types ──────────────────────

export interface CyberSourceSetting {
  id: number;
  environment: string;
  merchant_id: string;
  key_id: string;
  secret_key: string;
  base_url: string;
  is_active: boolean;
}

// ─── CyberSource Settings APIs ───────────────────────

export async function getCyberSourceSettings(): Promise<CyberSourceSetting[]> {
  const res = await callWizApi('get_cybersource_settings');
  return res.data || [];
}

export async function updateCyberSourceSettings(id: number, merchant_id: string, key_id: string, secret_key: string): Promise<void> {
  await callWizApi('update_cybersource_settings', { id, merchant_id, key_id, secret_key });
}

export async function toggleCyberSourceStatus(id: number, login_id: string, password: string): Promise<void> {
  await callWizApi('toggle_cybersource_status', { id, login_id, password });
}

// ─── Reconciliation Types ────────────────────────────

export interface ReconciliationRecord {
  id: number;
  PaymentGatewayTransactionID: string;
  TransactionDate: string;
  PaymentAmount: number;
  PaymentStatus: string;
  ReconciledByName: string | null;
  ReconciledDate: string | null;
  Notes: string | null;
  ReconciliationStatus: 'Reconciled' | 'Pending';
  // Dynamic CyberSource fields
  [key: string]: any;
}

export interface ReconciliationListResponse {
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  records: ReconciliationRecord[];
}

export interface ColumnPreference {
  id?: number;
  field: string;
  status: boolean;
}

export interface CardHolderName {
  cardHolderName: string;
}

// ─── Reconciliation APIs ─────────────────────────────

export async function getReconciliationList(filters: {
  page_number?: number;
  page_size?: number;
  from_date?: string | null;
  to_date?: string | null;
  status?: string | null;
  card_holder_name?: string | null;
}): Promise<ReconciliationListResponse> {
  const res = await callWizApi('get_reconciliation_list', filters);
  return res.data || { total_records: 0, page_number: 0, page_size: 10, total_pages: 0, records: [] };
}

export async function getReconciliationExport(filters?: {
  from_date?: string | null;
  to_date?: string | null;
  status?: string | null;
  card_holder_name?: string | null;
}): Promise<ReconciliationRecord[]> {
  const res = await callWizApi('get_reconciliation_export', filters || {});
  return res.data?.records || res.data || [];
}

export async function uploadCyberSourceCsv(csv_content: string, user_id: number): Promise<{ inserted_count: number; skipped_duplicates: number; auto_reconciled: number }> {
  const res = await callWizApi('upload_cybersource_csv', { csv_content, user_id });
  return res.data || {};
}

export async function updateReconciliationData(ids: number[], reasons: string, user_id: number): Promise<void> {
  await callWizApi('update_reconciliation_data', { id: ids, reasons_for_reconciliation: reasons, user_id });
}

export async function updateReconciliationNotes(id: number, status: boolean, notes: string, user_id: number): Promise<void> {
  await callWizApi('update_reconciliation_notes', { id, status, notes, user_id });
}

export async function getReconciliationNotes(id: number): Promise<string[]> {
  const res = await callWizApi('get_reconciliation_notes', { id });
  return res.data || [];
}

export async function getCardHolderNames(): Promise<CardHolderName[]> {
  const res = await callWizApi('get_card_holder_names');
  return res.data || [];
}

export async function getCyberSourceColumns(user_id: number): Promise<ColumnPreference[]> {
  const res = await callWizApi('get_cybersource_columns', { user_id });
  return res.data || [];
}

export async function saveCyberSourceColumns(columns: { field: string; status: boolean; user_id: number }[]): Promise<void> {
  await callWizApi('save_cybersource_columns', { columns });
}
