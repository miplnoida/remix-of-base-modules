/**
 * Bank / Branch / Payment-method master CRUD service.
 * Backed by bn_bank_master, bn_bank_branch, bn_payment_method.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  BnBankMaster,
  BnBankBranch,
  BnPaymentMethod,
} from '@/types/bnBankEft';

const db = supabase as any;

// ─── Banks ──────────────────────────────────────────────────
export async function listBanks(country?: string | null): Promise<BnBankMaster[]> {
  let q = db.from('bn_bank_master').select('*').order('bank_name');
  if (country) q = q.eq('country_code', country);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BnBankMaster[];
}

export async function upsertBank(
  row: Partial<BnBankMaster>,
  userCode: string,
): Promise<BnBankMaster> {
  const payload = { ...row, updated_by: userCode } as any;
  if (!row.id) payload.created_by = userCode;
  const { data, error } = await db
    .from('bn_bank_master')
    .upsert(payload, { onConflict: 'bank_code' })
    .select()
    .single();
  if (error) throw error;
  await audit('bank_master_upsert', userCode, { bank_code: data.bank_code });
  return data as BnBankMaster;
}

export async function deleteBank(bankCode: string, userCode: string): Promise<void> {
  const { error } = await db.from('bn_bank_master').delete().eq('bank_code', bankCode);
  if (error) throw error;
  await audit('bank_master_delete', userCode, { bank_code: bankCode });
}

// ─── Branches ───────────────────────────────────────────────
export async function listBranches(bankCode?: string | null): Promise<BnBankBranch[]> {
  let q = db.from('bn_bank_branch').select('*').order('branch_name');
  if (bankCode) q = q.eq('bank_code', bankCode);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BnBankBranch[];
}

export async function upsertBranch(
  row: Partial<BnBankBranch>,
  userCode: string,
): Promise<BnBankBranch> {
  const payload = { ...row, updated_by: userCode } as any;
  if (!row.id) payload.created_by = userCode;
  const { data, error } = await db
    .from('bn_bank_branch')
    .upsert(payload, { onConflict: 'bank_code,branch_code' })
    .select()
    .single();
  if (error) throw error;
  await audit('bank_branch_upsert', userCode, {
    bank_code: data.bank_code,
    branch_code: data.branch_code,
  });
  return data as BnBankBranch;
}

export async function deleteBranch(id: string, userCode: string): Promise<void> {
  const { error } = await db.from('bn_bank_branch').delete().eq('id', id);
  if (error) throw error;
  await audit('bank_branch_delete', userCode, { id });
}

// ─── Payment methods ────────────────────────────────────────
export async function listPaymentMethods(): Promise<BnPaymentMethod[]> {
  const { data, error } = await db
    .from('bn_payment_method')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnPaymentMethod[];
}

export async function upsertPaymentMethod(
  row: Partial<BnPaymentMethod>,
  userCode: string,
): Promise<BnPaymentMethod> {
  const { data, error } = await db
    .from('bn_payment_method')
    .upsert(row, { onConflict: 'method_code' })
    .select()
    .single();
  if (error) throw error;
  await audit('payment_method_upsert', userCode, { method_code: data.method_code });
  return data as BnPaymentMethod;
}

async function audit(action: string, userCode: string, payload: any) {
  try {
    await db.from('system_audit_trail').insert({
      module: 'bn_payment',
      entity_type: 'bn_bank_master',
      action,
      user_name: userCode,
      payload_json: payload,
      severity: 'info',
    });
  } catch {
    /* non-blocking */
  }
}
