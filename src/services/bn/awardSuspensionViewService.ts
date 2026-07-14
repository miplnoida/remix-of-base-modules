/**
 * BN Award Suspension — Read-Only View Service (canonical schema)
 *
 * Serves the redesigned Award Suspension workspace
 * (src/pages/bn/servicing/award-suspension/*).
 *
 * STRICT CONTRACT
 * ---------------
 * This module is **read-only**. It MUST NOT perform any mutation against
 * the database. Only the RPCs on `ALLOWED_READ_RPCS` may be invoked, and
 * every one of them is a read-only helper published by the platform.
 *
 * Canonical objects consulted:
 *   - bn_award, ip_master
 *   - bn_award_suspension_event
 *   - core_workflow_instance, core_workflow_task, core_workflow_action_log
 *   - core_audit_log
 *   - bn_workbasket, bn_workbasket_role, bn_role_delegation, bn_reason_code
 *   - bn_approval_policy
 *   - app_modules (rollout flags)
 *   - v_bn_user_effective_roles (view)
 *   - RPC bn_workbaskets_for_user(uuid) (read-only)
 *
 * A source-level test asserts:
 *   - No `.insert(`, `.update(`, `.delete(`, `.upsert(` on any table.
 *   - `.rpc(` may only be invoked for names in ALLOWED_READ_RPCS.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/** Explicit allowlist. Every entry must be a read-only platform helper. */
export const ALLOWED_READ_RPCS = ['bn_workbaskets_for_user'] as const;

/** Workflow domain used by all Award Suspension requests. */
const SUSPENSION_WORKFLOW = {
  workflow_code: 'BN_AWARD_SUSPENSION',
  module_code: 'bn_award_suspension',
  entity_type: 'bn_award_suspension_event',
} as const;

// ─────────────────────────── Types ───────────────────────────
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
  currentTaskCode: string | null;
  assignedRole: string | null;
  assignedWorkbasketId: string | null;
  assignedWorkbasketCode: string | null;
  assignedWorkbasketName: string | null;
  directTaskOwner: string | null;
  claimedBy: string | null;
  taskStatus: string | null;
  dueAt: string | null;
  slaBreached: boolean;
  policyId: string | null;
  ageDays: number;
  lastActionAt: string | null;
}

export interface SuspensionApprovalTask extends SuspensionRequestListItem {
  taskId: string;
  assignmentReason: 'DIRECT' | 'CLAIMED' | 'ROLE' | 'WORKBASKET' | 'DELEGATION';
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

export interface SuspensionApprovalRouteItem {
  level: number;
  taskCode: string | null;
  policyId: string | null;
  role: string | null;
  workbasketId: string | null;
  workbasketCode: string | null;
  taskStatus: string | null;
  outcome: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'PLANNED';
  completedBy: string | null;
  completedAt: string | null;
  isCurrent: boolean;
}

export interface SuspensionAuditEntry {
  id: string;
  at: string;
  actor: string | null;
  action: string | null;
  actionName: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  permissionAction: string | null;
  workflowInstanceId: string | null;
  workflowTaskId: string | null;
  policyId: string | null;
  approvalLevel: number | null;
  workbasketId: string | null;
  correlationId: string | null;
}

export interface SuspensionRequestDetails {
  request: SuspensionRequestListItem & {
    narrative: string | null;
    correlationId: string | null;
  };
  award: AwardSuspensionListItem;
  timeline: SuspensionTimelineItem[];
  approvalRoute: SuspensionApprovalRouteItem[];
  audit: SuspensionAuditEntry[];
  /** Section-level warnings so the UI can surface partial failures honestly. */
  warnings: string[];
}

export interface SuspensionSummaryCounts {
  activeAwards: number;
  openRequests: number;
  pendingMyApproval: number;
  approvedNotYetApplied: number;
  currentlySuspended: number;
  rejectedOrWithdrawn: number;
}

export interface SuspensionReasonOption {
  code: string;
  label: string;
  requiresNarrative: boolean;
}

export interface AwardSuspensionRolloutState {
  moduleEnabled: boolean;
  actionsEnabled: boolean;
  showInMenu: boolean;
  rolloutState: string | null;
  /** Combined effective flag — all guards must be on for actions to work. */
  effectiveActionsEnabled: boolean;
  loadError: string | null;
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
  if (s === 'ACTIVE' || s === 'RESUMED') return 'APPLIED';
  return 'PROPOSED';
};

const metaField = (meta: unknown, key: string): string | null => {
  if (!meta || typeof meta !== 'object') return null;
  const v = (meta as Record<string, unknown>)[key];
  return v == null ? null : String(v);
};

const numMetaField = (meta: unknown, key: string): number | null => {
  const v = metaField(meta, key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isOpenTaskStatus = (s: string | null | undefined): boolean =>
  !!s && !['COMPLETED', 'CANCELLED', 'SKIPPED', 'REJECTED', 'APPROVED'].includes(String(s).toUpperCase());

// ─────────────────────────── Rollout ───────────────────────────
export async function getAwardSuspensionRolloutState(): Promise<AwardSuspensionRolloutState> {
  try {
    const { data, error } = await db
      .from('app_modules')
      .select('is_enabled, actions_enabled, show_in_menu, rollout_state')
      .eq('name', 'bn_award_suspension')
      .maybeSingle();
    if (error) throw error;
    const moduleEnabled = Boolean(data?.is_enabled);
    const actionsEnabled = Boolean(data?.actions_enabled);
    const showInMenu = Boolean(data?.show_in_menu);
    return {
      moduleEnabled,
      actionsEnabled,
      showInMenu,
      rolloutState: data?.rollout_state ?? null,
      effectiveActionsEnabled: moduleEnabled && actionsEnabled,
      loadError: null,
    };
  } catch (e: any) {
    return {
      moduleEnabled: false,
      actionsEnabled: false,
      showInMenu: false,
      rolloutState: null,
      effectiveActionsEnabled: false,
      loadError: e?.message ?? 'Could not load rollout state',
    };
  }
}

// ─────────────────────────── Reasons ───────────────────────────
export async function listSuspensionReasonCodes(): Promise<SuspensionReasonOption[]> {
  const { data, error } = await db
    .from('bn_reason_code')
    .select('reason_code, reason_label, applicable_actions, is_active, requires_narrative')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => Array.isArray(r.applicable_actions) && r.applicable_actions.includes('SUSPEND'))
    .map((r: any) => ({
      code: r.reason_code,
      label: r.reason_label ?? r.reason_code,
      requiresNarrative: Boolean(r.requires_narrative),
    }));
}

// ─────────────────────────── Awards register ───────────────────────────
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
    const { data: ip, error: ipErr } = await db
      .from('ip_master')
      .select('ssn, firstname, middle_name, surname')
      .in('ssn', ssns);
    if (ipErr) throw ipErr;
    (ip ?? []).forEach((r: any) => {
      ipMap[r.ssn] = [r.firstname, r.middle_name, r.surname].filter(Boolean).join(' ').trim() || r.ssn;
    });
  }

  const awardIds: string[] = (awards ?? []).map((a: any) => a.id);
  const openEvents: Record<string, any> = {};
  if (awardIds.length) {
    const { data: events, error: evErr } = await db
      .from('bn_award_suspension_event')
      .select('id, bn_award_id, status, suspended_from, entered_at')
      .in('bn_award_id', awardIds)
      .order('entered_at', { ascending: false });
    if (evErr) throw evErr;
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

// ─────────────────────────── Workflow enrichment ───────────────────────────
interface WorkflowTaskRow {
  id: string;
  workflow_instance_id: string;
  task_code: string | null;
  step_code: string | null;
  assigned_to_user_id: string | null;
  assigned_to_role_key: string | null;
  assigned_to_permission_key: string | null;
  task_status: string | null;
  due_at: string | null;
  claimed_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  outcome: string | null;
  metadata: unknown;
  is_active: boolean | null;
  created_at: string;
}

interface WorkbasketRow {
  id: string;
  basket_code: string | null;
  basket_name: string | null;
}

async function fetchSuspensionInstances(): Promise<
  { id: string; entity_id: string | null; status: string | null; metadata: unknown }[]
> {
  const { data, error } = await db
    .from('core_workflow_instance')
    .select('id, entity_id, entity_type, module_code, workflow_code, status, metadata')
    .or(
      [
        `workflow_code.eq.${SUSPENSION_WORKFLOW.workflow_code}`,
        `and(module_code.eq.${SUSPENSION_WORKFLOW.module_code},entity_type.eq.${SUSPENSION_WORKFLOW.entity_type})`,
      ].join(',')
    );
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    entity_id: r.entity_id ?? null,
    status: r.status ?? null,
    metadata: r.metadata ?? null,
  }));
}

async function fetchTasksForInstances(instanceIds: string[]): Promise<WorkflowTaskRow[]> {
  if (!instanceIds.length) return [];
  const { data, error } = await db
    .from('core_workflow_task')
    .select(
      'id, workflow_instance_id, task_code, step_code, assigned_to_user_id, assigned_to_role_key, assigned_to_permission_key, task_status, due_at, claimed_by, completed_by, completed_at, outcome, metadata, is_active, created_at'
    )
    .in('workflow_instance_id', instanceIds);
  if (error) throw error;
  return (data ?? []) as WorkflowTaskRow[];
}

async function fetchWorkbaskets(ids: string[]): Promise<Record<string, WorkbasketRow>> {
  const map: Record<string, WorkbasketRow> = {};
  if (!ids.length) return map;
  const { data, error } = await db
    .from('bn_workbasket')
    .select('id, basket_code, basket_name')
    .in('id', ids);
  if (error) throw error;
  (data ?? []).forEach((r: any) => (map[r.id] = r));
  return map;
}

/** Pick the "current" task for an instance: prefer open, else most recent. */
function pickCurrentTask(tasks: WorkflowTaskRow[]): WorkflowTaskRow | null {
  if (!tasks.length) return null;
  const open = tasks.filter((t) => isOpenTaskStatus(t.task_status) && t.is_active !== false);
  const pool = open.length ? open : tasks;
  return pool
    .slice()
    .sort((a, b) => {
      const la = numMetaField(a.metadata, 'approval_level') ?? 0;
      const lb = numMetaField(b.metadata, 'approval_level') ?? 0;
      if (la !== lb) return la - lb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    [0] ?? null;
}

/** Derive total approval levels from tasks + applicable policy rows. */
function deriveTotalLevels(tasks: WorkflowTaskRow[], policyLevels: number[]): number | null {
  const taskLevels = tasks
    .map((t) => numMetaField(t.metadata, 'approval_level'))
    .filter((n): n is number => n != null);
  const all = [...taskLevels, ...policyLevels];
  return all.length ? Math.max(...all) : null;
}

async function fetchApplicablePolicies(): Promise<{ id: string; level: number | null }[]> {
  const { data, error } = await db
    .from('bn_approval_policy')
    .select('id, level, action_code, policy_area, is_enabled')
    .eq('is_enabled', true)
    .or('action_code.eq.SUSPEND,policy_area.eq.AWARD_SUSPENSION');
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, level: r.level ?? null }));
}

// ─────────────────────────── Requests register ───────────────────────────
export async function listSuspensionRequests(): Promise<SuspensionRequestListItem[]> {
  const { data: events, error } = await db
    .from('bn_award_suspension_event')
    .select(
      'id, bn_award_id, status, suspended_from, reason_code, reason_text, proposed_by_user_id, entered_at, entered_by, workflow_instance_id, modified_at, correlation_id'
    )
    .order('entered_at', { ascending: false });
  if (error) throw error;

  const awardIds: string[] = Array.from(new Set((events ?? []).map((e: any) => e.bn_award_id).filter(Boolean)));
  const awardMap: Record<string, any> = {};
  if (awardIds.length) {
    const { data: awards, error: aErr } = await db
      .from('bn_award')
      .select('id, award_number, ssn, benefit_code')
      .in('id', awardIds);
    if (aErr) throw aErr;
    (awards ?? []).forEach((a: any) => (awardMap[a.id] = a));
  }
  const ssns: string[] = Array.from(new Set(Object.values(awardMap).map((a: any) => a.ssn).filter(Boolean)));
  const ipMap: Record<string, string> = {};
  if (ssns.length) {
    const { data: ip, error: ipErr } = await db
      .from('ip_master')
      .select('ssn, firstname, middle_name, surname')
      .in('ssn', ssns);
    if (ipErr) throw ipErr;
    (ip ?? []).forEach((r: any) => {
      ipMap[r.ssn] = [r.firstname, r.middle_name, r.surname].filter(Boolean).join(' ').trim() || r.ssn;
    });
  }

  const instanceIds: string[] = Array.from(
    new Set((events ?? []).map((e: any) => e.workflow_instance_id).filter(Boolean))
  );
  const tasksByInstance: Record<string, WorkflowTaskRow[]> = {};
  const tasks = await fetchTasksForInstances(instanceIds).catch(() => []);
  tasks.forEach((t) => {
    (tasksByInstance[t.workflow_instance_id] ??= []).push(t);
  });
  const workbasketIds = Array.from(
    new Set(
      tasks
        .map((t) => metaField(t.metadata, 'workbasket_id'))
        .filter((v): v is string => !!v)
    )
  );
  const wbMap = await fetchWorkbaskets(workbasketIds).catch(() => ({} as Record<string, WorkbasketRow>));
  const policies = await fetchApplicablePolicies();
  const policyLevels = policies.map((p) => p.level ?? 0).filter((n) => n > 0);

  return (events ?? []).map((e: any): SuspensionRequestListItem => {
    const award = awardMap[e.bn_award_id] ?? {};
    const instanceTasks = tasksByInstance[e.workflow_instance_id ?? ''] ?? [];
    const cur = pickCurrentTask(instanceTasks);
    const wbId = cur ? metaField(cur.metadata, 'workbasket_id') : null;
    const wb = wbId ? wbMap[wbId] : null;
    const approvalLevel = cur ? numMetaField(cur.metadata, 'approval_level') : null;
    const totalLevels = deriveTotalLevels(instanceTasks, policyLevels);
    const due = cur?.due_at ?? null;
    const status = deriveRequestStatus(e);
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
      status,
      currentApprovalLevel: approvalLevel,
      totalApprovalLevels: totalLevels,
      currentTaskCode: cur?.task_code ?? null,
      assignedRole: cur?.assigned_to_role_key ?? null,
      assignedWorkbasketId: wbId,
      assignedWorkbasketCode: wb?.basket_code ?? null,
      assignedWorkbasketName: wb?.basket_name ?? null,
      directTaskOwner: cur?.assigned_to_user_id ?? null,
      claimedBy: cur?.claimed_by ?? null,
      taskStatus: cur?.task_status ?? null,
      dueAt: due,
      slaBreached: due ? new Date(due).getTime() < Date.now() : false,
      policyId: cur ? metaField(cur.metadata, 'policy_id') : null,
      ageDays: daysBetween(e.entered_at),
      lastActionAt: e.modified_at ?? e.entered_at,
    };
  });
}

// ─────────────────────────── My Approvals ───────────────────────────
export async function listMyApprovalTasks(userId: string | null): Promise<SuspensionApprovalTask[]> {
  if (!userId) return [];

  // 1. Effective roles for this user
  const { data: rolesData, error: rolesErr } = await db
    .from('v_bn_user_effective_roles')
    .select('role_name')
    .eq('user_id', userId);
  if (rolesErr) throw rolesErr;
  const effectiveRoles = Array.from(
    new Set((rolesData ?? []).map((r: any) => r.role_name).filter(Boolean))
  ) as string[];

  // 2. Workbaskets from platform helper (allow-listed read RPC)
  let userWorkbasketIds: string[] = [];
  try {
    const { data: wbs } = await db.rpc('bn_workbaskets_for_user', { p_user_id: userId });
    userWorkbasketIds = Array.from(
      new Set((wbs ?? []).map((r: any) => r.workbasket_id).filter(Boolean))
    );
  } catch {
    userWorkbasketIds = [];
  }

  // 3. Active delegations to this user
  const nowIso = new Date().toISOString();
  const { data: delegations } = await db
    .from('bn_role_delegation')
    .select('id, role_name, workbasket_id, valid_from, valid_to, status')
    .eq('to_user_id', userId)
    .eq('status', 'APPROVED')
    .lte('valid_from', nowIso);
  const activeDelegations = (delegations ?? []).filter(
    (d: any) => !d.valid_to || new Date(d.valid_to).getTime() > Date.now()
  );
  const delegatedRoles = new Set(activeDelegations.map((d: any) => d.role_name).filter(Boolean));
  const delegatedWorkbaskets = new Set(
    activeDelegations.map((d: any) => d.workbasket_id).filter(Boolean)
  );

  // 4. Restrict to BN_AWARD_SUSPENSION workflow instances only
  const instances = await fetchSuspensionInstances();
  const instanceIds = instances.map((i) => i.id);
  if (!instanceIds.length) return [];

  const tasks = await fetchTasksForInstances(instanceIds);
  const openTasks = tasks.filter(
    (t) => isOpenTaskStatus(t.task_status) && t.is_active !== false
  );

  const matchedTasks: { task: WorkflowTaskRow; reason: SuspensionApprovalTask['assignmentReason'] }[] =
    [];
  for (const t of openTasks) {
    if (t.assigned_to_user_id === userId) {
      matchedTasks.push({ task: t, reason: 'DIRECT' });
      continue;
    }
    if (t.claimed_by === userId) {
      matchedTasks.push({ task: t, reason: 'CLAIMED' });
      continue;
    }
    const role = t.assigned_to_role_key;
    const wbId = metaField(t.metadata, 'workbasket_id');
    if (role && effectiveRoles.includes(role)) {
      matchedTasks.push({ task: t, reason: 'ROLE' });
      continue;
    }
    if (wbId && userWorkbasketIds.includes(wbId)) {
      matchedTasks.push({ task: t, reason: 'WORKBASKET' });
      continue;
    }
    if (
      (role && delegatedRoles.has(role)) ||
      (wbId && delegatedWorkbaskets.has(wbId))
    ) {
      matchedTasks.push({ task: t, reason: 'DELEGATION' });
      continue;
    }
  }

  if (!matchedTasks.length) return [];

  const matchedInstanceIds = Array.from(new Set(matchedTasks.map((m) => m.task.workflow_instance_id)));
  const { data: eventsData, error: evErr } = await db
    .from('bn_award_suspension_event')
    .select(
      'id, bn_award_id, status, suspended_from, reason_code, reason_text, proposed_by_user_id, entered_at, entered_by, workflow_instance_id, modified_at, correlation_id'
    )
    .in('workflow_instance_id', matchedInstanceIds);
  if (evErr) throw evErr;
  const eventByInstance: Record<string, any> = {};
  (eventsData ?? []).forEach((e: any) => (eventByInstance[e.workflow_instance_id] = e));

  const awardIds = Array.from(
    new Set((eventsData ?? []).map((e: any) => e.bn_award_id).filter(Boolean))
  );
  const awardMap: Record<string, any> = {};
  if (awardIds.length) {
    const { data: awards } = await db
      .from('bn_award')
      .select('id, award_number, ssn, benefit_code')
      .in('id', awardIds);
    (awards ?? []).forEach((a: any) => (awardMap[a.id] = a));
  }
  const ssns = Array.from(
    new Set(Object.values(awardMap).map((a: any) => a.ssn).filter(Boolean))
  );
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

  const wbIds = Array.from(
    new Set(
      matchedTasks
        .map((m) => metaField(m.task.metadata, 'workbasket_id'))
        .filter((v): v is string => !!v)
    )
  );
  const wbMap = await fetchWorkbaskets(wbIds).catch(() => ({} as Record<string, WorkbasketRow>));
  const policies = await fetchApplicablePolicies();
  const policyLevels = policies.map((p) => p.level ?? 0).filter((n) => n > 0);

  return matchedTasks
    .map(({ task, reason }): SuspensionApprovalTask | null => {
      const e = eventByInstance[task.workflow_instance_id];
      if (!e) return null;
      const award = awardMap[e.bn_award_id] ?? {};
      const wbId = metaField(task.metadata, 'workbasket_id');
      const wb = wbId ? wbMap[wbId] : null;
      const dueAt = task.due_at ?? null;
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
        currentApprovalLevel: numMetaField(task.metadata, 'approval_level'),
        totalApprovalLevels: deriveTotalLevels([task], policyLevels),
        currentTaskCode: task.task_code ?? null,
        assignedRole: task.assigned_to_role_key ?? null,
        assignedWorkbasketId: wbId,
        assignedWorkbasketCode: wb?.basket_code ?? null,
        assignedWorkbasketName: wb?.basket_name ?? null,
        directTaskOwner: task.assigned_to_user_id ?? null,
        claimedBy: task.claimed_by ?? null,
        taskStatus: task.task_status ?? null,
        dueAt,
        slaBreached: dueAt ? new Date(dueAt).getTime() < Date.now() : false,
        policyId: metaField(task.metadata, 'policy_id'),
        ageDays: daysBetween(e.entered_at),
        lastActionAt: e.modified_at ?? e.entered_at,
        taskId: task.id,
        assignmentReason: reason,
      };
    })
    .filter((v): v is SuspensionApprovalTask => v !== null);
}

// ─────────────────────────── Request details ───────────────────────────
export async function getSuspensionRequestDetails(
  requestId: string
): Promise<SuspensionRequestDetails | null> {
  const warnings: string[] = [];

  const { data: e, error: eErr } = await db
    .from('bn_award_suspension_event')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (eErr) throw eErr;
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

  // Tasks + workbaskets + action log
  let tasks: WorkflowTaskRow[] = [];
  let actionLog: any[] = [];
  let wbMap: Record<string, WorkbasketRow> = {};
  if (e.workflow_instance_id) {
    try {
      tasks = await fetchTasksForInstances([e.workflow_instance_id]);
    } catch {
      warnings.push('Workflow tasks could not be loaded.');
    }
    try {
      const { data: log, error: lErr } = await db
        .from('core_workflow_action_log')
        .select(
          'id, action_type, action_name, actor_user_id, actor_name, before_status, after_status, reason, comments, action_at, metadata, workflow_task_id'
        )
        .eq('workflow_instance_id', e.workflow_instance_id)
        .order('action_at', { ascending: true });
      if (lErr) throw lErr;
      actionLog = log ?? [];
    } catch {
      warnings.push('Workflow action log could not be loaded.');
    }
    const wbIds = Array.from(
      new Set(
        tasks.map((t) => metaField(t.metadata, 'workbasket_id')).filter((v): v is string => !!v)
      )
    );
    try {
      wbMap = await fetchWorkbaskets(wbIds);
    } catch {
      warnings.push('Workbaskets could not be loaded.');
    }
  } else {
    warnings.push('This request has no linked workflow instance.');
  }

  const policies = await fetchApplicablePolicies();
  const policyLevels = policies.map((p) => p.level ?? 0).filter((n) => n > 0);
  const cur = pickCurrentTask(tasks);
  const currentTaskId = cur?.id;

  // Approval route from actual tasks (ordered by approval level then created_at)
  const approvalRoute: SuspensionApprovalRouteItem[] = tasks
    .slice()
    .sort((a, b) => {
      const la = numMetaField(a.metadata, 'approval_level') ?? 0;
      const lb = numMetaField(b.metadata, 'approval_level') ?? 0;
      if (la !== lb) return la - lb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .map((t, idx) => {
      const wbId = metaField(t.metadata, 'workbasket_id');
      const wb = wbId ? wbMap[wbId] : null;
      const st = String(t.task_status ?? '').toUpperCase();
      const outcome: SuspensionApprovalRouteItem['outcome'] =
        st === 'APPROVED' || t.outcome === 'APPROVED'
          ? 'APPROVED'
          : st === 'REJECTED' || t.outcome === 'REJECTED'
            ? 'REJECTED'
            : st === 'SKIPPED'
              ? 'SKIPPED'
              : isOpenTaskStatus(t.task_status)
                ? 'PENDING'
                : 'PENDING';
      return {
        level: numMetaField(t.metadata, 'approval_level') ?? idx + 1,
        taskCode: t.task_code ?? null,
        policyId: metaField(t.metadata, 'policy_id'),
        role: t.assigned_to_role_key ?? null,
        workbasketId: wbId,
        workbasketCode: wb?.basket_code ?? null,
        taskStatus: t.task_status ?? null,
        outcome,
        completedBy: t.completed_by ?? null,
        completedAt: t.completed_at ?? null,
        isCurrent: t.id === currentTaskId,
      };
    });

  // Add planned levels from policy where no task exists yet
  const existingLevels = new Set(approvalRoute.map((r) => r.level));
  for (const p of policies) {
    if (p.level != null && !existingLevels.has(p.level)) {
      approvalRoute.push({
        level: p.level,
        taskCode: null,
        policyId: p.id,
        role: null,
        workbasketId: null,
        workbasketCode: null,
        taskStatus: null,
        outcome: 'PLANNED',
        completedBy: null,
        completedAt: null,
        isCurrent: false,
      });
    }
  }
  approvalRoute.sort((a, b) => a.level - b.level);

  // Timeline: proposal + mapped action log
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
      at: r.action_at,
      actor: r.actor_name ?? r.actor_user_id ?? null,
      action: r.action_name ?? r.action_type ?? 'ACTION',
      fromStatus: r.before_status ?? null,
      toStatus: r.after_status ?? null,
      note: r.comments ?? r.reason ?? null,
      correlationId: metaField(r.metadata, 'correlation_id') ?? e.correlation_id ?? null,
    })),
  ];

  // Audit entries — best-effort match against core_audit_log
  let audit: SuspensionAuditEntry[] = [];
  try {
    let q = db
      .from('core_audit_log')
      .select(
        'id, event_time, action, event_name, actor_user_id, actor_name, before_value, after_value, metadata, correlation_id'
      )
      .order('event_time', { ascending: true });
    q = q.or(
      [
        `and(entity_type.eq.${SUSPENSION_WORKFLOW.entity_type},entity_id.eq.${e.id})`,
        e.correlation_id ? `correlation_id.eq.${e.correlation_id}` : null,
      ]
        .filter(Boolean)
        .join(',')
    );
    const { data: rows, error: aErr } = await q;
    if (aErr) throw aErr;
    audit = (rows ?? []).map((r: any): SuspensionAuditEntry => ({
      id: r.id,
      at: r.event_time,
      actor: r.actor_name ?? r.actor_user_id ?? null,
      action: r.action ?? null,
      actionName: r.event_name ?? null,
      beforeValue: r.before_value ?? null,
      afterValue: r.after_value ?? null,
      permissionAction: metaField(r.metadata, 'permission_action'),
      workflowInstanceId: metaField(r.metadata, 'workflow_instance_id') ?? e.workflow_instance_id ?? null,
      workflowTaskId: metaField(r.metadata, 'workflow_task_id'),
      policyId: metaField(r.metadata, 'policy_id'),
      approvalLevel: numMetaField(r.metadata, 'approval_level'),
      workbasketId: metaField(r.metadata, 'workbasket_id'),
      correlationId: r.correlation_id ?? null,
    }));
  } catch {
    warnings.push('Audit entries could not be loaded.');
  }

  const wbId = cur ? metaField(cur.metadata, 'workbasket_id') : null;
  const wb = wbId ? wbMap[wbId] : null;
  const dueAt = cur?.due_at ?? null;

  const requestSummary: SuspensionRequestListItem & { narrative: string | null; correlationId: string | null } = {
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
    currentApprovalLevel: cur ? numMetaField(cur.metadata, 'approval_level') : null,
    totalApprovalLevels: deriveTotalLevels(tasks, policyLevels),
    currentTaskCode: cur?.task_code ?? null,
    assignedRole: cur?.assigned_to_role_key ?? null,
    assignedWorkbasketId: wbId,
    assignedWorkbasketCode: wb?.basket_code ?? null,
    assignedWorkbasketName: wb?.basket_name ?? null,
    directTaskOwner: cur?.assigned_to_user_id ?? null,
    claimedBy: cur?.claimed_by ?? null,
    taskStatus: cur?.task_status ?? null,
    dueAt,
    slaBreached: dueAt ? new Date(dueAt).getTime() < Date.now() : false,
    policyId: cur ? metaField(cur.metadata, 'policy_id') : null,
    ageDays: daysBetween(e.entered_at),
    lastActionAt: e.modified_at ?? e.entered_at,
    narrative: e.reason_text ?? null,
    correlationId: e.correlation_id ?? null,
  };

  return {
    request: requestSummary,
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
    approvalRoute,
    audit,
    warnings,
  };
}

// ─────────────────────────── Summary counts ───────────────────────────
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
