/**
 * EFT Format master service.
 *
 * Source-of-truth for configurable EFT bank-file layouts. Stores formats in
 * bn_eft_format and field definitions in bn_eft_format_field. Provides:
 *   - CRUD over formats + fields
 *   - validateFormat(): structural checks
 *   - buildEftFileFromMaster(): pure builder used by eftFileService when a
 *     batch has eft_format_code set. Falls back to the legacy template path
 *     in eftFileService when no master format is configured.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  BnEftFormat,
  BnEftFormatField,
  EftRecordType,
} from '@/types/bnBankEft';

const db = supabase as any;

// ─── CRUD: formats ──────────────────────────────────────────
export async function listFormats(country?: string | null): Promise<BnEftFormat[]> {
  let q = db.from('bn_eft_format').select('*').order('format_name');
  if (country) q = q.or(`country_code.eq.${country},country_code.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BnEftFormat[];
}

export async function getFormat(formatCode: string): Promise<BnEftFormat | null> {
  const { data, error } = await db
    .from('bn_eft_format')
    .select('*')
    .eq('format_code', formatCode)
    .maybeSingle();
  if (error) throw error;
  return data as BnEftFormat | null;
}

export async function upsertFormat(
  row: Partial<BnEftFormat>,
  userCode: string,
): Promise<BnEftFormat> {
  const payload = { ...row, updated_by: userCode } as any;
  if (!row.id) payload.created_by = userCode;
  const { data, error } = await db
    .from('bn_eft_format')
    .upsert(payload, { onConflict: 'format_code' })
    .select()
    .single();
  if (error) throw error;
  await audit('eft_format_upsert', userCode, { format_code: data.format_code });
  return data as BnEftFormat;
}

export async function deleteFormat(formatCode: string, userCode: string): Promise<void> {
  const { error } = await db.from('bn_eft_format').delete().eq('format_code', formatCode);
  if (error) throw error;
  await audit('eft_format_delete', userCode, { format_code: formatCode });
}

// ─── CRUD: fields ───────────────────────────────────────────
export async function listFields(formatCode: string): Promise<BnEftFormatField[]> {
  const { data, error } = await db
    .from('bn_eft_format_field')
    .select('*')
    .eq('format_code', formatCode)
    .order('record_type')
    .order('order_index');
  if (error) throw error;
  return (data ?? []) as BnEftFormatField[];
}

export async function upsertField(
  row: Partial<BnEftFormatField>,
  userCode: string,
): Promise<BnEftFormatField> {
  const { data, error } = await db
    .from('bn_eft_format_field')
    .upsert(row, { onConflict: 'format_code,record_type,order_index' })
    .select()
    .single();
  if (error) throw error;
  await audit('eft_field_upsert', userCode, {
    format_code: data.format_code,
    record_type: data.record_type,
    order_index: data.order_index,
  });
  return data as BnEftFormatField;
}

export async function deleteField(id: string, userCode: string): Promise<void> {
  const { error } = await db.from('bn_eft_format_field').delete().eq('id', id);
  if (error) throw error;
  await audit('eft_field_delete', userCode, { id });
}

// ─── Validation ─────────────────────────────────────────────
export interface FormatValidationIssue {
  code: string;
  message: string;
  record_type?: EftRecordType;
}

export async function validateFormat(formatCode: string): Promise<FormatValidationIssue[]> {
  const issues: FormatValidationIssue[] = [];
  const [fmt, fields] = await Promise.all([getFormat(formatCode), listFields(formatCode)]);
  if (!fmt) {
    issues.push({ code: 'FORMAT_MISSING', message: 'Format not found' });
    return issues;
  }
  if (!fields.length) {
    issues.push({ code: 'NO_FIELDS', message: 'Format has no field definitions' });
    return issues;
  }
  const groups: Record<EftRecordType, BnEftFormatField[]> = {
    HEADER: [], DETAIL: [], TRAILER: [],
  };
  fields.forEach((f) => groups[f.record_type]?.push(f));
  if (fmt.header_required && !groups.HEADER.length)
    issues.push({ code: 'MISSING_HEADER', message: 'Header required but no HEADER fields' });
  if (fmt.trailer_required && !groups.TRAILER.length)
    issues.push({ code: 'MISSING_TRAILER', message: 'Trailer required but no TRAILER fields' });
  if (!groups.DETAIL.length)
    issues.push({ code: 'MISSING_DETAIL', message: 'No DETAIL fields defined' });

  // Position overlap checks (fixed-width only)
  if (!fmt.delimiter) {
    (['HEADER', 'DETAIL', 'TRAILER'] as EftRecordType[]).forEach((rt) => {
      const sorted = [...groups[rt]].sort(
        (a, b) => (a.start_position ?? 0) - (b.start_position ?? 0),
      );
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        const prevEnd = (prev.start_position ?? 0) + (prev.length ?? 0);
        if ((cur.start_position ?? 0) < prevEnd) {
          issues.push({
            code: 'OVERLAP',
            record_type: rt,
            message: `Field ${cur.field_name} overlaps ${prev.field_name}`,
          });
        }
      }
    });
  }
  return issues;
}

// ─── Builder ────────────────────────────────────────────────
export interface BuiltEftFile {
  filename: string;
  content: string;
  controlCount: number;
  controlTotal: number;
  format_code: string;
}

/**
 * Build a bank file from a master-defined format. Caller resolves the batch
 * and instructions; we just render. Returns null when no master format is set
 * (caller can then fall back to legacy template path).
 */
export async function buildEftFileFromMaster(input: {
  batchId: string;
}): Promise<BuiltEftFile | null> {
  const { batchId } = input;
  const { data: batch } = await db
    .from('bn_payment_batch')
    .select('*')
    .eq('id', batchId)
    .single();
  if (!batch?.eft_format_code) return null;

  const fmt = await getFormat(batch.eft_format_code);
  if (!fmt) throw new Error(`EFT format ${batch.eft_format_code} not found`);
  const fields = await listFields(fmt.format_code);
  if (!fields.length) throw new Error(`EFT format ${fmt.format_code} has no fields`);

  // Pull instructions + profile join
  const { data: instructions } = await db
    .from('bn_payment_instruction')
    .select('*, profile:bn_payment_profile(*)')
    .eq('batch_id', batchId)
    .order('created_at');

  if (!instructions?.length) throw new Error('Batch has no payment instructions');

  const controlCount = instructions.length;
  const controlTotal = instructions.reduce(
    (s: number, i: any) => s + Number(i.amount || 0),
    0,
  );

  const ctxBatch = { ...batch, control_count: controlCount, control_total: controlTotal };

  const groups: Record<EftRecordType, BnEftFormatField[]> = { HEADER: [], DETAIL: [], TRAILER: [] };
  fields.forEach((f) => groups[f.record_type]?.push(f));
  (['HEADER', 'DETAIL', 'TRAILER'] as EftRecordType[]).forEach((rt) =>
    groups[rt].sort((a, b) => a.order_index - b.order_index),
  );

  const lines: string[] = [];
  if (fmt.header_required) lines.push(renderRecord(groups.HEADER, fmt, { batch: ctxBatch }));
  instructions.forEach((ins: any) => {
    lines.push(
      renderRecord(groups.DETAIL, fmt, {
        batch: ctxBatch,
        instruction: ins,
        profile: ins.profile ?? {},
      }),
    );
  });
  if (fmt.trailer_required) lines.push(renderRecord(groups.TRAILER, fmt, { batch: ctxBatch }));

  const content = lines.join(fmt.record_separator || '\n');
  const filename = `${batch.batch_number}.${fmt.file_extension}`;

  return {
    filename,
    content,
    controlCount,
    controlTotal,
    format_code: fmt.format_code,
  };
}

function renderRecord(
  fields: BnEftFormatField[],
  fmt: BnEftFormat,
  ctx: Record<string, any>,
): string {
  const cells = fields.map((f) => {
    let raw = resolveSource(f.source_field, ctx);
    if (raw == null || raw === '') raw = f.default_value ?? '';
    raw = applyTransform(String(raw), f.transform, fmt);
    if (!fmt.delimiter && f.length) raw = padTo(raw, f.length, f.padding, f.pad_char);
    return raw;
  });
  return fmt.delimiter ? cells.join(fmt.delimiter) : cells.join('');
}

function resolveSource(path: string | null, ctx: Record<string, any>): any {
  if (!path) return '';
  const parts = path.split('.');
  let v: any = ctx;
  for (const p of parts) {
    if (v == null) return '';
    v = v[p];
  }
  return v;
}

function applyTransform(value: string, transform: string | null, fmt: BnEftFormat): string {
  if (!transform) {
    return value;
  }
  switch (transform) {
    case 'UPPER':
      return value.toUpperCase();
    case 'LOWER':
      return value.toLowerCase();
    case 'DIGITS':
      return value.replace(/\D+/g, '');
    case 'DATE_FMT':
      return formatDate(value, fmt.date_format);
    case 'AMOUNT_CENTS':
      return Math.round(Number(value || 0) * 100).toString();
    default:
      return value;
  }
}

function padTo(value: string, length: number, padding: string, padChar: string): string {
  const ch = padChar || (padding === 'ZERO' ? '0' : ' ');
  if (value.length >= length) return value.slice(0, length);
  if (padding === 'LEFT' || padding === 'ZERO') return value.padStart(length, ch);
  if (padding === 'RIGHT') return value.padEnd(length, ch);
  return value.padEnd(length, ' ');
}

function formatDate(value: string, fmtStr: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const y = d.getFullYear().toString();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return (fmtStr || 'YYYYMMDD')
    .replace('YYYY', y)
    .replace('YY', y.slice(-2))
    .replace('MM', m)
    .replace('DD', day);
}

async function audit(action: string, userCode: string, payload: any) {
  try {
    await db.from('system_audit_trail').insert({
      module: 'bn_payment',
      entity_type: 'bn_eft_format',
      action,
      user_name: userCode,
      payload_json: payload,
      severity: 'info',
    });
  } catch {
    /* non-blocking */
  }
}
