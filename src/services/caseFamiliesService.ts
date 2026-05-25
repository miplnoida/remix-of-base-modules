/**
 * Case Families service — configuration & violation-to-case grouping.
 *
 * All UI access goes through `PermissionWrapper` / `PermissionButton` with the
 * existing `manage_compliance` permission key (per project rule, no parallel
 * permission model).
 */
import { supabase } from '@/integrations/supabase/client';

export interface GroupingRule {
  sameEmployer: boolean;
  sameFund: boolean;
  sameContributionPeriod: boolean;
  sameViolationType: boolean;
  sameCaseFamily: boolean;
  openCaseOnly: boolean;
  dateRangeDays: number;
  maxOpenCaseAgeDays: number;
}

export interface CaseFamily {
  id: string;
  code: string;
  name: string;
  description: string | null;
  violation_categories: string[];
  allowed_violation_type_ids: string[];
  grouping_rule: GroupingRule;
  default_severity: string;
  default_workflow_id: string | null;
  default_officer_queue_id: string | null;
  default_notice_sequence_id: string | null;
  auto_create_case: boolean;
  merge_allowed: boolean;
  reopen_allowed: boolean;
  legal_eligible: boolean;
  manual_intake_on_no_match: boolean;
  is_active: boolean;
  sort_order: number;
  escalation_threshold_days: number | null;
  escalation_threshold_amount: number | null;
  reopen_window_days: number | null;
}

export const DEFAULT_GROUPING_RULE: GroupingRule = {
  sameEmployer: true,
  sameFund: false,
  sameContributionPeriod: false,
  sameViolationType: false,
  sameCaseFamily: true,
  openCaseOnly: true,
  dateRangeDays: 0,
  maxOpenCaseAgeDays: 0,
};

export async function listCaseFamilies(): Promise<CaseFamily[]> {
  const { data, error } = await supabase
    .from('ce_case_families')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getCaseFamily(id: string): Promise<CaseFamily | null> {
  const { data, error } = await supabase
    .from('ce_case_families')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

function normalize(row: any): CaseFamily {
  return {
    ...row,
    violation_categories: row.violation_categories ?? [],
    allowed_violation_type_ids: row.allowed_violation_type_ids ?? [],
    grouping_rule: { ...DEFAULT_GROUPING_RULE, ...(row.grouping_rule ?? {}) },
  } as CaseFamily;
}

export async function upsertCaseFamily(
  family: Partial<CaseFamily> & { code: string; name: string },
  userCode: string,
): Promise<CaseFamily> {
  const payload: any = {
    code: family.code,
    name: family.name,
    description: family.description ?? null,
    violation_categories: family.violation_categories ?? [],
    allowed_violation_type_ids: family.allowed_violation_type_ids ?? [],
    grouping_rule: family.grouping_rule ?? DEFAULT_GROUPING_RULE,
    default_severity: family.default_severity ?? 'Medium',
    default_workflow_id: family.default_workflow_id ?? null,
    default_officer_queue_id: family.default_officer_queue_id ?? null,
    default_notice_sequence_id: family.default_notice_sequence_id ?? null,
    auto_create_case: family.auto_create_case ?? true,
    merge_allowed: family.merge_allowed ?? true,
    reopen_allowed: family.reopen_allowed ?? true,
    legal_eligible: family.legal_eligible ?? false,
    manual_intake_on_no_match: family.manual_intake_on_no_match ?? true,
    is_active: family.is_active ?? true,
    sort_order: family.sort_order ?? 0,
    escalation_threshold_days: family.escalation_threshold_days ?? 90,
    escalation_threshold_amount: family.escalation_threshold_amount ?? 50000,
    reopen_window_days: family.reopen_window_days ?? 30,
    updated_by: userCode,
    updated_at: new Date().toISOString(),
  };
  if (family.id) {
    const { data, error } = await supabase
      .from('ce_case_families')
      .update(payload)
      .eq('id', family.id)
      .select('*')
      .single();
    if (error) throw error;
    return normalize(data);
  }
  payload.created_by = userCode;
  const { data, error } = await supabase
    .from('ce_case_families')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function toggleCaseFamilyActive(id: string, active: boolean, userCode: string) {
  const { error } = await supabase
    .from('ce_case_families')
    .update({ is_active: active, updated_by: userCode, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ────────────────────────────────────────────────────────────────────
// Grouping decision
// ────────────────────────────────────────────────────────────────────

export type GroupingDecisionType =
  | 'ATTACH_EXISTING'
  | 'CREATE_NEW'
  | 'SEND_TO_INTAKE'
  | 'MANUAL_OVERRIDE';

export interface GroupingDecision {
  decision: GroupingDecisionType;
  caseFamilyId: string | null;
  caseFamilyCode: string | null;
  targetCaseId: string | null;
  candidateCaseIds: string[];
  matched: Record<string, any>;
  reason: string;
}

export async function decideGrouping(violationId: string): Promise<GroupingDecision> {
  const { data, error } = await supabase.rpc(
    'fn_ce_decide_violation_grouping' as any,
    { p_violation_id: violationId },
  );
  if (error) throw error;
  const raw = (data ?? {}) as any;
  return {
    decision: (raw.decision ?? 'SEND_TO_INTAKE') as GroupingDecisionType,
    caseFamilyId: raw.caseFamilyId ?? null,
    caseFamilyCode: raw.caseFamilyCode ?? null,
    targetCaseId: raw.targetCaseId ?? null,
    candidateCaseIds: raw.candidateCaseIds ?? [],
    matched: raw.matched ?? {},
    reason: raw.reason ?? '',
  };
}

export interface RecordDecisionArgs {
  violationId: string;
  decision: GroupingDecisionType;
  caseFamilyId?: string | null;
  targetCaseId?: string | null;
  candidateCaseIds?: string[];
  matched?: Record<string, any>;
  reason?: string;
  isOverride?: boolean;
  overrideOf?: string | null;
  decidedBy: string;
}

export async function recordGroupingDecision(args: RecordDecisionArgs): Promise<string> {
  const { data, error } = await supabase
    .from('ce_violation_grouping_decisions')
    .insert({
      violation_id: args.violationId,
      decision: args.decision,
      case_family_id: args.caseFamilyId ?? null,
      target_case_id: args.targetCaseId ?? null,
      candidate_case_ids: args.candidateCaseIds ?? [],
      matched_criteria: args.matched ?? {},
      reason: args.reason ?? null,
      is_override: args.isOverride ?? false,
      override_of: args.overrideOf ?? null,
      decided_by: args.decidedBy,
    } as any)
    .select('id')
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function listGroupingDecisions(violationId: string) {
  const { data, error } = await supabase
    .from('ce_violation_grouping_decisions')
    .select('*')
    .eq('violation_id', violationId)
    .order('decided_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Apply a grouping decision: create a new case OR attach to an existing one,
 * then record the decision and update the violation.
 *
 * Returns the resulting case id (or null if sent to intake).
 */
export async function applyGroupingDecision(
  args: {
    violationId: string;
    decision: GroupingDecisionType;
    caseFamilyId: string | null;
    targetCaseId?: string | null;
    candidateCaseIds?: string[];
    matched?: Record<string, any>;
    reason?: string;
    isOverride?: boolean;
    decidedBy: string;
  },
): Promise<string | null> {
  let resolvedCaseId: string | null = args.targetCaseId ?? null;

  if (args.decision === 'CREATE_NEW' && args.caseFamilyId) {
    // Load violation + family to derive case header
    const [{ data: v }, { data: f }] = await Promise.all([
      supabase
        .from('ce_violations')
        .select('employer_id, employer_name, fund_type, territory, priority, summary')
        .eq('id', args.violationId)
        .maybeSingle(),
      supabase
        .from('ce_case_families')
        .select('code, name, default_severity, default_officer_queue_id')
        .eq('id', args.caseFamilyId)
        .maybeSingle(),
    ]);
    if (!v) throw new Error('Violation not found');

    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 900000 + 100000,
    )}`;
    const { data: created, error: createErr } = await supabase
      .from('ce_cases')
      .insert({
        case_number: caseNumber,
        employer_id: (v as any).employer_id,
        employer_name: (v as any).employer_name,
        territory: (v as any).territory,
        fund_type: (v as any).fund_type,
        case_family_id: args.caseFamilyId,
        case_family: (f as any)?.code ?? null,
        case_type: (f as any)?.name ?? null,
        priority: (f as any)?.default_severity ?? (v as any).priority ?? 'Medium',
        summary: (v as any).summary ?? null,
        status: 'OPEN',
        created_by: args.decidedBy,
        updated_by: args.decidedBy,
      } as any)
      .select('id')
      .single();
    if (createErr) throw createErr;
    resolvedCaseId = (created as any).id;
  }

  if (resolvedCaseId && (args.decision === 'CREATE_NEW' || args.decision === 'ATTACH_EXISTING' || args.decision === 'MANUAL_OVERRIDE')) {
    const { error: linkErr } = await supabase
      .from('ce_violations')
      .update({
        case_id: resolvedCaseId,
        case_family: args.matched?.caseFamilyCode ?? null,
        updated_by: args.decidedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', args.violationId);
    if (linkErr) throw linkErr;
  }

  await recordGroupingDecision({
    violationId: args.violationId,
    decision: args.decision,
    caseFamilyId: args.caseFamilyId,
    targetCaseId: resolvedCaseId,
    candidateCaseIds: args.candidateCaseIds,
    matched: args.matched,
    reason: args.reason,
    isOverride: args.isOverride,
    decidedBy: args.decidedBy,
  });

  return resolvedCaseId;
}
