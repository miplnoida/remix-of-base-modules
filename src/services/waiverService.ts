/**
 * Waiver Service
 *
 * Implements admin Waiver Rules + operational waiver request lifecycle.
 * Reuses the existing workflow mapping (event key `waiver.approval`) so
 * approval routing is centralised — no parallel workflow engine.
 *
 * Approved waivers update `ce_cases.amount_waived` (and never delete the
 * original amount). Every transition is appended to `ce_waiver_decisions`
 * for full audit traceability.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveWorkflow } from './complianceWorkflowMappingService';

// ---------- Types ----------
export type WaiverType = 'PENALTY' | 'INTEREST' | 'PRINCIPAL' | 'FULL' | 'PARTIAL';
export type WaiverStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED';
export type WaiverSource = 'CASE' | 'VIOLATION' | 'EMPLOYER_RESPONSE' | 'OFFICER';

export interface WaiverRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  waiver_type: WaiverType;
  max_percentage: number | null;
  amount_threshold: number | null;
  applicable_violation_type_ids: string[];
  applicable_funds: string[];
  valid_reasons: string[];
  required_documents: string[];
  approval_workflow_required: boolean;
  audit_required: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WaiverRequest {
  id: string;
  waiver_number: string;
  employer_id: string;
  case_id: string | null;
  violation_id: string | null;
  waiver_rule_id: string | null;
  waiver_type: WaiverType;
  status: WaiverStatus;
  source: WaiverSource | null;
  amount_requested: number | null;
  amount_approved: number | null;
  reason_code: string | null;
  justification: string;
  supporting_documents: Array<{ name: string; url?: string; doc_type?: string }>;
  requested_by: string | null;
  requested_at: string;
  reviewer_id: string | null;
  reviewer_decision: string | null;
  reviewer_comments: string | null;
  reviewed_at: string | null;
  approver_id: string | null;
  approver_decision: string | null;
  approver_comments: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  applied_at: string | null;
  workflow_definition_id: string | null;
  created_at: string;
  updated_at: string;
}

const RULES = 'ce_waiver_rules' as never;
const WAIVERS = 'ce_waivers' as never;
const DECISIONS = 'ce_waiver_decisions' as never;

// ---------- Rules CRUD ----------
export async function listWaiverRules(): Promise<WaiverRule[]> {
  const { data, error } = await (supabase.from(RULES) as any)
    .select('*')
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data || []) as WaiverRule[];
}

export async function upsertWaiverRule(
  r: Partial<WaiverRule>,
  userCode: string,
): Promise<void> {
  const payload: any = {
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    enabled: !!r.enabled,
    waiver_type: r.waiver_type,
    max_percentage: r.max_percentage ?? null,
    amount_threshold: r.amount_threshold ?? null,
    applicable_violation_type_ids: r.applicable_violation_type_ids ?? [],
    applicable_funds: r.applicable_funds ?? [],
    valid_reasons: r.valid_reasons ?? [],
    required_documents: r.required_documents ?? [],
    approval_workflow_required: r.approval_workflow_required ?? true,
    audit_required: r.audit_required ?? true,
    notes: r.notes ?? null,
    sort_order: r.sort_order ?? 0,
    updated_by: userCode,
    updated_at: new Date().toISOString(),
  };
  if (r.id) {
    const { error } = await (supabase.from(RULES) as any).update(payload).eq('id', r.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase.from(RULES) as any).insert({
      ...payload,
      created_by: userCode,
    });
    if (error) throw error;
  }
}

export async function toggleWaiverRule(id: string, enabled: boolean, userCode: string) {
  const { error } = await (supabase.from(RULES) as any)
    .update({ enabled, updated_by: userCode, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Helpers ----------
function newWaiverNumber(): string {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.floor(Math.random() * 900 + 100);
  return `WV-${ts}-${rnd}`;
}

async function appendDecision(args: {
  waiver_id: string;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  amount?: number | null;
  reason?: string | null;
  comments?: string | null;
  workflow_definition_id?: string | null;
  acted_by: string;
}) {
  const { error } = await (supabase.from(DECISIONS) as any).insert({
    waiver_id: args.waiver_id,
    action: args.action,
    from_status: args.from_status ?? null,
    to_status: args.to_status ?? null,
    amount: args.amount ?? null,
    reason: args.reason ?? null,
    comments: args.comments ?? null,
    workflow_definition_id: args.workflow_definition_id ?? null,
    acted_by: args.acted_by,
  });
  if (error) throw error;
}

export async function listWaiverRequests(filter: {
  status?: WaiverStatus | 'ALL';
  employerId?: string;
  caseId?: string;
} = {}): Promise<WaiverRequest[]> {
  let q: any = (supabase.from(WAIVERS) as any).select('*').order('requested_at', { ascending: false });
  if (filter.status && filter.status !== 'ALL') q = q.eq('status', filter.status);
  if (filter.employerId) q = q.eq('employer_id', filter.employerId);
  if (filter.caseId) q = q.eq('case_id', filter.caseId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as WaiverRequest[];
}

export async function getWaiverDecisions(waiverId: string) {
  const { data, error } = await (supabase.from(DECISIONS) as any)
    .select('*')
    .eq('waiver_id', waiverId)
    .order('acted_at');
  if (error) throw error;
  return data || [];
}

// ---------- Lifecycle ----------
export interface NewWaiverInput {
  employer_id: string;
  case_id?: string | null;
  violation_id?: string | null;
  waiver_rule_id?: string | null;
  waiver_type: WaiverType;
  source: WaiverSource;
  amount_requested: number;
  reason_code?: string | null;
  justification: string;
  supporting_documents?: Array<{ name: string; url?: string; doc_type?: string }>;
  fund?: string | null;
}

export async function requestWaiver(input: NewWaiverInput, userCode: string): Promise<string> {
  // Rule validation (if rule supplied)
  if (input.waiver_rule_id) {
    const { data: ruleRow, error: rErr } = await (supabase.from(RULES) as any)
      .select('*')
      .eq('id', input.waiver_rule_id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!ruleRow) throw new Error('Waiver rule not found');
    if (!ruleRow.enabled) throw new Error('Selected waiver rule is disabled');
    if (input.fund && Array.isArray(ruleRow.applicable_funds) && ruleRow.applicable_funds.length > 0
        && !ruleRow.applicable_funds.includes(input.fund)) {
      throw new Error(`Fund ${input.fund} is not eligible under rule ${ruleRow.code}`);
    }
    if (input.reason_code && Array.isArray(ruleRow.valid_reasons) && ruleRow.valid_reasons.length > 0
        && !ruleRow.valid_reasons.includes(input.reason_code)) {
      throw new Error(`Reason "${input.reason_code}" is not allowed under rule ${ruleRow.code}`);
    }
  }

  // Resolve workflow via existing mapping engine
  const mapping = await resolveWorkflow('waiver.approval', {
    fund: input.fund ?? null,
    amount: input.amount_requested,
  }).catch(() => null);

  const status: WaiverStatus = mapping?.enabled ? 'PENDING_APPROVAL' : 'PENDING';

  const insertPayload: any = {
    waiver_number: newWaiverNumber(),
    employer_id: input.employer_id,
    case_id: input.case_id ?? null,
    violation_id: input.violation_id ?? null,
    waiver_rule_id: input.waiver_rule_id ?? null,
    waiver_type: input.waiver_type,
    source: input.source,
    status,
    amount_requested: input.amount_requested,
    reason_code: input.reason_code ?? null,
    justification: input.justification,
    supporting_documents: input.supporting_documents ?? [],
    workflow_definition_id: mapping?.workflowDefinitionId ?? null,
    requested_by: userCode,
    created_by: userCode,
    updated_by: userCode,
  };
  const { data, error } = await (supabase.from(WAIVERS) as any)
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw error;
  const id = (data as any).id as string;
  await appendDecision({
    waiver_id: id,
    action: 'REQUESTED',
    from_status: null,
    to_status: status,
    amount: input.amount_requested,
    reason: input.reason_code,
    comments: input.justification,
    workflow_definition_id: mapping?.workflowDefinitionId ?? null,
    acted_by: userCode,
  });
  return id;
}

async function loadWaiver(id: string): Promise<WaiverRequest> {
  const { data, error } = await (supabase.from(WAIVERS) as any)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as WaiverRequest;
}

export async function approveWaiver(args: {
  waiverId: string;
  approvedAmount: number;
  comments?: string;
  userCode: string;
}) {
  const wv = await loadWaiver(args.waiverId);
  if (wv.status !== 'PENDING' && wv.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot approve waiver in status ${wv.status}`);
  }
  if (args.approvedAmount < 0) throw new Error('Approved amount must be ≥ 0');
  if (args.approvedAmount > Number(wv.amount_requested ?? 0)) {
    throw new Error('Approved amount cannot exceed requested amount');
  }
  // Rule cap
  if (wv.waiver_rule_id) {
    const { data: ruleRow } = await (supabase.from(RULES) as any)
      .select('max_percentage')
      .eq('id', wv.waiver_rule_id)
      .maybeSingle();
    if (ruleRow?.max_percentage != null && Number(wv.amount_requested ?? 0) > 0) {
      const cap = (Number(wv.amount_requested) * Number(ruleRow.max_percentage)) / 100;
      if (args.approvedAmount > cap) {
        throw new Error(`Approved amount exceeds rule cap (${ruleRow.max_percentage}% = ${cap.toFixed(2)})`);
      }
    }
  }

  const { error } = await (supabase.from(WAIVERS) as any)
    .update({
      status: 'APPROVED',
      amount_approved: args.approvedAmount,
      approver_id: args.userCode,
      approver_decision: 'APPROVED',
      approver_comments: args.comments ?? null,
      approved_at: new Date().toISOString(),
      updated_by: args.userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.waiverId);
  if (error) throw error;
  await appendDecision({
    waiver_id: args.waiverId,
    action: 'APPROVED',
    from_status: wv.status,
    to_status: 'APPROVED',
    amount: args.approvedAmount,
    comments: args.comments,
    acted_by: args.userCode,
  });

  // Apply waiver to case balance immediately (waived amount column,
  // never deletes original amount).
  await applyApprovedWaiver(args.waiverId, args.userCode);
}

export async function applyApprovedWaiver(waiverId: string, userCode: string) {
  const wv = await loadWaiver(waiverId);
  if (wv.status !== 'APPROVED') throw new Error('Only approved waivers can be applied');
  if (!wv.case_id) {
    // No case linked: just mark applied, ledger row captures the decision
    const { error } = await (supabase.from(WAIVERS) as any)
      .update({
        status: 'APPLIED',
        applied_at: new Date().toISOString(),
        updated_by: userCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', waiverId);
    if (error) throw error;
    await appendDecision({
      waiver_id: waiverId,
      action: 'APPLIED',
      from_status: 'APPROVED',
      to_status: 'APPLIED',
      amount: wv.amount_approved ?? 0,
      acted_by: userCode,
    });
    return;
  }
  // Read case, increment waived bucket; never reduce original totals.
  const { data: caseRow, error: cErr } = await (supabase.from('ce_cases') as any)
    .select('amount_waived')
    .eq('id', wv.case_id)
    .single();
  if (cErr) throw cErr;
  const current = Number((caseRow as any)?.amount_waived ?? 0);
  const newWaived = current + Number(wv.amount_approved ?? 0);
  const { error: uErr } = await (supabase.from('ce_cases') as any)
    .update({
      amount_waived: newWaived,
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wv.case_id);
  if (uErr) throw uErr;

  const { error: wErr } = await (supabase.from(WAIVERS) as any)
    .update({
      status: 'APPLIED',
      applied_at: new Date().toISOString(),
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', waiverId);
  if (wErr) throw wErr;
  await appendDecision({
    waiver_id: waiverId,
    action: 'APPLIED',
    from_status: 'APPROVED',
    to_status: 'APPLIED',
    amount: wv.amount_approved ?? 0,
    comments: `Updated case amount_waived from ${current} to ${newWaived}`,
    acted_by: userCode,
  });
}

export async function rejectWaiver(args: {
  waiverId: string;
  reason: string;
  comments?: string;
  userCode: string;
}) {
  const wv = await loadWaiver(args.waiverId);
  if (wv.status !== 'PENDING' && wv.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot reject waiver in status ${wv.status}`);
  }
  if (!args.reason?.trim()) throw new Error('Rejection reason required');
  const { error } = await (supabase.from(WAIVERS) as any)
    .update({
      status: 'REJECTED',
      rejected_reason: args.reason,
      approver_id: args.userCode,
      approver_decision: 'REJECTED',
      approver_comments: args.comments ?? null,
      approved_at: new Date().toISOString(),
      updated_by: args.userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.waiverId);
  if (error) throw error;
  await appendDecision({
    waiver_id: args.waiverId,
    action: 'REJECTED',
    from_status: wv.status,
    to_status: 'REJECTED',
    amount: 0,
    reason: args.reason,
    comments: args.comments,
    acted_by: args.userCode,
  });
}

export async function cancelWaiver(args: { waiverId: string; reason?: string; userCode: string }) {
  const wv = await loadWaiver(args.waiverId);
  if (!['PENDING', 'PENDING_APPROVAL'].includes(wv.status)) {
    throw new Error(`Cannot cancel waiver in status ${wv.status}`);
  }
  const { error } = await (supabase.from(WAIVERS) as any)
    .update({
      status: 'CANCELLED',
      updated_by: args.userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.waiverId);
  if (error) throw error;
  await appendDecision({
    waiver_id: args.waiverId,
    action: 'CANCELLED',
    from_status: wv.status,
    to_status: 'CANCELLED',
    reason: args.reason,
    acted_by: args.userCode,
  });
}
