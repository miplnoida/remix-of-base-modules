/**
 * Central reference-number service
 * --------------------------------
 * Issues unique reference numbers used by letters, notices and other
 * outbound documents across all modules. Backed by the SQL function
 * `public.next_reference_number(module, dept, doc_type, fy)` which
 * atomically reserves the next number for the matching sequence.
 *
 * Format (default pattern): `{MODULE}/{DOC_TYPE}/{YYYY}/{SEQ}`
 *   e.g. BN/LETTER/2026/000001
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ReferenceRequest {
  moduleCode: string;        // BN, FIN, COM, ...
  departmentCode: string;    // BENEFITS, FINANCE, COMPLIANCE, ...
  documentType: string;      // LETTER, DECISION_LETTER, ...
  financialYear?: number;    // optional override
}

export interface ReferenceNumber {
  referenceNumber: string;
  sequenceId: string;
  currentNumber: number;
}

export class MissingReferenceSequenceError extends Error {
  constructor(public req: ReferenceRequest) {
    super(
      `No reference sequence configured for ${req.moduleCode}/${req.departmentCode}/${req.documentType}. ` +
      `Configure it under System Admin → Reference Sequences.`,
    );
  }
}

async function callRpc(req: ReferenceRequest) {
  const { data, error } = await db.rpc('next_reference_number', {
    p_module_code: req.moduleCode,
    p_department_code: req.departmentCode,
    p_document_type: req.documentType,
    p_financial_year: req.financialYear ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.reference_number) throw new MissingReferenceSequenceError(req);
  return {
    referenceNumber: row.reference_number as string,
    sequenceId: row.sequence_id as string,
    currentNumber: Number(row.current_number),
  } as ReferenceNumber;
}

export async function generateReferenceNumber(req: ReferenceRequest): Promise<ReferenceNumber> {
  return callRpc(req);
}

/** Preview the next reference WITHOUT consuming a number. */
export async function previewNextReferenceNumber(req: ReferenceRequest): Promise<string | null> {
  const fy = req.financialYear ?? new Date().getFullYear();
  const { data } = await db
    .from('system_reference_sequence')
    .select('current_number, padding, prefix_pattern')
    .eq('module_code', req.moduleCode)
    .eq('department_code', req.departmentCode)
    .eq('document_type', req.documentType)
    .eq('financial_year', fy)
    .eq('active', true)
    .maybeSingle();
  if (!data) return null;
  const seq = String((data.current_number || 0) + 1).padStart(data.padding || 6, '0');
  return String(data.prefix_pattern || '{MODULE}/{DOC_TYPE}/{YYYY}/{SEQ}')
    .replace('{MODULE}', req.moduleCode)
    .replace('{DEPT}', req.departmentCode)
    .replace('{DOC_TYPE}', req.documentType)
    .replace('{YYYY}', String(fy))
    .replace('{SEQ}', seq);
}

/** Alias of generate — kept for callers that want explicit reservation semantics. */
export const reserveReferenceNumber = generateReferenceNumber;

/** No-op marker for now; sequences are consumed atomically on generate. */
export async function markReferenceUsed(_referenceNumber: string): Promise<void> { /* reserved for future use */ }

/** Best-effort lookup of the document-type mapping for a BN event code. */
export function bnDocumentTypeFor(eventCode: string): string {
  const ec = (eventCode || '').toLowerCase();
  if (ec.includes('approved') || ec.includes('denied') || ec.includes('disallow') || ec.includes('decision')) return 'DECISION_LETTER';
  if (ec.includes('evidence')) return 'EVIDENCE_REQUEST';
  if (ec.includes('claim') || ec.includes('acknowledg')) return 'CLAIM_NOTICE';
  return 'LETTER';
}
