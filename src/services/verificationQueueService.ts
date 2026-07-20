/**
 * Verification Queue & Duplicate Review service
 * -----------------------------------------------
 * All decisions are recorded into ce_violation_history for audit.
 * Permission enforcement is done by the calling UI (PermissionWrapper /
 * PermissionButton with the existing `manage_compliance` permission key).
 */
import { supabase } from '@/integrations/supabase/client';
import { isComplianceDbFlagEnabled } from '@/lib/compliance/featureToggles';

const VERIFICATION_QUEUE_FLAG = 'compliance.core.verification_queue';
function assertVerificationQueueEnabled() {
  if (!isComplianceDbFlagEnabled(VERIFICATION_QUEUE_FLAG)) {
    throw new Error('Verification Queue is disabled in Setup → Feature Toggles.');
  }
}

export interface VerificationSettings {
  enabled: boolean;
  disabledFallback: 'CONFIRM' | 'CASE_INTAKE';
  matchFields: string[];
  windowDays: number;
  openCaseBlocks: boolean;
}

export interface VerificationRow {
  id: string;
  violation_number: string;
  employer_id: string | null;
  employer_name: string | null;
  fund_type: string | null;
  period_from: string | null;
  period_to: string | null;
  source_type: string | null;
  source_rule_id: string | null;
  violation_type_id: string | null;
  violation_type_code?: string | null;
  violation_type_name?: string | null;
  priority: string | null;
  status: string;
  principal_amount: number | null;
  penalty_amount: number | null;
  interest_amount: number | null;
  total_amount: number | null;
  summary: string;
  description: string | null;
  discovered_date: string;
  discovered_by: string | null;
  created_at: string;
  duplicate_of_id: string | null;
  case_id: string | null;
}

const DEFAULTS: VerificationSettings = {
  enabled: true,
  disabledFallback: 'CONFIRM',
  matchFields: ['employer', 'fund', 'period', 'violation_type', 'source_rule'],
  windowDays: 90,
  openCaseBlocks: true,
};

const KEYS = {
  enabled: 'compliance.verification_queue.enabled',
  fallback: 'compliance.verification_queue.disabled_fallback',
  match: 'compliance.duplicate_detection.match_fields',
  window: 'compliance.duplicate_detection.window_days',
  openCase: 'compliance.duplicate_detection.open_case_blocks',
};

export async function getVerificationSettings(): Promise<VerificationSettings> {
  const { data, error } = await supabase
    .from('ce_settings')
    .select('setting_key, setting_value')
    .in('setting_key', Object.values(KEYS));
  if (error) return DEFAULTS;
  const map = new Map((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  return {
    enabled: (map.get(KEYS.enabled) ?? 'true').toLowerCase() === 'true',
    disabledFallback: ((map.get(KEYS.fallback) as any) === 'CASE_INTAKE' ? 'CASE_INTAKE' : 'CONFIRM'),
    matchFields: (map.get(KEYS.match) ?? DEFAULTS.matchFields.join(','))
      .split(',').map((s: string) => s.trim()).filter(Boolean),
    windowDays: Number(map.get(KEYS.window) ?? DEFAULTS.windowDays) || DEFAULTS.windowDays,
    openCaseBlocks: (map.get(KEYS.openCase) ?? 'true').toLowerCase() === 'true',
  };
}

const SELECT_COLS = `
  id, violation_number, employer_id, employer_name, fund_type,
  period_from, period_to, source_type, source_rule_id, violation_type_id,
  priority, status, principal_amount, penalty_amount, interest_amount,
  total_amount, summary, description, discovered_date, discovered_by,
  created_at, duplicate_of_id, case_id,
  ce_violation_types(code, name)
`;

function mapRow(r: any): VerificationRow {
  return {
    ...r,
    violation_type_code: r?.ce_violation_types?.code ?? null,
    violation_type_name: r?.ce_violation_types?.name ?? null,
  };
}

export interface VerificationFilters {
  search?: string;
  employerId?: string;
  fund?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

export async function listVerificationQueue(filters: VerificationFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  let query = supabase
    .from('ce_violations')
    .select(SELECT_COLS, { count: 'exact' })
    .eq('is_deleted', false)
    .eq('status', 'UNDER_REVIEW')
    .is('duplicate_of_id', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.employerId) query = query.eq('employer_id', filters.employerId);
  if (filters.fund && filters.fund !== 'ALL') query = query.eq('fund_type', filters.fund);
  if (filters.priority && filters.priority !== 'ALL') query = query.eq('priority', filters.priority);
  if (filters.search) {
    const v = filters.search.trim();
    query = query.or(
      `violation_number.ilike.%${v}%,employer_name.ilike.%${v}%,employer_id.ilike.%${v}%,summary.ilike.%${v}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []).map(mapRow),
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

export async function getViolationById(id: string): Promise<VerificationRow | null> {
  const { data, error } = await supabase
    .from('ce_violations')
    .select(SELECT_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

/**
 * Detect possible duplicates for the given violation, respecting configured
 * match_fields and duplicate window. Does not include the violation itself or
 * any already-resolved/closed/cancelled rows.
 */
export async function findPossibleDuplicates(
  v: VerificationRow,
  settings?: VerificationSettings,
): Promise<VerificationRow[]> {
  const s = settings ?? (await getVerificationSettings());
  const windowMs = s.windowDays * 24 * 60 * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  let query = supabase
    .from('ce_violations')
    .select(SELECT_COLS)
    .eq('is_deleted', false)
    .neq('id', v.id)
    .in('status', ['OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'ESCALATED'])
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(50);

  if (s.matchFields.includes('employer') && v.employer_id) {
    query = query.eq('employer_id', v.employer_id);
  }
  if (s.matchFields.includes('fund') && v.fund_type) {
    query = query.eq('fund_type', v.fund_type);
  }
  if (s.matchFields.includes('violation_type') && v.violation_type_id) {
    query = query.eq('violation_type_id', v.violation_type_id);
  }
  if (s.matchFields.includes('source_rule') && v.source_rule_id) {
    query = query.eq('source_rule_id', v.source_rule_id);
  }
  if (s.matchFields.includes('period') && v.period_from) {
    query = query.eq('period_from', v.period_from);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** List violations that have at least one possible duplicate within the window. */
export async function listDuplicateCandidates(limit = 200) {
  const settings = await getVerificationSettings();
  const windowStart = new Date(Date.now() - settings.windowDays * 86400000).toISOString();

  const { data, error } = await supabase
    .from('ce_violations')
    .select(SELECT_COLS)
    .eq('is_deleted', false)
    .in('status', ['OPEN', 'UNDER_REVIEW'])
    .is('duplicate_of_id', null)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).map(mapRow);

  // Group by canonical match key
  const buckets = new Map<string, VerificationRow[]>();
  for (const r of rows) {
    const key = settings.matchFields
      .map((f) => {
        switch (f) {
          case 'employer': return r.employer_id ?? '';
          case 'fund': return r.fund_type ?? '';
          case 'violation_type': return r.violation_type_id ?? '';
          case 'source_rule': return r.source_rule_id ?? '';
          case 'period': return r.period_from ?? '';
          default: return '';
        }
      })
      .join('|');
    if (!key.replace(/\|/g, '')) continue;
    const list = buckets.get(key) ?? [];
    list.push(r);
    buckets.set(key, list);
  }
  return Array.from(buckets.values()).filter((b) => b.length > 1);
}

async function writeHistory(violationId: string, action: string, fromValue: string, toValue: string, performedBy: string, notes: string) {
  await supabase.from('ce_violation_history').insert({
    violation_id: violationId,
    action,
    from_value: fromValue,
    to_value: toValue,
    notes: notes || null,
    performed_by: performedBy,
    performed_at: new Date().toISOString(),
  } as any);
}

export async function confirmViolation(violationId: string, performedBy: string, notes: string) {
  assertVerificationQueueEnabled();
  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'OPEN',
      verification_decision: 'CONFIRMED',
      verification_reviewed_by: performedBy,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes || null,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (error) throw error;
  await writeHistory(violationId, 'Verification Confirmed', 'UNDER_REVIEW', 'OPEN', performedBy, notes);

  // Auto-resolve grouping (attach/create/send-to-intake) per case family config
  try {
    const { decideGrouping, applyGroupingDecision } = await import('./caseFamiliesService');
    const decision = await decideGrouping(violationId);
    await applyGroupingDecision({
      violationId,
      decision: decision.decision,
      caseFamilyId: decision.caseFamilyId,
      targetCaseId: decision.targetCaseId,
      candidateCaseIds: decision.candidateCaseIds,
      matched: decision.matched,
      reason: decision.reason,
      decidedBy: performedBy,
    });
  } catch (err) {
    // Non-blocking: confirmation succeeds even if grouping fails (logged for ops)
    // eslint-disable-next-line no-console
    console.error('[grouping] failed for violation', violationId, err);
  }
}

export async function rejectViolation(violationId: string, performedBy: string, notes: string) {
  assertVerificationQueueEnabled();
  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'CANCELLED',
      verification_decision: 'REJECTED',
      verification_reviewed_by: performedBy,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes || null,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (error) throw error;
  await writeHistory(violationId, 'Verification Rejected', 'UNDER_REVIEW', 'CANCELLED', performedBy, notes);
}

export async function markAsDuplicate(violationId: string, masterId: string, performedBy: string, notes: string) {
  assertVerificationQueueEnabled();
  if (violationId === masterId) throw new Error('Cannot mark a violation as a duplicate of itself');
  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'CANCELLED',
      verification_decision: 'DUPLICATE',
      verification_reviewed_by: performedBy,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes || null,
      duplicate_of_id: masterId,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (error) throw error;
  await writeHistory(violationId, 'Marked as Duplicate', 'UNDER_REVIEW', masterId, performedBy, notes);
}

/**
 * Send a possible violation back to the originator/officer for correction.
 * Moves it out of the verification queue (status → DRAFT) with a decision flag
 * so the officer sees why it was returned. Fully reversible: officer can
 * resubmit which flips the row back to UNDER_REVIEW.
 */
export async function sendBackViolation(violationId: string, performedBy: string, notes: string) {
  assertVerificationQueueEnabled();
  if (!notes || !notes.trim()) throw new Error('Decision notes are required to send back');
  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'DRAFT',
      verification_decision: 'SENT_BACK',
      verification_reviewed_by: performedBy,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (error) throw error;
  await writeHistory(violationId, 'Sent Back for Correction', 'UNDER_REVIEW', 'DRAFT', performedBy, notes);
}

/**
 * Merge the current violation INTO a target violation. Unlike "Mark duplicate"
 * (which only flags the row), Merge sums principal/penalty/interest/total into
 * the target, cancels the current row, and records duplicate_of_id.
 */
export async function mergeViolation(violationId: string, targetId: string, performedBy: string, notes: string) {
  assertVerificationQueueEnabled();
  if (!violationId || !targetId) throw new Error('Source and target violation are required');
  if (violationId === targetId) throw new Error('Cannot merge a violation into itself');
  if (!notes || !notes.trim()) throw new Error('Decision notes are required to merge');

  const { data: src, error: srcErr } = await supabase
    .from('ce_violations')
    .select('id, principal_amount, penalty_amount, interest_amount, total_amount, status')
    .eq('id', violationId)
    .maybeSingle();
  if (srcErr) throw srcErr;
  if (!src) throw new Error('Source violation not found');

  const { data: tgt, error: tgtErr } = await supabase
    .from('ce_violations')
    .select('id, principal_amount, penalty_amount, interest_amount, total_amount, status')
    .eq('id', targetId)
    .maybeSingle();
  if (tgtErr) throw tgtErr;
  if (!tgt) throw new Error('Target violation not found');
  if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes((tgt as any).status)) {
    throw new Error('Target violation is not open for merge');
  }

  const add = (a: any, b: any) => Number(a ?? 0) + Number(b ?? 0);
  const merged = {
    principal_amount: add(tgt.principal_amount, src.principal_amount),
    penalty_amount: add(tgt.penalty_amount, src.penalty_amount),
    interest_amount: add(tgt.interest_amount, src.interest_amount),
    total_amount: add(tgt.total_amount, src.total_amount),
    updated_by: performedBy,
    updated_at: new Date().toISOString(),
  };

  const { error: updTgtErr } = await supabase
    .from('ce_violations')
    .update(merged)
    .eq('id', targetId);
  if (updTgtErr) throw updTgtErr;

  const { error: updSrcErr } = await supabase
    .from('ce_violations')
    .update({
      status: 'CANCELLED',
      verification_decision: 'MERGED',
      verification_reviewed_by: performedBy,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes,
      duplicate_of_id: targetId,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (updSrcErr) throw updSrcErr;

  await writeHistory(violationId, 'Merged Into Violation', 'UNDER_REVIEW', targetId, performedBy, notes);
  await writeHistory(targetId, 'Received Merge From Violation', '', violationId, performedBy, notes);

export async function linkToExistingCase(violationId: string, caseId: string, performedBy: string, notes: string) {
  const { error } = await supabase
    .from('ce_violations')
    .update({
      case_id: caseId,
      updated_by: performedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', violationId);
  if (error) throw error;
  await writeHistory(violationId, 'Linked to Case', '', caseId, performedBy, notes);
}
