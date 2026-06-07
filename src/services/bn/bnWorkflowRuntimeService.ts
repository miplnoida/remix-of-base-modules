/**
 * BN Workflow Runtime Service (Phase 3)
 * ------------------------------------------------------------------
 * The single source of truth at runtime for "what can I do on this
 * claim right now". Reads transitions from the central configuration
 * table `bn_claim_transition_rule` (seeded in Phase 2) and mirrors
 * every executed action into `workflow_instances` + `workflow_logs`
 * so BN claims appear under Administration → Workflows.
 *
 * It deliberately does NOT replace `executeClaimAction` — it wraps
 * around it so existing UI continues to work while the central engine
 * becomes the system of record.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const BN_WORKFLOW_NAME = 'BN — Benefit Claim Lifecycle';

export interface RuntimeTransition {
  id: string;
  action: string;
  label: string;
  fromStatus: string;
  toStatus: string;
  allowedRoles: string[];
  requiresNarrative: boolean;
  requiresReason: boolean;
  requiresEvidenceComplete: boolean;
  requiresEligibilityPass: boolean;
  requiresCalculation: boolean;
  sortOrder: number;
  source: 'db' | 'fallback';
}

export interface WorkflowBlocker {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

// ─── Available actions ──────────────────────────────────────────────

export async function getAvailableActions(
  currentStatus: string,
  userRoles: string[] = [],
  opts: { productCategory?: string; countryCode?: string } = {},
): Promise<RuntimeTransition[]> {
  let query = db
    .from('bn_claim_transition_rule')
    .select('*')
    .eq('from_status', currentStatus)
    .eq('is_active', true)
    .order('sort_order');

  if (opts.productCategory) {
    query = query.or(`product_category.is.null,product_category.eq.${opts.productCategory}`);
  }
  if (opts.countryCode) {
    query = query.or(`country_code.is.null,country_code.eq.${opts.countryCode}`);
  }

  const { data, error } = await query;
  if (error) {
    // Fall back to in-code matrix
    const { getAvailableTransitions } = await import('./claimWorkbenchService');
    return getAvailableTransitions(currentStatus, userRoles).map((t) => ({
      id: `code-${t.action}-${t.toStatus}`,
      action: t.action,
      label: t.label,
      fromStatus: currentStatus,
      toStatus: t.toStatus,
      allowedRoles: t.requiredRoles,
      requiresNarrative: t.requiresNarrative,
      requiresReason: t.requiresReasonCode,
      requiresEvidenceComplete: false,
      requiresEligibilityPass: false,
      requiresCalculation: false,
      sortOrder: 999,
      source: 'fallback' as const,
    }));
  }

  const rows = (data || []) as any[];
  return rows
    .filter((r) => {
      if (!userRoles || userRoles.length === 0) return true;
      const allowed: string[] = r.allowed_roles || [];
      if (allowed.length === 0) return true;
      return allowed.some((role) => userRoles.includes(role));
    })
    .map((r) => ({
      id: r.id,
      action: r.action_code,
      label: r.action_label,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      allowedRoles: r.allowed_roles || [],
      requiresNarrative: !!r.requires_narrative,
      requiresReason: !!r.requires_reason,
      requiresEvidenceComplete: !!r.requires_evidence_complete,
      requiresEligibilityPass: !!r.requires_eligibility_pass,
      requiresCalculation: !!r.requires_calculation,
      sortOrder: r.sort_order ?? 0,
      source: 'db' as const,
    }));
}

// ─── Workflow blockers (what's preventing progression) ──────────────

export async function getWorkflowBlockers(claimId: string): Promise<WorkflowBlocker[]> {
  const blockers: WorkflowBlocker[] = [];

  const [{ data: elig }, { data: calc }, { data: evidence }] = await Promise.all([
    db.from('bn_claim_eligibility').select('id, overall_result').eq('claim_id', claimId).order('created_at', { ascending: false }).limit(1),
    db.from('bn_claim_calculation').select('id').eq('claim_id', claimId).limit(1),
    db.from('bn_evidence_checklist').select('id, status, is_blocking').eq('claim_id', claimId),
  ]);

  if (!elig || elig.length === 0) {
    blockers.push({
      code: 'NO_ELIGIBILITY',
      message: 'Eligibility has not been evaluated yet.',
      severity: 'warning',
    });
  } else if (elig[0].overall_result === false) {
    blockers.push({
      code: 'ELIGIBILITY_FAIL',
      message: 'Eligibility check failed. Approved override required to progress.',
      severity: 'error',
    });
  }

  if (!calc || calc.length === 0) {
    blockers.push({
      code: 'NO_CALCULATION',
      message: 'Calculation has not been run.',
      severity: 'warning',
    });
  }

  const unverifiedBlocking = (evidence || []).filter((e: any) =>
    e.is_blocking && !['VERIFIED', 'WAIVED'].includes((e.status || '').toUpperCase()),
  );
  if (unverifiedBlocking.length > 0) {
    blockers.push({
      code: 'EVIDENCE_OUTSTANDING',
      message: `${unverifiedBlocking.length} mandatory document(s) outstanding.`,
      severity: 'error',
    });
  }

  return blockers;
}

// ─── Mirror to central workflow engine ──────────────────────────────

/**
 * Ensures a `workflow_instances` row exists for the claim and appends
 * a `workflow_logs` entry for the executed action. Safe to call after
 * every successful BN claim action; failures are swallowed so the
 * caller never aborts a successful business transaction.
 */
export async function mirrorClaimActionToCentralEngine(params: {
  claimId: string;
  claimNumber?: string | null;
  ssn?: string | null;
  action: string;
  fromStatus: string;
  toStatus: string;
  userCode: string;
  userName?: string;
  narrative?: string | null;
}): Promise<{ instanceId: string | null }> {
  try {
    const { data: def } = await db
      .from('workflow_definitions')
      .select('id, name')
      .eq('name', BN_WORKFLOW_NAME)
      .maybeSingle();

    if (!def?.id) return { instanceId: null };

    // Reuse instance keyed by source_record_id == claimId
    let instanceId: string | null = null;
    const { data: existing } = await db
      .from('workflow_instances')
      .select('id')
      .eq('workflow_id', def.id)
      .eq('source_record_id', params.claimId)
      .maybeSingle();

    if (existing?.id) {
      instanceId = existing.id;
      await db
        .from('workflow_instances')
        .update({
          status: terminalStatusFor(params.toStatus),
          completed_at: isTerminal(params.toStatus) ? new Date().toISOString() : null,
        })
        .eq('id', instanceId);
    } else {
      const { data: created, error: insErr } = await db
        .from('workflow_instances')
        .insert({
          workflow_id: def.id,
          workflow_name: BN_WORKFLOW_NAME,
          source_module: 'bn_claim',
          source_record_id: params.claimId,
          source_record_name: params.claimNumber || params.ssn || params.claimId,
          status: 'InProgress',
          started_by_name: params.userName || params.userCode,
          primary_table: 'bn_claim',
          primary_key_column: 'id',
          primary_key_value: params.claimId,
          business_key_column: 'claim_number',
          business_key_value: params.claimNumber || null,
          metadata: { from: params.fromStatus, to: params.toStatus, action: params.action },
        })
        .select('id')
        .single();
      if (insErr) return { instanceId: null };
      instanceId = created.id;
    }

    if (instanceId) {
      await db.from('workflow_logs').insert({
        instance_id: instanceId,
        action: params.action,
        old_status: params.fromStatus,
        new_status: params.toStatus,
        user_name: params.userName || params.userCode,
        comments: params.narrative || null,
        metadata: { source: 'bn_runtime' },
      });
    }

    return { instanceId };
  } catch {
    return { instanceId: null };
  }
}

const TERMINAL_STATUSES = new Set(['CLOSED', 'DENIED', 'WITHDRAWN']);
function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has((status || '').toUpperCase());
}
function terminalStatusFor(status: string): 'Completed' | 'InProgress' {
  return isTerminal(status) ? 'Completed' : 'InProgress';
}
