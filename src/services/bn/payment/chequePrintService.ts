/**
 * Cheque Print Service
 * Mirrors BEMA actions: PRINT / REPRINT / CORRECT / CANCEL / DISPATCH.
 */
import { supabase } from '@/integrations/supabase/client';
import { allocateChequeNumbers, incrementCancelledCount } from './chequeStockService';
const db = supabase as any;

export type ChequeStatus =
  | 'ASSIGNED' | 'PRINTED' | 'REPRINTED' | 'CANCELLED' | 'DISPATCHED' | 'RETURNED' | 'STALE';

export interface ChequeRegisterRow {
  id: string;
  batch_id: string | null;
  batch_item_id: string | null;
  payment_instruction_id: string | null;
  cheque_stock_id: string | null;
  cheque_number: string;
  cheque_date: string | null;
  payee_name: string | null;
  amount: number | null;
  status: ChequeStatus;
  printed_at: string | null;
  printed_by: string | null;
  reprinted_at: string | null;
  reprinted_by: string | null;
  reprint_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  corrected_from: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  dispatched_at: string | null;
  dispatched_by: string | null;
  dispatch_reference: string | null;
}

export async function listChequesForBatch(batchId: string): Promise<ChequeRegisterRow[]> {
  const { data, error } = await db
    .from('bn_cheque_register')
    .select('*')
    .eq('batch_id', batchId)
    .order('cheque_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Assign cheque numbers to all CHEQUE batch items lacking a number.
 */
export async function assignChequeNumbersForBatch(input: {
  batchId: string;
  bankAccountRef: string;
  chequeDate: string;
  startingNumber?: number;
  userCode: string;
}): Promise<{ assigned: number }> {
  const { batchId, bankAccountRef, chequeDate, startingNumber, userCode } = input;
  const { data: items, error } = await db
    .from('bn_batch_item')
    .select('id,instruction_id,beneficiary_name,amount,payment_method,cheque_number,item_status')
    .eq('batch_id', batchId)
    .neq('item_status', 'REMOVED');
  if (error) throw error;
  const toAssign = (items || []).filter(
    (i: any) => i.payment_method === 'CHEQUE' && !i.cheque_number,
  );
  if (!toAssign.length) return { assigned: 0 };
  const { stock, numbers } = await allocateChequeNumbers(bankAccountRef, toAssign.length, startingNumber);

  const registerRows = toAssign.map((it: any, idx: number) => ({
    batch_id: batchId,
    batch_item_id: it.id,
    payment_instruction_id: it.instruction_id,
    cheque_stock_id: stock.id,
    cheque_number: numbers[idx],
    cheque_date: chequeDate,
    payee_name: it.beneficiary_name,
    amount: it.amount,
    status: 'ASSIGNED' as ChequeStatus,
  }));
  const { error: rErr } = await db.from('bn_cheque_register').insert(registerRows);
  if (rErr) throw rErr;

  // Stamp cheque_number back on batch item and payment instruction
  for (let i = 0; i < toAssign.length; i++) {
    const it = toAssign[i];
    await db.from('bn_batch_item').update({ cheque_number: numbers[i] }).eq('id', it.id);
    await db.from('bn_payment_instruction').update({ cheque_number: numbers[i] }).eq('id', it.instruction_id);
  }
  await logEvent(batchId, 'cheque_assigned', userCode, { count: toAssign.length, stock_id: stock.id });
  return { assigned: toAssign.length };
}

export async function markPrinted(chequeIds: string[], userCode: string): Promise<void> {
  if (!chequeIds.length) return;
  await db
    .from('bn_cheque_register')
    .update({ status: 'PRINTED', printed_at: new Date().toISOString(), printed_by: userCode })
    .in('id', chequeIds);
  await logEvent(null, 'cheque_printed', userCode, { ids: chequeIds });
}

export async function reprintCheque(chequeId: string, reason: string, userCode: string): Promise<void> {
  if (!reason?.trim()) throw new Error('Reprint reason is required');
  await db
    .from('bn_cheque_register')
    .update({
      status: 'REPRINTED',
      reprinted_at: new Date().toISOString(),
      reprinted_by: userCode,
      reprint_reason: reason,
    })
    .eq('id', chequeId);
  await logEvent(null, 'cheque_reprinted', userCode, { id: chequeId, reason });
}

export async function cancelCheque(chequeId: string, reason: string, userCode: string): Promise<void> {
  if (!reason?.trim()) throw new Error('Cancellation reason is required');
  const { data: chq } = await db.from('bn_cheque_register').select('cheque_stock_id').eq('id', chequeId).single();
  await db
    .from('bn_cheque_register')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userCode,
      cancellation_reason: reason,
    })
    .eq('id', chequeId);
  if (chq?.cheque_stock_id) await incrementCancelledCount(chq.cheque_stock_id);
  await logEvent(null, 'cheque_cancelled', userCode, { id: chequeId, reason });
}

export async function correctChequeNumber(
  chequeId: string,
  newNumber: string,
  userCode: string,
): Promise<void> {
  const { data: cur } = await db.from('bn_cheque_register').select('cheque_number,batch_item_id,payment_instruction_id').eq('id', chequeId).single();
  if (!cur) throw new Error('Cheque not found');
  await db
    .from('bn_cheque_register')
    .update({
      corrected_from: cur.cheque_number,
      cheque_number: newNumber,
      corrected_at: new Date().toISOString(),
      corrected_by: userCode,
    })
    .eq('id', chequeId);
  if (cur.batch_item_id) {
    await db.from('bn_batch_item').update({ cheque_number: newNumber }).eq('id', cur.batch_item_id);
  }
  if (cur.payment_instruction_id) {
    await db.from('bn_payment_instruction').update({ cheque_number: newNumber }).eq('id', cur.payment_instruction_id);
  }
  await logEvent(null, 'cheque_corrected', userCode, { id: chequeId, from: cur.cheque_number, to: newNumber });
}

export async function markDispatched(
  chequeIds: string[],
  reference: string | undefined,
  userCode: string,
): Promise<void> {
  if (!chequeIds.length) return;
  await db
    .from('bn_cheque_register')
    .update({
      status: 'DISPATCHED',
      dispatched_at: new Date().toISOString(),
      dispatched_by: userCode,
      dispatch_reference: reference || null,
    })
    .in('id', chequeIds);
  await logEvent(null, 'cheque_dispatched', userCode, { ids: chequeIds, reference });
}

async function logEvent(batchId: string | null, action: string, userCode: string, payload: any) {
  try {
    await db.from('system_audit_trail').insert({
      module: 'bn_payment',
      entity_type: 'bn_cheque_register',
      entity_id: batchId,
      action,
      user_name: userCode,
      payload_json: payload,
      severity: 'info',
    });
  } catch { /* non-blocking */ }
}
