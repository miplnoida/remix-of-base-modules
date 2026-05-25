/**
 * Legal Handoff Service
 *
 * - CRUD for Administration > Legal Handoff Rules (ce_legal_handoff_rules)
 * - Eligibility evaluation against a referral context
 * - Legal pack item checklist (ce_legal_pack_items) with required-item validation
 * - Approval bridge: resolves the central workflow mapping for
 *   `legal.escalation_approval` — never duplicates the workflow engine
 * - Manual / Integrated / Disabled integration modes
 * - Returned-from-Legal lifecycle (ce_legal_returns)
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveWorkflow, type ResolvedMapping } from '@/services/complianceWorkflowMappingService';

export type IntegrationMode = 'DISABLED' | 'MANUAL' | 'INTEGRATED';

export interface LegalHandoffRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  integration_mode: IntegrationMode;
  required_notice_count: number;
  days_after_final_notice: number;
  min_outstanding_amount: number;
  min_severity: string | null;
  require_repeat_default: boolean;
  require_arrangement_breach: boolean;
  required_evidence: string[];
  employer_response_window_days: number;
  applicable_funds: string[];
  applicable_violation_type_ids: string[];
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LegalPackItem {
  id: string;
  referral_id: string;
  item_key: string;
  item_label: string;
  is_required: boolean;
  is_satisfied: boolean;
  satisfied_by: string | null;
  satisfied_at: string | null;
  notes: string | null;
}

export interface LegalReturn {
  id: string;
  referral_id: string;
  returned_at: string;
  returned_by: string | null;
  reason: string;
  required_action: string | null;
  resolution_status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface EligibilityContext {
  fund?: string | null;
  severity?: string | null;
  outstandingAmount?: number;
  noticesSent?: number;
  daysSinceFinalNotice?: number;
  repeatDefault?: boolean;
  arrangementBreach?: boolean;
  evidenceTypes?: string[];
  daysSinceEmployerResponse?: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  matchedRule: LegalHandoffRule | null;
  missing: string[];
  integrationMode: IntegrationMode;
}

const RULES = 'ce_legal_handoff_rules' as never;
const PACK = 'ce_legal_pack_items' as never;
const RETURNS = 'ce_legal_returns' as never;

// ── Standard pack items ────────────────────────────────────────────────────
export const STANDARD_PACK_ITEMS: { key: string; label: string; required: boolean }[] = [
  { key: 'EMPLOYER_PROFILE', label: 'Employer profile', required: true },
  { key: 'CASE_SUMMARY', label: 'Case summary', required: true },
  { key: 'LINKED_VIOLATIONS', label: 'Linked violations', required: true },
  { key: 'NOTICES_ISSUED', label: 'Notices issued', required: true },
  { key: 'DELIVERY_PROOF', label: 'Delivery proof', required: true },
  { key: 'EMPLOYER_RESPONSES', label: 'Employer responses', required: false },
  { key: 'PAYMENT_HISTORY', label: 'Payment history', required: true },
  { key: 'ARRANGEMENT_BREACHES', label: 'Arrangement breaches', required: false },
  { key: 'INSPECTION_EVIDENCE', label: 'Inspection evidence', required: false },
  { key: 'OFFICER_RECOMMENDATION', label: 'Officer recommendation', required: true },
  { key: 'TIMELINE', label: 'Timeline of events', required: true },
  { key: 'SUPPORTING_DOCUMENTS', label: 'Supporting documents', required: false },
];

// ── Rule CRUD ──────────────────────────────────────────────────────────────
export async function listRules(): Promise<LegalHandoffRule[]> {
  const { data, error } = await (supabase.from(RULES) as any)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as LegalHandoffRule[];
}

export async function upsertRule(
  rule: Partial<LegalHandoffRule> & { code: string; name: string },
  userCode: string,
): Promise<void> {
  const payload: any = {
    code: rule.code,
    name: rule.name,
    description: rule.description ?? null,
    enabled: rule.enabled ?? true,
    integration_mode: rule.integration_mode ?? 'MANUAL',
    required_notice_count: rule.required_notice_count ?? 1,
    days_after_final_notice: rule.days_after_final_notice ?? 0,
    min_outstanding_amount: rule.min_outstanding_amount ?? 0,
    min_severity: rule.min_severity ?? null,
    require_repeat_default: rule.require_repeat_default ?? false,
    require_arrangement_breach: rule.require_arrangement_breach ?? false,
    required_evidence: rule.required_evidence ?? [],
    employer_response_window_days: rule.employer_response_window_days ?? 0,
    applicable_funds: rule.applicable_funds ?? [],
    applicable_violation_type_ids: rule.applicable_violation_type_ids ?? [],
    notes: rule.notes ?? null,
    sort_order: rule.sort_order ?? 0,
    updated_by: userCode,
    updated_at: new Date().toISOString(),
  };
  if (rule.id) {
    const { error } = await (supabase.from(RULES) as any).update(payload).eq('id', rule.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase.from(RULES) as any).insert({ ...payload, created_by: userCode });
    if (error) throw error;
  }
}

export async function toggleRule(id: string, enabled: boolean, userCode: string): Promise<void> {
  const { error } = await (supabase.from(RULES) as any)
    .update({ enabled, updated_by: userCode, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Eligibility ────────────────────────────────────────────────────────────
const SEVERITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function matches(rule: LegalHandoffRule, ctx: EligibilityContext): boolean {
  if (rule.applicable_funds.length && ctx.fund && !rule.applicable_funds.includes(ctx.fund)) return false;
  if (rule.min_severity && ctx.severity) {
    if ((SEVERITY_RANK[ctx.severity.toUpperCase()] || 0) < (SEVERITY_RANK[rule.min_severity.toUpperCase()] || 0)) return false;
  }
  return true;
}

export async function evaluateEligibility(ctx: EligibilityContext): Promise<EligibilityResult> {
  const rules = (await listRules()).filter((r) => r.enabled);
  const candidate = rules.find((r) => matches(r, ctx)) || rules.find((r) => r.code === 'DEFAULT') || null;
  if (!candidate) {
    return { eligible: false, matchedRule: null, missing: ['No matching legal handoff rule'], integrationMode: 'DISABLED' };
  }
  if (candidate.integration_mode === 'DISABLED') {
    return { eligible: false, matchedRule: candidate, missing: ['Legal handoff is disabled for this rule'], integrationMode: 'DISABLED' };
  }
  const missing: string[] = [];
  if ((ctx.noticesSent ?? 0) < candidate.required_notice_count)
    missing.push(`Notices issued (${ctx.noticesSent ?? 0}/${candidate.required_notice_count})`);
  if ((ctx.daysSinceFinalNotice ?? 0) < candidate.days_after_final_notice)
    missing.push(`Days since final notice (${ctx.daysSinceFinalNotice ?? 0}/${candidate.days_after_final_notice})`);
  if ((ctx.outstandingAmount ?? 0) < Number(candidate.min_outstanding_amount))
    missing.push(`Outstanding amount below threshold (${candidate.min_outstanding_amount})`);
  if (candidate.require_repeat_default && !ctx.repeatDefault) missing.push('Repeat-default flag required');
  if (candidate.require_arrangement_breach && !ctx.arrangementBreach) missing.push('Arrangement breach required');
  if (candidate.required_evidence.length) {
    const have = new Set(ctx.evidenceTypes || []);
    for (const e of candidate.required_evidence) {
      if (!have.has(e)) missing.push(`Required evidence: ${e}`);
    }
  }
  if (candidate.employer_response_window_days > 0) {
    if (
      ctx.daysSinceEmployerResponse == null ||
      ctx.daysSinceEmployerResponse < candidate.employer_response_window_days
    ) {
      missing.push(`Employer response window not elapsed (${candidate.employer_response_window_days} days)`);
    }
  }
  return {
    eligible: missing.length === 0,
    matchedRule: candidate,
    missing,
    integrationMode: candidate.integration_mode,
  };
}

// ── Pack items ─────────────────────────────────────────────────────────────
export async function ensurePackItems(referralId: string): Promise<LegalPackItem[]> {
  const { data: existing, error } = await (supabase.from(PACK) as any)
    .select('*')
    .eq('referral_id', referralId);
  if (error) throw error;
  const items = (existing || []) as LegalPackItem[];
  const have = new Set(items.map((i) => i.item_key));
  const toInsert = STANDARD_PACK_ITEMS.filter((s) => !have.has(s.key)).map((s) => ({
    referral_id: referralId,
    item_key: s.key,
    item_label: s.label,
    is_required: s.required,
    is_satisfied: false,
  }));
  if (toInsert.length) {
    const { data: inserted, error: ie } = await (supabase.from(PACK) as any).insert(toInsert).select();
    if (ie) throw ie;
    return [...items, ...((inserted || []) as LegalPackItem[])].sort((a, b) =>
      a.item_label.localeCompare(b.item_label),
    );
  }
  return items.sort((a, b) => a.item_label.localeCompare(b.item_label));
}

export async function setPackItem(
  itemId: string,
  satisfied: boolean,
  userCode: string,
  notes?: string,
): Promise<void> {
  const { error } = await (supabase.from(PACK) as any)
    .update({
      is_satisfied: satisfied,
      satisfied_by: satisfied ? userCode : null,
      satisfied_at: satisfied ? new Date().toISOString() : null,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);
  if (error) throw error;
}

export function validatePack(items: LegalPackItem[]): { complete: boolean; missing: LegalPackItem[] } {
  const missing = items.filter((i) => i.is_required && !i.is_satisfied);
  return { complete: missing.length === 0, missing };
}

// ── Workflow / approval bridge ─────────────────────────────────────────────
export async function resolveApprovalWorkflow(amount: number, fund?: string | null): Promise<ResolvedMapping> {
  return resolveWorkflow('legal.escalation_approval', { amount, fund });
}

// ── Returns from Legal ─────────────────────────────────────────────────────
export async function listReturns(filter?: { status?: string }): Promise<LegalReturn[]> {
  let q = (supabase.from(RETURNS) as any).select('*').order('returned_at', { ascending: false });
  if (filter?.status) q = q.eq('resolution_status', filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LegalReturn[];
}

export async function createReturn(
  referralId: string,
  reason: string,
  requiredAction: string | null,
  userCode: string,
): Promise<void> {
  const { error } = await (supabase.from(RETURNS) as any).insert({
    referral_id: referralId,
    returned_by: userCode,
    reason,
    required_action: requiredAction,
    resolution_status: 'OPEN',
  });
  if (error) throw error;
  // Move referral status back to DRAFT-style for re-work
  await (supabase.from('ce_legal_referrals' as never) as any)
    .update({ status: 'REJECTED', rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', referralId);
}

export async function resolveReturn(id: string, notes: string, userCode: string): Promise<void> {
  const { error } = await (supabase.from(RETURNS) as any)
    .update({
      resolution_status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      resolved_by: userCode,
      resolution_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
