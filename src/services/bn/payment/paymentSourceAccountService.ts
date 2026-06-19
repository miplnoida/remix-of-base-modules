/**
 * Payment Source Account service.
 * Owns EFT bank-file mechanics per funding bank/account. EFT batch generation
 * reads file format from here — not from bn_country_payment_config (legacy fallback only).
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type SourceFormatStatus =
  | 'PENDING_BANK_SPECIFICATION'
  | 'DRAFT'
  | 'READY'
  | 'RETIRED';

export interface PaymentSourceAccount {
  id: string;
  country_code: string;
  source_account_code: string;
  source_account_name: string;
  payment_method: string;
  bank_id: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  currency_code: string | null;
  bank_file_format: string | null;
  header_record_format: string | null;
  detail_record_format: string | null;
  trailer_record_format: string | null;
  file_naming_convention: string | null;
  file_date_format: string | null;
  account_number_rule: string | null;
  routing_number_rule: string | null;
  bank_validation_rule_set: Record<string, unknown> | null;
  format_status: SourceFormatStatus;
  is_default: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
  modified_by: string | null;
  modified_at: string;
}

export async function listSourceAccounts(
  countryCode: string,
  paymentMethod?: string,
): Promise<PaymentSourceAccount[]> {
  let q = db
    .from('bn_payment_source_account')
    .select('*')
    .eq('country_code', countryCode)
    .order('payment_method')
    .order('is_default', { ascending: false })
    .order('source_account_code');
  if (paymentMethod) q = q.eq('payment_method', paymentMethod);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PaymentSourceAccount[];
}

export async function getActiveSourceAccount(
  countryCode: string,
  paymentMethod: string,
): Promise<PaymentSourceAccount | null> {
  const { data, error } = await db
    .from('bn_payment_source_account')
    .select('*')
    .eq('country_code', countryCode)
    .eq('payment_method', paymentMethod)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('modified_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as PaymentSourceAccount | null;
}

export async function upsertSourceAccount(
  row: Partial<PaymentSourceAccount> & {
    country_code: string;
    source_account_code: string;
    source_account_name: string;
    payment_method: string;
  },
  userCode: string,
): Promise<PaymentSourceAccount> {
  const payload: any = { ...row, modified_by: userCode };
  if (!row.id) payload.entered_by = userCode;
  const { data, error } = await db
    .from('bn_payment_source_account')
    .upsert(payload, { onConflict: 'country_code,source_account_code' })
    .select()
    .single();
  if (error) throw error;
  return data as PaymentSourceAccount;
}

export async function deleteSourceAccount(id: string): Promise<void> {
  const { error } = await db.from('bn_payment_source_account').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Returns the format readiness for a country+method combination.
 * Used by EFT batch generation and product validation gates.
 */
export async function getEftFormatReadiness(countryCode: string): Promise<{
  hasSourceAccount: boolean;
  isReady: boolean;
  status: SourceFormatStatus | 'MISSING';
  account: PaymentSourceAccount | null;
}> {
  const acct = await getActiveSourceAccount(countryCode, 'EFT');
  if (!acct) return { hasSourceAccount: false, isReady: false, status: 'MISSING', account: null };
  return {
    hasSourceAccount: true,
    isReady: acct.format_status === 'READY',
    status: acct.format_status,
    account: acct,
  };
}
