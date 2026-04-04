/**
 * Payment Issue Service
 *
 * Business Purpose:
 *   Issues outbound benefit disbursements by persisting to the correct
 *   claims-side payment structures: cl_cheques, cl_cheques_holding,
 *   cl_cheques_survivor. This is the final step in the benefit payment
 *   pipeline, downstream of Batch Operations.
 *
 * Existing tables used (WRITE):
 *   - cl_cheques              — Standard benefit cheque/DD issue
 *   - cl_cheques_holding      — Holding payments (withheld pending conditions)
 *   - cl_cheques_survivor     — Survivor benefit payments
 *
 * Existing tables used (READ):
 *   - cl_head                 — Claim header for validation
 *   - bn_payment_batch        — Source batch (RELEASED status)
 *   - bn_batch_item           — Individual items to issue
 *   - bn_payment_instruction  — Payable instruction context
 *   - bn_entitlement          — Entitlement context
 *   - bn_claim                — Claim context
 *   - bn_claim_event          — Audit trail
 *
 * CRITICAL CONSTRAINTS:
 *   - cn_payment*, cn_receipt, cn_refund are NEVER used for outbound payments.
 *   - All outbound benefit payments persist ONLY to cl_cheques*.
 *   - Duplicate prevention via composite key (ssn + claim + period + amount).
 *   - Reissue-safe: voided cheques can be reissued with new cheque number.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─── Types ──────────────────────────────────────────────────────────

export type IssueStatus =
  | 'PENDING'          // Awaiting issue
  | 'ISSUING'          // Issue in progress
  | 'ISSUED'           // Successfully written to cl_cheques*
  | 'FAILED'           // Issue failed (retryable)
  | 'VOIDED'           // Cheque voided after issue
  | 'REISSUE_PENDING'  // Pending reissue after void
  | 'STALE_DATED'      // Cheque expired / stale-dated
  | 'STOPPED';         // Payment stopped

export type IssueMethod = 'CHEQUE' | 'DIRECT_DEPOSIT';

export type IssueTargetTable = 'cl_cheques' | 'cl_cheques_holding' | 'cl_cheques_survivor';

export type IssueAction =
  | 'ISSUE'
  | 'VOID'
  | 'REISSUE'
  | 'STOP'
  | 'STALE_DATE'
  | 'RETRY';

/**
 * Routing Rules — which cl_cheques* table to use:
 *
 * cl_cheques:          Standard benefit payments (Sickness, Maternity, Injury,
 *                      Employment Injury, Pension, Lump Sum, Grant, Medical)
 *
 * cl_cheques_holding:  Payments withheld pending:
 *                      - Outstanding documentation
 *                      - Legal hold / court order
 *                      - Address verification
 *                      - Manual review flagged by supervisor
 *
 * cl_cheques_survivor: Survivor/death benefit payments where the payee is
 *                      NOT the insured person but a named survivor/dependent.
 *                      Linked via survivor_id to the survivor record.
 */

export interface IssueRecord {
  id: string;
  batch_id: string;
  batch_item_id: string;
  instruction_id: string;

  // Beneficiary
  ssn: string;
  claim_number: string | null;
  beneficiary_name: string | null;
  survivor_id: string | null;

  // Payment
  amount: number;
  currency: string;
  issue_method: IssueMethod;
  period_start: string | null;
  period_end: string | null;
  instruction_type: string;

  // Issue tracking
  target_table: IssueTargetTable;
  status: IssueStatus;
  cheque_number: string | null;
  dd_reference: string | null;
  issued_at: string | null;
  issued_by: string | null;

  // Failure
  error_message: string | null;
  retry_count: number;
  max_retries: number;

  // Void / Reissue
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  reissue_of: string | null;  // ID of voided issue record

  // Holding
  hold_reason: string | null;
  hold_released_at: string | null;
  hold_released_by: string | null;

  created_at: string;
}

export interface IssueSummary {
  total: number;
  pending: number;
  issued: number;
  failed: number;
  voided: number;
  totalAmount: number;
}

export interface IssueFilters {
  batch_id?: string;
  status?: IssueStatus;
  issue_method?: IssueMethod;
  target_table?: IssueTargetTable;
  search?: string;
}

// ─── Target Table Routing ───────────────────────────────────────────

export function resolveTargetTable(
  instructionType: string,
  hasSurvivor: boolean,
  isHolding: boolean
): IssueTargetTable {
  if (hasSurvivor) return 'cl_cheques_survivor';
  if (isHolding) return 'cl_cheques_holding';
  return 'cl_cheques';
}

// ─── Status Transitions ─────────────────────────────────────────────

const ISSUE_TRANSITIONS: Record<IssueStatus, IssueAction[]> = {
  PENDING:         ['ISSUE'],
  ISSUING:         [],  // In-flight, no actions
  ISSUED:          ['VOID', 'STOP', 'STALE_DATE'],
  FAILED:          ['RETRY', 'VOID'],
  VOIDED:          ['REISSUE'],
  REISSUE_PENDING: ['ISSUE'],
  STALE_DATED:     ['REISSUE'],
  STOPPED:         ['REISSUE'],
};

export function getAvailableIssueActions(status: IssueStatus): IssueAction[] {
  return ISSUE_TRANSITIONS[status] || [];
}

// ─── Role Permissions ───────────────────────────────────────────────

const ISSUE_ACTION_ROLES: Record<IssueAction, string[]> = {
  ISSUE:      ['MANAGER', 'FINANCE_OFFICER'],
  VOID:       ['MANAGER', 'FINANCE_OFFICER'],
  REISSUE:    ['MANAGER', 'FINANCE_OFFICER'],
  STOP:       ['MANAGER'],
  STALE_DATE: ['SUPERVISOR', 'MANAGER', 'FINANCE_OFFICER'],
  RETRY:      ['SUPERVISOR', 'MANAGER', 'FINANCE_OFFICER'],
};

export function canPerformIssueAction(action: IssueAction, userRole: string): boolean {
  return ISSUE_ACTION_ROLES[action]?.includes(userRole) ?? false;
}

// ─── Fetch Issue Records ────────────────────────────────────────────

export async function fetchIssueRecords(filters: IssueFilters = {}): Promise<IssueRecord[]> {
  let query = db.from('bn_issue_record').select('*').order('created_at', { ascending: false });

  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.issue_method) query = query.eq('issue_method', filters.issue_method);
  if (filters.target_table) query = query.eq('target_table', filters.target_table);
  if (filters.search) {
    query = query.or(`ssn.ilike.%${filters.search}%,claim_number.ilike.%${filters.search}%,cheque_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchIssueRecordDetail(id: string): Promise<IssueRecord> {
  const { data, error } = await db.from('bn_issue_record').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchIssueSummary(batchId?: string): Promise<IssueSummary> {
  let query = db.from('bn_issue_record').select('status, amount');
  if (batchId) query = query.eq('batch_id', batchId);

  const { data } = await query;
  const records = data || [];

  return {
    total: records.length,
    pending: records.filter((r: any) => r.status === 'PENDING' || r.status === 'REISSUE_PENDING').length,
    issued: records.filter((r: any) => r.status === 'ISSUED').length,
    failed: records.filter((r: any) => r.status === 'FAILED').length,
    voided: records.filter((r: any) => r.status === 'VOIDED').length,
    totalAmount: records
      .filter((r: any) => r.status === 'ISSUED')
      .reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
  };
}

// ─── Duplicate Prevention ───────────────────────────────────────────

function buildDuplicateKey(ssn: string, claimNumber: string | null, periodStart: string | null, periodEnd: string | null, amount: number): string {
  return `${ssn}|${claimNumber || ''}|${periodStart || ''}|${periodEnd || ''}|${amount}`;
}

async function checkDuplicate(record: Partial<IssueRecord>): Promise<boolean> {
  const { data } = await db
    .from('bn_issue_record')
    .select('id')
    .eq('ssn', record.ssn)
    .eq('claim_number', record.claim_number)
    .eq('period_start', record.period_start)
    .eq('period_end', record.period_end)
    .eq('amount', record.amount)
    .in('status', ['ISSUED', 'PENDING', 'ISSUING'])
    .limit(1);

  return (data?.length || 0) > 0;
}

// ─── Prepare Issue Records from Released Batch ──────────────────────

export async function prepareIssueFromBatch(batchId: string, userCode: string): Promise<number> {
  // Fetch validated batch items
  const { data: items, error } = await db
    .from('bn_batch_item')
    .select('*')
    .eq('batch_id', batchId)
    .eq('item_status', 'VALIDATED');

  if (error) throw error;
  if (!items?.length) throw new Error('No validated items in batch');

  const issueRecords: any[] = [];

  for (const item of items) {
    // Fetch instruction for additional context
    const { data: instr } = await db
      .from('bn_payment_instruction')
      .select('*')
      .eq('id', item.instruction_id)
      .single();

    const hasSurvivor = !!(instr?.survivor_id);
    const isHolding = !!(instr?.hold_reason);
    const targetTable = resolveTargetTable(item.instruction_type, hasSurvivor, isHolding);

    // Duplicate check
    const isDup = await checkDuplicate({
      ssn: item.ssn,
      claim_number: item.claim_number,
      period_start: item.period_start,
      period_end: item.period_end,
      amount: item.amount,
    });

    if (isDup) {
      // Mark item as exception instead of creating issue record
      await db.from('bn_batch_item').update({
        item_status: 'EXCEPTION',
        validation_errors: ['Duplicate payment detected'],
      }).eq('id', item.id);

      await db.from('bn_payment_exception').insert({
        instruction_id: item.instruction_id,
        batch_id: batchId,
        exception_type: 'DUPLICATE_PAYMENT',
        description: `Duplicate: SSN ${item.ssn}, Claim ${item.claim_number}, Amount ${item.amount}`,
        status: 'OPEN',
        raised_by: userCode,
      });

      continue;
    }

    issueRecords.push({
      batch_id: batchId,
      batch_item_id: item.id,
      instruction_id: item.instruction_id,
      ssn: item.ssn,
      claim_number: item.claim_number,
      beneficiary_name: item.beneficiary_name,
      survivor_id: instr?.survivor_id || null,
      amount: item.amount,
      currency: item.currency || 'XCD',
      issue_method: item.payment_method === 'DIRECT_DEPOSIT' ? 'DIRECT_DEPOSIT' : 'CHEQUE',
      period_start: item.period_start,
      period_end: item.period_end,
      instruction_type: item.instruction_type,
      target_table: targetTable,
      status: 'PENDING',
      retry_count: 0,
      max_retries: 3,
      hold_reason: isHolding ? instr?.hold_reason : null,
    });
  }

  if (issueRecords.length > 0) {
    const { error: iErr } = await db.from('bn_issue_record').insert(issueRecords);
    if (iErr) throw iErr;
  }

  await logIssueEvent(batchId, null, 'PREPARE', userCode,
    `Prepared ${issueRecords.length} issue records from batch`, {
      prepared: issueRecords.length,
      duplicates_blocked: items.length - issueRecords.length,
    });

  return issueRecords.length;
}

// ─── Execute Issue ──────────────────────────────────────────────────

export interface IssueResult {
  issued: number;
  failed: number;
  details: Array<{ id: string; ssn: string; status: string; error?: string }>;
}

export async function executeIssue(issueIds: string[], userCode: string): Promise<IssueResult> {
  const result: IssueResult = { issued: 0, failed: 0, details: [] };

  for (const id of issueIds) {
    const record = await fetchIssueRecordDetail(id);

    if (!['PENDING', 'REISSUE_PENDING'].includes(record.status)) {
      result.details.push({ id, ssn: record.ssn, status: 'SKIPPED', error: 'Not in issuable status' });
      continue;
    }

    // Mark as ISSUING
    await db.from('bn_issue_record').update({ status: 'ISSUING' }).eq('id', id);

    try {
      const writeResult = await writeToLegacyTable(record, userCode);

      // Update issue record
      await db.from('bn_issue_record').update({
        status: 'ISSUED',
        cheque_number: writeResult.cheque_number || null,
        dd_reference: writeResult.dd_reference || null,
        issued_at: new Date().toISOString(),
        issued_by: userCode,
      }).eq('id', id);

      // Update batch item
      await db.from('bn_batch_item').update({
        item_status: 'ISSUED',
        cl_cheque_no: writeResult.cheque_number || writeResult.dd_reference || null,
        issued_at: new Date().toISOString(),
      }).eq('id', record.batch_item_id);

      // Update instruction
      await db.from('bn_payment_instruction').update({
        status: 'ISSUED_PENDING',
        cl_cheque_no: writeResult.cheque_number || writeResult.dd_reference || null,
      }).eq('id', record.instruction_id);

      result.issued++;
      result.details.push({ id, ssn: record.ssn, status: 'ISSUED' });

    } catch (err: any) {
      const retryCount = record.retry_count + 1;
      const newStatus = retryCount >= record.max_retries ? 'FAILED' : 'PENDING';

      await db.from('bn_issue_record').update({
        status: newStatus,
        error_message: err.message,
        retry_count: retryCount,
      }).eq('id', id);

      if (newStatus === 'FAILED') {
        await db.from('bn_payment_exception').insert({
          instruction_id: record.instruction_id,
          batch_id: record.batch_id,
          exception_type: 'ISSUE_FAILURE',
          description: `Issue failed after ${retryCount} attempts: ${err.message}`,
          status: 'OPEN',
          raised_by: userCode,
        });
      }

      result.failed++;
      result.details.push({ id, ssn: record.ssn, status: 'FAILED', error: err.message });
    }
  }

  // Log aggregate event
  if (issueIds.length > 0) {
    const batchId = (await fetchIssueRecordDetail(issueIds[0])).batch_id;
    await logIssueEvent(batchId, null, 'ISSUE', userCode,
      `Issue run: ${result.issued} issued, ${result.failed} failed`, {
        issued: result.issued,
        failed: result.failed,
      });
  }

  return result;
}

// ─── Write to Legacy cl_cheques* Tables ─────────────────────────────

interface LegacyWriteResult {
  cheque_number: string | null;
  dd_reference: string | null;
}

async function writeToLegacyTable(record: IssueRecord, userCode: string): Promise<LegacyWriteResult> {
  const baseData: any = {
    ssn: record.ssn,
    claim_number: record.claim_number,
    amount: record.amount,
    currency: record.currency,
    period_start: record.period_start,
    period_end: record.period_end,
    payment_type: record.instruction_type,
    payment_method: record.issue_method,
    batch_id: record.batch_id,
    issued_by: userCode,
    issued_date: new Date().toISOString(),
    status: 'ISSUED',
  };

  // Generate cheque number or DD reference
  if (record.issue_method === 'CHEQUE') {
    baseData.cheque_number = await generateChequeNumber();
  } else {
    baseData.dd_reference = await generateDDReference();
  }

  // Route to correct table
  const table = record.target_table;

  if (table === 'cl_cheques_survivor') {
    baseData.survivor_id = record.survivor_id;
    baseData.beneficiary_name = record.beneficiary_name;
  }

  if (table === 'cl_cheques_holding') {
    baseData.hold_reason = record.hold_reason;
    baseData.hold_status = 'HELD';
  }

  const { error } = await db.from(table).insert(baseData);
  if (error) throw error;

  return {
    cheque_number: baseData.cheque_number || null,
    dd_reference: baseData.dd_reference || null,
  };
}

// ─── Void / Reissue / Stop ──────────────────────────────────────────

export interface ExecuteIssueActionParams {
  issueId: string;
  action: IssueAction;
  userCode: string;
  reason?: string;
}

export async function executeIssueAction(params: ExecuteIssueActionParams): Promise<void> {
  const { issueId, action, userCode, reason } = params;
  const record = await fetchIssueRecordDetail(issueId);
  const available = getAvailableIssueActions(record.status);

  if (!available.includes(action)) {
    throw new Error(`Action ${action} not allowed in status ${record.status}`);
  }

  switch (action) {
    case 'VOID':
      await voidIssue(record, userCode, reason || 'Voided');
      break;
    case 'REISSUE':
      await prepareReissue(record, userCode, reason);
      break;
    case 'STOP':
      await stopIssue(record, userCode, reason || 'Payment stopped');
      break;
    case 'STALE_DATE':
      await staleDateIssue(record, userCode);
      break;
    case 'RETRY':
      await retryIssue(record, userCode);
      break;
    case 'ISSUE':
      await executeIssue([issueId], userCode);
      break;
  }

  await logIssueEvent(record.batch_id, issueId, action, userCode,
    reason || `${action} executed`, { ssn: record.ssn, cheque: record.cheque_number });
}

async function voidIssue(record: IssueRecord, userCode: string, reason: string): Promise<void> {
  // Update legacy table
  await db.from(record.target_table).update({
    status: 'VOIDED',
    voided_by: userCode,
    voided_date: new Date().toISOString(),
    void_reason: reason,
  }).eq('cheque_number', record.cheque_number);

  // Update issue record
  await db.from('bn_issue_record').update({
    status: 'VOIDED',
    voided_at: new Date().toISOString(),
    voided_by: userCode,
    void_reason: reason,
  }).eq('id', record.id);
}

async function prepareReissue(record: IssueRecord, userCode: string, reason?: string): Promise<void> {
  // Create new issue record linked to voided one
  const newRecord = {
    batch_id: record.batch_id,
    batch_item_id: record.batch_item_id,
    instruction_id: record.instruction_id,
    ssn: record.ssn,
    claim_number: record.claim_number,
    beneficiary_name: record.beneficiary_name,
    survivor_id: record.survivor_id,
    amount: record.amount,
    currency: record.currency,
    issue_method: record.issue_method,
    period_start: record.period_start,
    period_end: record.period_end,
    instruction_type: record.instruction_type,
    target_table: record.target_table,
    status: 'REISSUE_PENDING',
    retry_count: 0,
    max_retries: 3,
    reissue_of: record.id,
    hold_reason: record.hold_reason,
  };

  await db.from('bn_issue_record').insert(newRecord);

  // Update instruction back to pending
  await db.from('bn_payment_instruction').update({
    status: 'REISSUE_PENDING',
  }).eq('id', record.instruction_id);
}

async function stopIssue(record: IssueRecord, userCode: string, reason: string): Promise<void> {
  await db.from(record.target_table).update({
    status: 'STOPPED',
    stopped_by: userCode,
    stopped_date: new Date().toISOString(),
    stop_reason: reason,
  }).eq('cheque_number', record.cheque_number);

  await db.from('bn_issue_record').update({
    status: 'STOPPED',
    void_reason: reason,
    voided_by: userCode,
    voided_at: new Date().toISOString(),
  }).eq('id', record.id);
}

async function staleDateIssue(record: IssueRecord, userCode: string): Promise<void> {
  await db.from(record.target_table).update({
    status: 'STALE_DATED',
  }).eq('cheque_number', record.cheque_number);

  await db.from('bn_issue_record').update({ status: 'STALE_DATED' }).eq('id', record.id);
}

async function retryIssue(record: IssueRecord, userCode: string): Promise<void> {
  await db.from('bn_issue_record').update({
    status: 'PENDING',
    error_message: null,
  }).eq('id', record.id);
}

// ─── Cheque / DD Number Generation ──────────────────────────────────

async function generateChequeNumber(): Promise<string> {
  // Get next sequence from a counter or generate time-based
  const now = new Date();
  const seq = now.getTime().toString().slice(-8);
  return `CHQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;
}

async function generateDDReference(): Promise<string> {
  const now = new Date();
  const seq = now.getTime().toString().slice(-8);
  return `DD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;
}

// ─── Release Holding Payment ────────────────────────────────────────

export async function releaseHoldingPayment(issueId: string, userCode: string, reason?: string): Promise<void> {
  const record = await fetchIssueRecordDetail(issueId);
  if (record.target_table !== 'cl_cheques_holding') {
    throw new Error('Only holding payments can be released');
  }

  // Move from cl_cheques_holding to cl_cheques
  const { data: holdingRow, error: fErr } = await db
    .from('cl_cheques_holding')
    .select('*')
    .eq('cheque_number', record.cheque_number)
    .single();

  if (fErr) throw fErr;

  // Insert into cl_cheques
  const { cheque_number: _, hold_reason: __, hold_status: ___, ...chequeData } = holdingRow;
  chequeData.cheque_number = await generateChequeNumber();
  chequeData.status = 'ISSUED';
  chequeData.released_from_holding = true;
  chequeData.released_by = userCode;
  chequeData.released_date = new Date().toISOString();

  const { error: iErr } = await db.from('cl_cheques').insert(chequeData);
  if (iErr) throw iErr;

  // Mark holding record as released
  await db.from('cl_cheques_holding').update({
    hold_status: 'RELEASED',
    released_by: userCode,
    released_date: new Date().toISOString(),
  }).eq('cheque_number', record.cheque_number);

  // Update issue record
  await db.from('bn_issue_record').update({
    hold_released_at: new Date().toISOString(),
    hold_released_by: userCode,
    cheque_number: chequeData.cheque_number,
  }).eq('id', issueId);

  await logIssueEvent(record.batch_id, issueId, 'RELEASE_HOLD', userCode,
    reason || 'Holding payment released', { old_cheque: record.cheque_number, new_cheque: chequeData.cheque_number });
}

// ─── Audit ──────────────────────────────────────────────────────────

async function logIssueEvent(
  batchId: string,
  issueId: string | null,
  action: string,
  userCode: string,
  description: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await db.from('bn_claim_event').insert({
      entity_type: 'PAYMENT_ISSUE',
      entity_id: issueId || batchId,
      event_type: `ISSUE_${action}`,
      description,
      performed_by: userCode,
      metadata: { ...metadata, batch_id: batchId, issue_id: issueId },
    });
  } catch {
    console.error('Failed to log issue event');
  }
}
