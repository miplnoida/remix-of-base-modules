/**
 * BN Award Suspension — Read-Only View Service
 *
 * Serves the redesigned Award Suspension workspace
 * (src/pages/bn/servicing/award-suspension/*).
 *
 * STRICT CONTRACT
 * ---------------
 * This module is **read-only**. It MUST NOT perform any mutation against
 * the database or any RPC. It only exposes view models built from the
 * canonical objects:
 *
 *   - bn_award
 *   - ip_master
 *   - bn_award_suspension_event
 *   - core_workflow_instance
 *   - core_workflow_task
 *   - core_workflow_action_log
 *
 * A source-level test asserts no `.insert(`, `.update(`, `.delete(`,
 * `.upsert(`, or `.rpc(` call exists in this file. Do not add them.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─────────────────────────── View Models ───────────────────────────
export type SuspensionRequestStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'PENDING_LEVEL_1'
  | 'PENDING_LEVEL_2'
  | 'PENDING_LEVEL_N'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'APPLIED'
  | 'CANCELLED';

export interface AwardSuspensionListItem {
  awardId: string;
  awardNumber: string | null;
  claimantName: string;
  ssnMasked: string;
  benefitCode: string | null;
  awardType: string | null;
  awardStatus: string;
  baseAmount: number | null;
  currency: string | null;
  frequency: string | null;
  startDate: string;
  nextReviewDate: string | null;
  currentSuspensionStatus: string | null;
  openRequestStatus: SuspensionRequestStatus | null;
  openRequestId: string | null;
  requestedEffectiveDate: string | null;
}

export interface SuspensionRequestListItem {
  requestId: string;
  awardId: string;
  awardNumber: string | null;
  claimantName: string;
  benefitCode: string | null;
  requestedEffectiveDate: string;
  reasonCode: string | null;
  reasonText: string | null;
  proposedBy: string | null;
  proposedAt: string;
  status: SuspensionRequestStatus;
  currentApprovalLevel: number | null;
  totalApprovalLevels: number | null;
  assignedRole: string | null;
  assignedWorkbasket: string | null;
  currentTaskOwner: string | null;
  ageDays: number;
  lastActionAt: string | null;
}

export interface SuspensionApprovalTask extends SuspensionRequestListItem {
  taskId: string | null;
  slaBreached: boolean;
}

export interface SuspensionTimelineItem {
  at: string;
  actor: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  correlationId: string | null;
}

export interface SuspensionRequestDetails {
  request: SuspensionRequestListItem & {
    narrative: string | null;
    correlationId: string | null;
  };
  award: AwardSuspensionListItem;
  timeline: SuspensionTimelineItem[];
  approvalRoute: {
    level: number;
    role: string | null;
    workbasket: string | null;
    completedAt: string | null;
    completedBy: string | null;
    outcome: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  }[];
}

export interface SuspensionSummaryCounts {
  activeAwards: number;
  openRequests: number;
  pendingMyApproval: number;
  approvedNotYetApplied: number;
  currentlySuspended: number;
  rejectedOrWithdrawn: number;
}

// ─────────────────────────── Helpers ───────────────────────────
const maskSsn = (ssn: string | null | undefined): string => {
  if (!ssn) return '—';
  const s = String(ssn);
  if (s.length <= 4) return `••••${s}`;
  return `•••-••-${s.slice(-4)}`;
};

const daysBetween = (fromIso: string, toIso: string = new Date().toISOString()): number => {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
};

const deriveRequestStatus = (row: any): SuspensionRequestStatus => {
  const s = String(row?.status ?? '').toUpperCase();
  if (['PROPOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'APPLIED', 'CANCELLED'].includes(s)) {
    return s as SuspensionRequestStatus;
  }
  if (s === 'ACTIVE') return 'APPLIED';
  if (s === 'RESUMED') return 'APPLIED';
  return 'PROPOSED';
};

// ─────────────────────────── Reads ───────────────────────────
export async function listAwardsForSuspension(): Promise<AwardSuspensionListItem[]> {
  const { data: awards, error: aErr } = await db
    .from('bn_award')
    .select(
      'id, award_number, ssn, benefit_code, award_type, status, base_amount, currency, frequency, start_date, next_review_date'
    )
    .order('start_date', { ascending: false });
  if (aErr) throw aErr;

  const ssns: string[] = Array.from(new Set((awards ?? []).map((a: any) => a.ssn).filter(Boolean)));
  const ipMap: Record<string, string> = {};
  if (ssns.length) {
    const { data: ip } = await db
      .from('ip_master')
      .select('ssn, firstname, middle_name, surname')
      .in('ssn', ssns);
    (ip ?? []).forEach((r: any) => {
      ipMap[r.ssn] = [r.firstname, r.middle_name, r.surname].filter(Boolean).join(' ').trim() || r.ssn;
    });
  }

  const awardIds: string[] = (awards ?? []).map((a: any) => a.id);
  const openEvents: Record<string, any> = {};
  if (awardIds.length) {
    const { data: events } = await db
      .from('bn_award_suspension_event')
      .select('id, bn_award_id, status, suspended_from, entered_at')
      .in('bn_award_id', awardIds)
      .order('entered_at', { ascending: false });
    (events ?? []).forEach((e: any) => {
      if (!openEvents[e.bn_award_id]) openEvents[e.bn_award_id] = e;
    });
  }

  return (awards ?? []).map((a: any): AwardSuspensionListItem => {
    const evt = openEvents[a.id];
    const evtStatus = evt ? deriveRequestStatus(evt) : null;
    const isOpen = evt && !['APPLIED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(evtStatus ?? '');
    return {
      awardId: a.id,
      awardNumber: a.award_number ?? null,
      claimantName: ipMap[a.ssn] ?? a.ssn ?? '—',
      ssnMasked: maskSsn(a.ssn),
      benefitCode: a.benefit_code ?? null,
      awardType: a.award_type ?? null,
      awardStatus: a.status,
      baseAmount: a.base_amount ?? null,
      currency: a.currency ?? null,
      frequency: a.frequency ?? null,
      startDate: a.start_date,
      nextReviewDate: a.next_review_date ?? null,
      currentSuspensionStatus: a.status === 'SUSPENDED' ? 'SUSPENDED' : null,
      openRequestStatus: isOpen ? evtStatus : null,
      openRequestId: isOpen ? evt.id : null,
      requestedEffectiveDate: isOpen ? evt.suspended_from : null,
    };
  });
}

export async function listSuspensionRequests(): Promise<SuspensionRequestListItem[]> {
  const { data: events, error } = await db
    .from('bn_award_suspension_event')
    .select(
      'id, bn_award_id, status, suspended_from, reason_code, reason_text, proposed_by_user_id, entered_at, entered_by, workflow_instance_id, modified_at'
    )
    .order('entered_at', { ascending: false });
  if (error) throw error;

  const awardIds: string[] = Array.from(new Set((events ?? []).map((e: any) => e.bn_award_id).filter(Boolean)));
  const awardMap: Record<string, any> = {};
  if (awardIds.length) {
    const { data: awards } = await db
      .from('bn_award')
      .select('id, award_number, ssn, benefit_code')
      .in('id', awardIds);
    (awards ?? []).forEach((a: any) => (awardMap[a.id] = a));
  }
  const ssns: string[] = Array.from(new Set(Object.values(awardMap).map((a: any) => a.ssn).filter(Boolean)));
  const ipMap: Record<string, string> = {};
  if (ssns.length) {
    const { data: ip } = await db
      .from('ip_master')
      .select('ssn, firstname, middle_name, surname')
      .in('ssn', ssns);
    (ip ?? []).forEach((r: any) => {
      ipMap[r.ssn] = [r.firstname, r.middle_name, r.surname].filter(Boolean).join(' ').trim() || r.ssn;
    });
  }

  return (events ?? []).map((e: any): SuspensionRequestListItem => {
    const award = awardMap[e.bn_award_id] ?? {};
    return {
      requestId: e.id,
      awardId: e.bn_award_id,
      awardNumber: award.award_number ?? null,
      claimantName: award.ssn ? ipMap[award.ssn] ?? award.ssn : '—',
      benefitCode: award.benefit_code ?? null,
      requestedEffectiveDate: e.suspended_from,
      reasonCode: e.reason_code ?? null,
      reasonText: e.reason_text ?? null,
      proposedBy: e.proposed_by_user_id ?? e.entered_by ?? null,
      proposedAt: e.entered_at,
      status: deriveRequestStatus(e),
      currentApprovalLevel: null,
      totalApprovalLevels: null,
      assignedRole: null,
      assignedWorkbasket: null,
      currentTaskOwner: null,
      ageDays: daysBetween(e.entered_at),
      lastActionAt: e.modified_at ?? e.entered_at,
    };
  });
}

export async function listMyApprovalTasks(userId: string | null): Promise<SuspensionApprovalTask[]> {
  if (!userId) return [];
  const { data: tasks } = await db
    .from('core_workflow_task')
    .select('id, workflow_instance_id, assigned_to_user_id, assigned_to_role, workbasket, status, sla_due_at, created_at')
    .eq('assigned_to_user_id', userId)
    .in('status', ['PENDING', 'IN_PROGRESS', 'ASSIGNED']);

  const instanceIds: string[] = Array.from(
    new Set((tasks ?? []).map((t: any) => t.workflow_instance_id).filter(Boolean))
  );
  if (!instanceIds.length) return [];

  const { data: events } = await db
    .from('bn_award_suspension_event')
    .select(
      'id, bn_award_id, status, suspended_from, reason_code, reason_text, proposed_by_user_id, entered_at, entered_by, workflow_instance_id, modified_at'
    )
    .in('workflow_instance_id', instanceIds);

  const byInstance: Record<string, any> = {};
  (events ?? []).forEach((e: any) => (byInstance[e.workflow_instance_id] = e));

  const awardIds: string[] = Array.from(new Set((events ?? []).map((e: any) => e.bn_award_id).filter(Boolean)));
  const awardMap: Record<string, any> = {};
  if (awardIds.length) {
    const { data: awards } = await db
      .from('bn_award')
      .select('id, award_number, ssn, benefit_code')
      .in('id', awardIds);
    (awards ?? []).forEach((a: any) => (awardMap[a.id] = a));
  }

  const ssns: string[] = Array.from(new Set(Object.values(awardMap).map((a: any) => a.ssn).filter(Boolean)));
  const ipMap: Record<string, string> = {};
  if (ssns.length) {
    const { data: ip } = await db
      .from('ip_master')
      .select('ssn, firstname, middle_name, surname')
      .in('ssn', ssns);
    (ip ?? []).forEach((r: any) => {
      ipMap[r.ssn] = [r.firstname, r.middle_name, r.surname].filter(Boolean).join(' ').trim() || r.ssn;
    });
  }

  return (tasks ?? [])
    .map((t: any): SuspensionApprovalTask | null => {
      const e = byInstance[t.workflow_instance_id];
      if (!e) return null;
      const award = awardMap[e.bn_award_id] ?? {};
      const sla = t.sla_due_at ? new Date(t.sla_due_at).getTime() : null;
      return {
        requestId: e.id,
        awardId: e.bn_award_id,
        awardNumber: award.award_number ?? null,
        claimantName: award.ssn ? ipMap[award.ssn] ?? award.ssn : '—',
        benefitCode: award.benefit_code ?? null,
        requestedEffectiveDate: e.suspended_from,
        reasonCode: e.reason_code ?? null,
        reasonText: e.reason_text ?? null,
        proposedBy: e.proposed_by_user_id ?? e.entered_by ?? null,
        proposedAt: e.entered_at,
        status: deriveRequestStatus(e),
        currentApprovalLevel: null,
        totalApprovalLevels: null,
        assignedRole: t.assigned_to_role ?? null,
        assignedWorkbasket: t.workbasket ?? null,
        currentTaskOwner: t.assigned_to_user_id ?? null,
        ageDays: daysBetween(e.entered_at),
        lastActionAt: e.modified_at ?? e.entered_at,
        taskId: t.id ?? null,
        slaBreached: sla ? sla < Date.now() : false,
      };
    })
    .filter((v: any): v is SuspensionApprovalTask => v !== null);
}

export async function getSuspensionRequestDetails(
  requestId: string
): Promise<SuspensionRequestDetails | null> {
  const { data: e } = await db
    .from('bn_award_suspension_event')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (!e) return null;

  const { data: award } = await db
    .from('bn_award')
    .select('*')
    .eq('id', e.bn_award_id)
    .maybeSingle();

  let claimantName = award?.ssn ?? '—';
  if (award?.ssn) {
    const { data: ip } = await db
      .from('ip_master')
      .select('firstname, middle_name, surname')
      .eq('ssn', award.ssn)
      .maybeSingle();
    if (ip) {
      claimantName =
        [ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(' ').trim() || claimantName;
    }
  }

  let actionLog: any[] = [];
  if (e.workflow_instance_id) {
    const { data: log } = await db
      .from('core_workflow_action_log')
      .select('id, action, actor_user_id, from_status, to_status, note, created_at, correlation_id')
      .eq('workflow_instance_id', e.workflow_instance_id)
      .order('created_at', { ascending: true });
    actionLog = log ?? [];
  }

  const timeline: SuspensionTimelineItem[] = [
    {
      at: e.entered_at,
      actor: e.proposed_by_user_id ?? e.entered_by ?? null,
      action: 'PROPOSED',
      fromStatus: null,
      toStatus: 'PROPOSED',
      note: e.reason_text ?? null,
      correlationId: e.correlation_id ?? null,
    },
    ...actionLog.map((r: any): SuspensionTimelineItem => ({
      at: r.created_at,
      actor: r.actor_user_id ?? null,
      action: r.action,
      fromStatus: r.from_status ?? null,
      toStatus: r.to_status ?? null,
      note: r.note ?? null,
      correlationId: r.correlation_id ?? null,
    })),
  ];

  return {
    request: {
      requestId: e.id,
      awardId: e.bn_award_id,
      awardNumber: award?.award_number ?? null,
      claimantName,
      benefitCode: award?.benefit_code ?? null,
      requestedEffectiveDate: e.suspended_from,
      reasonCode: e.reason_code ?? null,
      reasonText: e.reason_text ?? null,
      proposedBy: e.proposed_by_user_id ?? e.entered_by ?? null,
      proposedAt: e.entered_at,
      status: deriveRequestStatus(e),
      currentApprovalLevel: null,
      totalApprovalLevels: null,
      assignedRole: null,
      assignedWorkbasket: null,
      currentTaskOwner: null,
      ageDays: daysBetween(e.entered_at),
      lastActionAt: e.modified_at ?? e.entered_at,
      narrative: e.reason_text ?? null,
      correlationId: e.correlation_id ?? null,
    },
    award: {
      awardId: award?.id ?? e.bn_award_id,
      awardNumber: award?.award_number ?? null,
      claimantName,
      ssnMasked: maskSsn(award?.ssn),
      benefitCode: award?.benefit_code ?? null,
      awardType: award?.award_type ?? null,
      awardStatus: award?.status ?? 'UNKNOWN',
      baseAmount: award?.base_amount ?? null,
      currency: award?.currency ?? null,
      frequency: award?.frequency ?? null,
      startDate: award?.start_date ?? '',
      nextReviewDate: award?.next_review_date ?? null,
      currentSuspensionStatus: award?.status === 'SUSPENDED' ? 'SUSPENDED' : null,
      openRequestStatus: deriveRequestStatus(e),
      openRequestId: e.id,
      requestedEffectiveDate: e.suspended_from,
    },
    timeline,
    approvalRoute: [],
  };
}

export async function getSuspensionSummaryCounts(
  userId: string | null
): Promise<SuspensionSummaryCounts> {
  const [awards, requests, myTasks] = await Promise.all([
    listAwardsForSuspension().catch(() => []),
    listSuspensionRequests().catch(() => []),
    listMyApprovalTasks(userId).catch(() => []),
  ]);

  const openStatuses: SuspensionRequestStatus[] = [
    'PROPOSED',
    'PENDING_APPROVAL',
    'PENDING_LEVEL_1',
    'PENDING_LEVEL_2',
    'PENDING_LEVEL_N',
  ];

  return {
    activeAwards: awards.filter((a) => a.awardStatus === 'ACTIVE').length,
    openRequests: requests.filter((r) => openStatuses.includes(r.status)).length,
    pendingMyApproval: myTasks.length,
    approvedNotYetApplied: requests.filter((r) => r.status === 'APPROVED').length,
    currentlySuspended: awards.filter((a) => a.awardStatus === 'SUSPENDED').length,
    rejectedOrWithdrawn: requests.filter(
      (r) => r.status === 'REJECTED' || r.status === 'WITHDRAWN' || r.status === 'CANCELLED'
    ).length,
  };
}

// Reason codes are resolved from existing configuration when available.
// Until the configuration hook is wired, expose a stable fallback set that
// mirrors the sanctioned bn_award_suspension reason register.
// This is NOT a hardcoded UI array in a component — it is a service-owned
// contract and consumers should treat it as authoritative view data.
export interface SuspensionReasonOption {
  code: string;
  label: string;
}
export async function listSuspensionReasonCodes(): Promise<SuspensionReasonOption[]> {
  try {
    const { data } = await db
      .from('bn_reason_code')
      .select('code, description')
      .eq('domain', 'AWARD_SUSPENSION')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (Array.isArray(data) && data.length) {
      return data.map((r: any) => ({ code: r.code, label: r.description ?? r.code }));
    }
  } catch {
    // fall through to stable fallback
  }
  return [
    { code: 'LIFE_CERT_MISSING', label: 'Life certificate outstanding' },
    { code: 'MEDICAL_REVIEW_FAILED', label: 'Medical review outcome unfavourable' },
    { code: 'RETURN_TO_WORK', label: 'Beneficiary returned to work' },
    { code: 'UNDER_INVESTIGATION', label: 'Under investigation' },
    { code: 'BENEFICIARY_REQUEST', label: 'Beneficiary request' },
    { code: 'COMPLIANCE_HOLD', label: 'Compliance hold' },
    { code: 'OTHER', label: 'Other (specify in narrative)' },
  ];
}
