/**
 * Payment Reconciliation Service
 * Records bank acceptance/rejection/returned/stale results against batch items / EFT files / cheques.
 */
import { supabase } from '@/integrations/supabase/client';
const db = supabase as any;

export type ReconResult = 'ACCEPTED' | 'REJECTED' | 'RETURNED' | 'STALE' | 'MANUAL';

export async function recordReconciliation(input: {
  batchId?: string;
  batchItemId?: string;
  eftFileId?: string;
  chequeRegisterId?: string;
  result: ReconResult;
  reasonCode?: string;
  reasonDetail?: string;
  bankReference?: string;
  userCode: string;
  notes?: string;
}): Promise<void> {
  const row = {
    batch_id: input.batchId || null,
    batch_item_id: input.batchItemId || null,
    eft_file_id: input.eftFileId || null,
    cheque_register_id: input.chequeRegisterId || null,
    result: input.result,
    reason_code: input.reasonCode || null,
    reason_detail: input.reasonDetail || null,
    bank_reference: input.bankReference || null,
    reconciled_by: input.userCode,
    notes: input.notes || null,
  };
  const { error } = await db.from('bn_payment_reconciliation').insert(row);
  if (error) throw error;

  // Optional side-effects
  if (input.chequeRegisterId && (input.result === 'RETURNED' || input.result === 'STALE')) {
    await db.from('bn_cheque_register')
      .update({ status: input.result })
      .eq('id', input.chequeRegisterId);
  }
  try {
    await db.from('system_audit_trail').insert({
      module: 'bn_payment',
      entity_type: 'bn_payment_reconciliation',
      action: 'reconciliation_recorded',
      action_by: input.userCode,
      payload: input,
      severity: 'info',
    });
  } catch { /* non-blocking */ }
}

export async function listReconciliationsForBatch(batchId: string) {
  const { data, error } = await db
    .from('bn_payment_reconciliation')
    .select('*')
    .eq('batch_id', batchId)
    .order('reconciled_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
