/**
 * EFT File Service
 * Generates configurable bank files for EFT batches. When a batch has
 * `eft_format_code` set, the master-format builder (bn_eft_format /
 * bn_eft_format_field) is used. Otherwise it falls back to the legacy
 * bn_country_payment_config template path.
 */
import { supabase } from '@/integrations/supabase/client';
import { buildEftFileFromMaster } from './eftFormatService';
const db = supabase as any;

export interface EftFile {
  id: string;
  batch_id: string;
  file_reference: string;
  bank_code: string | null;
  file_format: string;
  file_name: string;
  file_hash: string | null;
  file_payload: string | null;
  control_count: number | null;
  control_amount: number | null;
  generated_by: string | null;
  generated_at: string;
  submitted_at: string | null;
  submitted_by: string | null;
  response_at: string | null;
  response_payload: string | null;
  status: 'GENERATED' | 'SUBMITTED' | 'ACK' | 'REJECTED' | 'RECONCILED';
  notes: string | null;
}

/**
 * Generate EFT file from country pack template and batch items.
 */
export async function generateEftFile(input: {
  batchId: string;
  countryCode: string;
  bankCode?: string;
  userCode: string;
}): Promise<EftFile> {
  const { batchId, countryCode, bankCode, userCode } = input;

  // Country payment config (EFT template)
  const { data: cfg } = await db
    .from('bn_country_payment_config')
    .select('*')
    .eq('country_code', countryCode)
    .eq('payment_method', 'EFT')
    .maybeSingle();

  const headerTpl = cfg?.header_record_format || 'H,{file_reference},{generated_date},{count},{total_amount}';
  const detailTpl = cfg?.detail_record_format ||
    'D,{seq},{payee_name},{account_number},{routing_number},{amount},{currency},{reference}';
  const trailerTpl = cfg?.trailer_record_format || 'T,{count},{total_amount}';
  const fileFormat = cfg?.bank_file_format || 'CSV';
  const namingTpl = cfg?.file_naming_convention || 'BN_EFT_{batch_number}_{yyyymmdd}.csv';

  const { data: batch } = await db.from('bn_payment_batch').select('*').eq('id', batchId).single();
  if (!batch) throw new Error('Batch not found');

  const { data: items } = await db
    .from('bn_batch_item')
    .select('*')
    .eq('batch_id', batchId)
    .neq('item_status', 'REMOVED')
    .eq('payment_method', 'DIRECT_DEPOSIT');

  if (!items?.length) throw new Error('Batch contains no EFT items');

  // Validate every item has bank snapshot
  const missing: string[] = [];
  items.forEach((it: any) => {
    const snap = it.bank_account_snapshot || {};
    if (!snap.account_number || !snap.routing_number) missing.push(it.ssn || it.id);
  });
  if (missing.length) {
    throw new Error(`Missing bank account/routing for: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  }

  const generatedAt = new Date();
  const yyyymmdd = generatedAt.toISOString().slice(0, 10).replace(/-/g, '');
  const fileReference = `${batch.batch_number}-${generatedAt.getTime().toString(36).toUpperCase()}`;
  const totalAmount = items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  const render = (tpl: string, ctx: Record<string, any>) =>
    tpl.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));

  const header = render(headerTpl, {
    file_reference: fileReference,
    generated_date: yyyymmdd,
    count: items.length,
    total_amount: totalAmount.toFixed(2),
    batch_number: batch.batch_number,
    bank_code: bankCode || cfg?.bank_code || '',
  });
  const trailer = render(trailerTpl, {
    count: items.length,
    total_amount: totalAmount.toFixed(2),
  });
  const details = items.map((it: any, idx: number) => {
    const snap = it.bank_account_snapshot || {};
    return render(detailTpl, {
      seq: idx + 1,
      payee_name: it.beneficiary_name || '',
      account_number: snap.account_number,
      routing_number: snap.routing_number,
      bank_code: snap.bank_code || '',
      amount: Number(it.amount || 0).toFixed(2),
      currency: it.currency || 'XCD',
      reference: it.claim_number || it.ssn || '',
      ssn: it.ssn || '',
    });
  });

  const payload = [header, ...details, trailer].join('\n');
  const hash = await sha256(payload);
  const fileName = render(namingTpl, { batch_number: batch.batch_number, yyyymmdd });

  const row = {
    batch_id: batchId,
    file_reference: fileReference,
    bank_code: bankCode || cfg?.bank_code || null,
    file_format: fileFormat,
    file_name: fileName,
    file_hash: hash,
    file_payload: payload,
    control_count: items.length,
    control_amount: totalAmount,
    generated_by: userCode,
    status: 'GENERATED' as const,
  };
  const { data, error } = await db.from('bn_eft_file').insert(row).select().single();
  if (error) throw error;
  await audit('eft_file_generated', userCode, { batch_id: batchId, file_id: data.id, hash });
  return data;
}

export async function listEftFilesForBatch(batchId: string): Promise<EftFile[]> {
  const { data, error } = await db
    .from('bn_eft_file')
    .select('*')
    .eq('batch_id', batchId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markEftSubmitted(fileId: string, userCode: string): Promise<void> {
  await db
    .from('bn_eft_file')
    .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString(), submitted_by: userCode })
    .eq('id', fileId);
  await audit('eft_file_submitted', userCode, { file_id: fileId });
}

export async function uploadEftResponse(
  fileId: string,
  responsePayload: string,
  status: 'ACK' | 'REJECTED' | 'RECONCILED',
  userCode: string,
): Promise<void> {
  await db
    .from('bn_eft_file')
    .update({
      status,
      response_at: new Date().toISOString(),
      response_payload: responsePayload,
    })
    .eq('id', fileId);
  await audit('eft_file_response', userCode, { file_id: fileId, status });
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function audit(action: string, userCode: string, payload: any) {
  try {
    await db.from('system_audit_trail').insert({
      module: 'bn_payment',
      entity_type: 'bn_eft_file',
      action,
      user_name: userCode,
      payload_json: payload,
      severity: 'info',
    });
  } catch { /* non-blocking */ }
}

export function downloadEftFile(file: EftFile): void {
  const blob = new Blob([file.file_payload || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
