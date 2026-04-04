/**
 * Claim Workbench Service — Extended claim operations for the full workbench
 * 
 * Sources:
 *   - bn_claim (claim header orchestration)
 *   - bn_claim_detail (JSONB benefit-specific data — future: cl_detail_*)
 *   - bn_claim_evidence (documents/evidence)
 *   - bn_claim_event (timeline / status history)
 *   - bn_claim_note (notes/worklog)
 *   - bn_claim_decision (decision records)
 *   - ip_master via personAdapter (contributor)
 *   - er_master via employerAdapter (employer)
 * 
 * Future integration:
 *   - cl_head (legacy claim header) — every bn_claim maps to cl_head.claim_no
 *   - cl_detail_* (typed benefit-specific tables) — currently bn_claim_detail.detail_json
 *   - bn_claim_status_history (formal status audit trail)
 * 
 * OUTBOUND PAYMENTS: cl_cheques only. cn_payment* NEVER used.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─── Linked Claims ─────────────────────────────────────────────────
export interface LinkedClaim {
  id: string;
  claim_number: string | null;
  ssn: string;
  status: string;
  claim_date: string;
  benefit_type: string;
  relationship: 'PARENT' | 'CHILD' | 'SIBLING' | 'CONTINUATION';
}

export async function fetchLinkedClaims(claimId: string, ssn: string, claimNumber?: string): Promise<LinkedClaim[]> {
  // Find claims with same SSN (siblings/continuations)
  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_number, ssn, status, claim_date, legacy_benefit_type, bn_product(benefit_name, category)')
    .eq('ssn', ssn)
    .neq('id', claimId)
    .order('claim_date', { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((c: any) => ({
    id: c.id,
    claim_number: c.claim_number,
    ssn: c.ssn,
    status: c.status,
    claim_date: c.claim_date,
    benefit_type: c.bn_product?.benefit_name || c.legacy_benefit_type || 'Unknown',
    relationship: 'SIBLING' as const,
  }));
}

// ─── Status History ────────────────────────────────────────────────
export interface ClaimStatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  event_type: string;
  notes: string | null;
  performed_by: string;
  performed_at: string;
}

export async function fetchClaimStatusHistory(claimId: string): Promise<ClaimStatusHistoryEntry[]> {
  // Use bn_claim_event with status transitions, future: bn_claim_status_history
  const { data, error } = await db
    .from('bn_claim_event')
    .select('*')
    .eq('claim_id', claimId)
    .not('to_status', 'is', null)
    .order('performed_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    id: e.id,
    from_status: e.from_status,
    to_status: e.to_status,
    event_type: e.event_type || 'STATUS_CHANGE',
    notes: e.notes,
    performed_by: e.performed_by || 'System',
    performed_at: e.performed_at,
  }));
}

// ─── Claim Detail (Benefit-Specific) ───────────────────────────────
export async function fetchClaimDetailJson(claimId: string): Promise<Record<string, any> | null> {
  const { data, error } = await db
    .from('bn_claim_detail')
    .select('detail_json')
    .eq('claim_id', claimId)
    .maybeSingle();

  if (error) throw error;
  return data?.detail_json ?? null;
}

export async function upsertClaimDetailJson(claimId: string, detailJson: Record<string, any>, userCode: string): Promise<void> {
  const { error } = await db
    .from('bn_claim_detail')
    .upsert({
      claim_id: claimId,
      detail_json: detailJson,
      modified_by: userCode,
      modified_at: new Date().toISOString(),
    }, { onConflict: 'claim_id' });

  if (error) throw error;
}

// ─── Claim Actions (Workflow Transitions) ──────────────────────────
export interface ClaimActionResult {
  success: boolean;
  newStatus?: string;
  message: string;
}

export async function executeClaimAction(
  claimId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  userCode: string,
  narrative?: string,
  reasonCode?: string,
): Promise<ClaimActionResult> {
  try {
    // 1. Update claim status
    const { error: updateErr } = await db
      .from('bn_claim')
      .update({
        status: toStatus,
        modified_by: userCode,
        modified_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('status', fromStatus); // Optimistic lock on current status

    if (updateErr) throw updateErr;

    // 2. Record event
    await db.from('bn_claim_event').insert({
      claim_id: claimId,
      event_type: action,
      from_status: fromStatus,
      to_status: toStatus,
      notes: narrative,
      performed_by: userCode,
      performed_at: new Date().toISOString(),
      metadata: reasonCode ? { reason_code: reasonCode } : null,
    });

    // 3. Future: sync to cl_head.status
    // 4. Future: create workflow task via workflow_instances
    // 5. Future: send notification via notification_templates

    return { success: true, newStatus: toStatus, message: `Claim ${action.toLowerCase()} successfully` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Action failed' };
  }
}

// ─── Claim Transition Rules ────────────────────────────────────────
export interface ClaimTransition {
  action: string;
  label: string;
  fromStatuses: string[];
  toStatus: string;
  requiresNarrative: boolean;
  requiresReasonCode: boolean;
  requiredRoles: string[];
  preconditions: string[];
  auditEvent: string;
  notificationTrigger?: string;
}

export const CLAIM_TRANSITIONS: ClaimTransition[] = [
  {
    action: 'SUBMIT',
    label: 'Submit',
    fromStatuses: ['DRAFT'],
    toStatus: 'SUBMITTED',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: ['SSN must be provided', 'Product must be selected'],
    auditEvent: 'CLAIM_SUBMITTED',
    notificationTrigger: 'bn_claim_registered',
  },
  {
    action: 'START_REVIEW',
    label: 'Start Review',
    fromStatuses: ['SUBMITTED'],
    toStatus: 'INTAKE_REVIEW',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'CLAIM_REVIEW_STARTED',
  },
  {
    action: 'CHECK_ELIGIBILITY',
    label: 'Check Eligibility',
    fromStatuses: ['INTAKE_REVIEW'],
    toStatus: 'ELIGIBILITY_CHECK',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: ['Identity must be verified'],
    auditEvent: 'ELIGIBILITY_CHECK_STARTED',
  },
  {
    action: 'REQUEST_EVIDENCE',
    label: 'Request Evidence',
    fromStatuses: ['ELIGIBILITY_CHECK', 'INTAKE_REVIEW'],
    toStatus: 'EVIDENCE_REVIEW',
    requiresNarrative: true,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'EVIDENCE_REQUESTED',
    notificationTrigger: 'bn_evidence_requested',
  },
  {
    action: 'RUN_CALCULATION',
    label: 'Run Calculation',
    fromStatuses: ['ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW'],
    toStatus: 'CALCULATION',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: ['Eligibility check must pass'],
    auditEvent: 'CALCULATION_STARTED',
  },
  {
    action: 'SUBMIT_DECISION',
    label: 'Submit for Decision',
    fromStatuses: ['CALCULATION'],
    toStatus: 'DECISION',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: ['Calculation must be completed'],
    auditEvent: 'DECISION_SUBMITTED',
  },
  {
    action: 'APPROVE',
    label: 'Approve',
    fromStatuses: ['DECISION'],
    toStatus: 'APPROVED',
    requiresNarrative: true,
    requiresReasonCode: false,
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    preconditions: ['All required evidence verified', 'Calculation completed'],
    auditEvent: 'CLAIM_APPROVED',
    notificationTrigger: 'bn_claim_approved',
  },
  {
    action: 'DENY',
    label: 'Deny',
    fromStatuses: ['DECISION', 'ELIGIBILITY_CHECK'],
    toStatus: 'DENIED',
    requiresNarrative: true,
    requiresReasonCode: true,
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'CLAIM_DENIED',
    notificationTrigger: 'bn_claim_denied',
  },
  {
    action: 'REQUEST_INFO',
    label: 'Request Info',
    fromStatuses: ['INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION'],
    toStatus: 'PENDING_INFO',
    requiresNarrative: true,
    requiresReasonCode: false,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'INFO_REQUESTED',
    notificationTrigger: 'bn_evidence_requested',
  },
  {
    action: 'SUSPEND',
    label: 'Suspend',
    fromStatuses: ['SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'APPROVED', 'IN_PAYMENT'],
    toStatus: 'SUSPENDED',
    requiresNarrative: true,
    requiresReasonCode: true,
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'CLAIM_SUSPENDED',
  },
  {
    action: 'REOPEN',
    label: 'Reopen',
    fromStatuses: ['SUSPENDED', 'DENIED', 'CLOSED', 'PENDING_INFO'],
    toStatus: 'INTAKE_REVIEW',
    requiresNarrative: true,
    requiresReasonCode: true,
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'CLAIM_REOPENED',
  },
  {
    action: 'WITHDRAW',
    label: 'Withdraw',
    fromStatuses: ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'PENDING_INFO'],
    toStatus: 'WITHDRAWN',
    requiresNarrative: true,
    requiresReasonCode: true,
    requiredRoles: ['CLAIMS_OFFICER', 'SUPERVISOR', 'ADMIN'],
    preconditions: [],
    auditEvent: 'CLAIM_WITHDRAWN',
  },
  {
    action: 'CLOSE',
    label: 'Close',
    fromStatuses: ['APPROVED', 'DENIED', 'IN_PAYMENT', 'WITHDRAWN'],
    toStatus: 'CLOSED',
    requiresNarrative: false,
    requiresReasonCode: false,
    requiredRoles: ['SUPERVISOR', 'ADMIN'],
    preconditions: ['No pending payables'],
    auditEvent: 'CLAIM_CLOSED',
  },
];

export function getAvailableTransitions(currentStatus: string, userRoles: string[]): ClaimTransition[] {
  return CLAIM_TRANSITIONS.filter(t =>
    t.fromStatuses.includes(currentStatus) &&
    t.requiredRoles.some(r => userRoles.includes(r))
  );
}
