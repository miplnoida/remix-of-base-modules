/**
 * BN-UI-S1.1 — Canonical schema mapping tests for the read-only view service.
 *
 * We stub the Supabase client with a tiny in-memory router that records the
 * requested table/columns/filters and returns pre-defined rows using the
 * REAL canonical column names.
 *
 * These tests validate:
 *   • core_workflow_task columns → view model
 *   • metadata.approval_level / workbasket_id / policy_id resolution
 *   • workbasket join through bn_workbasket
 *   • direct / role / workbasket / delegation My-Approval matching
 *   • expired delegation and non-suspension workflow exclusion
 *   • completed-task exclusion
 *   • action-log column mapping
 *   • approval-route construction
 *   • audit list from core_audit_log
 *   • configured / empty reason-code paths
 *   • rollout state reader
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Fake supabase client ──────────────────────────────────────────────
type Row = Record<string, unknown>;
type TableStub = { rows: Row[] };
const tables: Record<string, TableStub> = {};
const rpcHandlers: Record<string, (args: any) => any[]> = {};

const seed = (table: string, rows: Row[]) => (tables[table] = { rows });

function buildQuery(table: string) {
  let filtered: Row[] = [...(tables[table]?.rows ?? [])];
  const applyEq = (col: string, val: unknown) => {
    filtered = filtered.filter((r) => r[col] === val);
  };
  const applyIn = (col: string, vals: unknown[]) => {
    filtered = filtered.filter((r) => vals.includes(r[col]));
  };
  const q: any = {
    select: () => q,
    order: () => q,
    limit: () => q,
    eq: (c: string, v: unknown) => {
      applyEq(c, v);
      return q;
    },
    in: (c: string, v: unknown[]) => {
      applyIn(c, v);
      return q;
    },
    lte: () => q,
    or: () => q,
    maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
    then: (resolve: any) => resolve({ data: filtered, error: null }),
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => buildQuery(t),
    rpc: async (name: string, args: any) => {
      const fn = rpcHandlers[name];
      if (!fn) throw new Error(`unexpected rpc ${name}`);
      return { data: fn(args), error: null };
    },
  },
}));

import {
  ALLOWED_READ_RPCS,
  getAwardSuspensionRolloutState,
  getSuspensionRequestDetails,
  listMyApprovalTasks,
  listSuspensionReasonCodes,
  listSuspensionRequests,
} from '@/services/bn/awardSuspensionViewService';

const AWARD_ID = 'a1111111-1111-1111-1111-111111111111';
const EVENT_ID = 'e1111111-1111-1111-1111-111111111111';
const INST_ID = 'i1111111-1111-1111-1111-111111111111';
const INST_OTHER = 'i2222222-2222-2222-2222-222222222222';
const TASK_L1 = 't1111111-1111-1111-1111-111111111111';
const TASK_L2 = 't2222222-2222-2222-2222-222222222222';
const TASK_COMPLETED = 't3333333-3333-3333-3333-333333333333';
const TASK_OTHER_DOMAIN = 't4444444-4444-4444-4444-444444444444';
const WB_A = 'w1111111-1111-1111-1111-111111111111';
const USER = 'u1111111-1111-1111-1111-111111111111';

const seedAll = () => {
  seed('bn_award', [
    {
      id: AWARD_ID,
      award_number: 'AW-1',
      ssn: '123456789',
      benefit_code: 'AGE',
      award_type: 'PENSION',
      status: 'ACTIVE',
      base_amount: 500,
      currency: 'XCD',
      frequency: 'MONTHLY',
      start_date: '2024-01-01',
      next_review_date: null,
    },
  ]);
  seed('ip_master', [
    { ssn: '123456789', firstname: 'Jane', middle_name: null, surname: 'Doe' },
  ]);
  seed('bn_award_suspension_event', [
    {
      id: EVENT_ID,
      bn_award_id: AWARD_ID,
      status: 'PENDING_APPROVAL',
      suspended_from: '2024-02-01',
      reason_code: 'MEDICAL_PENDING',
      reason_text: 'Awaiting medical evidence',
      proposed_by_user_id: 'u-proposer',
      entered_at: '2024-01-15T10:00:00Z',
      entered_by: 'u-proposer',
      workflow_instance_id: INST_ID,
      modified_at: '2024-01-15T10:00:00Z',
      correlation_id: 'corr-1',
    },
  ]);
  seed('core_workflow_instance', [
    {
      id: INST_ID,
      workflow_code: 'BN_AWARD_SUSPENSION',
      module_code: 'bn_award_suspension',
      entity_type: 'bn_award_suspension_event',
      entity_id: EVENT_ID,
      status: 'ACTIVE',
      metadata: {},
    },
    {
      id: INST_OTHER,
      workflow_code: 'BN_CLAIM',
      module_code: 'bn_claim',
      entity_type: 'bn_claim',
      entity_id: 'c-1',
      status: 'ACTIVE',
      metadata: {},
    },
  ]);
  seed('core_workflow_task', [
    {
      id: TASK_L1,
      workflow_instance_id: INST_ID,
      task_code: 'BN_SUS_L1',
      step_code: 'L1',
      assigned_to_user_id: USER,
      assigned_to_role_key: 'BN_SUPERVISOR',
      assigned_to_permission_key: null,
      task_status: 'PENDING',
      due_at: '2024-02-10T00:00:00Z',
      claimed_by: null,
      completed_by: null,
      completed_at: null,
      outcome: null,
      metadata: { approval_level: 1, workbasket_id: WB_A, policy_id: 'p1', correlation_id: 'corr-1' },
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: TASK_L2,
      workflow_instance_id: INST_ID,
      task_code: 'BN_SUS_L2',
      step_code: 'L2',
      assigned_to_user_id: null,
      assigned_to_role_key: 'BN_MANAGER',
      task_status: 'PENDING',
      due_at: null,
      claimed_by: null,
      completed_by: null,
      completed_at: null,
      outcome: null,
      metadata: { approval_level: 2, workbasket_id: WB_A, policy_id: 'p2' },
      is_active: true,
      created_at: '2024-01-15T11:00:00Z',
    },
    {
      // Completed task on same instance — must be excluded from My Approvals.
      id: TASK_COMPLETED,
      workflow_instance_id: INST_ID,
      task_code: 'BN_SUS_L0',
      task_status: 'COMPLETED',
      assigned_to_user_id: USER,
      assigned_to_role_key: null,
      due_at: null,
      claimed_by: null,
      completed_by: USER,
      completed_at: '2024-01-15T09:00:00Z',
      outcome: 'APPROVED',
      metadata: { approval_level: 0 },
      is_active: false,
      created_at: '2024-01-15T08:00:00Z',
    },
    {
      // Task on a NON-suspension workflow — must be excluded.
      id: TASK_OTHER_DOMAIN,
      workflow_instance_id: INST_OTHER,
      task_code: 'CLAIM_REVIEW',
      task_status: 'PENDING',
      assigned_to_user_id: USER,
      metadata: { approval_level: 1 },
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
    },
  ]);
  seed('bn_workbasket', [
    { id: WB_A, basket_code: 'BEN_SUPS', basket_name: 'Benefits Supervisors' },
  ]);
  seed('bn_workbasket_role', []);
  seed('bn_role_delegation', []);
  seed('bn_approval_policy', [
    { id: 'p1', level: 1, action_code: 'SUSPEND', policy_area: 'AWARD_SUSPENSION', is_enabled: true },
    { id: 'p2', level: 2, action_code: 'SUSPEND', policy_area: 'AWARD_SUSPENSION', is_enabled: true },
  ]);
  seed('v_bn_user_effective_roles', []);
  seed('bn_reason_code', [
    {
      reason_code: 'MEDICAL_PENDING',
      reason_label: 'Medical evidence pending',
      applicable_actions: ['SUSPEND', 'HOLD'],
      is_active: true,
      requires_narrative: false,
    },
    {
      reason_code: 'RETURN_TO_WORK',
      reason_label: 'Return to work',
      applicable_actions: ['DISCONTINUE', 'SUSPEND'],
      is_active: true,
      requires_narrative: false,
    },
    {
      reason_code: 'UNRELATED',
      reason_label: 'Something else',
      applicable_actions: ['DISCONTINUE'],
      is_active: true,
      requires_narrative: false,
    },
  ]);
  seed('core_workflow_action_log', [
    {
      id: 'log-1',
      workflow_instance_id: INST_ID,
      workflow_task_id: TASK_COMPLETED,
      action_type: 'APPROVE_L0',
      action_name: 'Level 0 approved',
      actor_user_id: USER,
      actor_name: 'Jane Approver',
      before_status: 'PROPOSED',
      after_status: 'PENDING_APPROVAL',
      reason: null,
      comments: 'ok',
      action_at: '2024-01-15T09:05:00Z',
      metadata: { correlation_id: 'corr-1' },
    },
  ]);
  seed('core_audit_log', [
    {
      id: 'audit-1',
      event_time: '2024-01-15T09:00:00Z',
      action: 'CREATE',
      event_name: 'Suspension proposed',
      actor_user_id: 'u-proposer',
      actor_name: 'Proposer',
      before_value: null,
      after_value: { status: 'PROPOSED' },
      metadata: { permission_action: 'bn_award_suspension.propose', policy_id: 'p1', approval_level: 1 },
      correlation_id: 'corr-1',
    },
  ]);
  seed('app_modules', [
    {
      name: 'bn_award_suspension',
      is_enabled: true,
      actions_enabled: false,
      show_in_menu: false,
      rollout_state: 'public',
    },
  ]);
};

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(rpcHandlers)) delete rpcHandlers[k];
  seedAll();
});

describe('BN-UI-S1.1 · canonical schema mapping', () => {
  it('exposes only allow-listed read RPCs', () => {
    expect([...ALLOWED_READ_RPCS]).toEqual(['bn_workbaskets_for_user']);
  });

  it('lists suspension requests with canonical workflow-task and workbasket fields', async () => {
    const rows = await listSuspensionRequests();
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.requestId).toBe(EVENT_ID);
    expect(r.currentTaskCode).toBe('BN_SUS_L1');
    expect(r.currentApprovalLevel).toBe(1);
    expect(r.totalApprovalLevels).toBe(2);
    expect(r.assignedRole).toBe('BN_SUPERVISOR');
    expect(r.assignedWorkbasketId).toBe(WB_A);
    expect(r.assignedWorkbasketCode).toBe('BEN_SUPS');
    expect(r.assignedWorkbasketName).toBe('Benefits Supervisors');
    expect(r.directTaskOwner).toBe(USER);
    expect(r.taskStatus).toBe('PENDING');
    expect(r.dueAt).toBe('2024-02-10T00:00:00Z');
    expect(r.policyId).toBe('p1');
  });

  it('reason-code loader returns only reasons with SUSPEND in applicable_actions', async () => {
    const rs = await listSuspensionReasonCodes();
    expect(rs.map((r) => r.code).sort()).toEqual(['MEDICAL_PENDING', 'RETURN_TO_WORK']);
  });

  it('reason-code loader returns [] when no active suspension reasons are configured', async () => {
    seed('bn_reason_code', []);
    const rs = await listSuspensionReasonCodes();
    expect(rs).toEqual([]);
  });

  it('getAwardSuspensionRolloutState reflects app_modules row', async () => {
    const s = await getAwardSuspensionRolloutState();
    expect(s.moduleEnabled).toBe(true);
    expect(s.actionsEnabled).toBe(false);
    expect(s.showInMenu).toBe(false);
    expect(s.effectiveActionsEnabled).toBe(false);
  });

  it('My Approvals: DIRECT assignment matches', async () => {
    const rows = await listMyApprovalTasks(USER);
    // Two tasks match: L1 direct, L2 not direct but no role/workbasket match here
    const direct = rows.find((r) => r.taskId === TASK_L1);
    expect(direct?.assignmentReason).toBe('DIRECT');
  });

  it('My Approvals: ROLE assignment via v_bn_user_effective_roles', async () => {
    seed('v_bn_user_effective_roles', [{ user_id: USER, role_name: 'BN_MANAGER', source: 'role' }]);
    const rows = await listMyApprovalTasks(USER);
    const roleTask = rows.find((r) => r.taskId === TASK_L2);
    expect(roleTask?.assignmentReason).toBe('ROLE');
  });

  it('My Approvals: WORKBASKET assignment via bn_workbaskets_for_user RPC', async () => {
    // Remove direct assignment so L1 must qualify via workbasket
    tables['core_workflow_task'].rows = tables['core_workflow_task'].rows.map((t) =>
      t.id === TASK_L1 ? { ...t, assigned_to_user_id: null } : t
    );
    rpcHandlers['bn_workbaskets_for_user'] = () => [
      { workbasket_id: WB_A, basket_code: 'BEN_SUPS', basket_name: 'x', role_name: 'BN_SUPERVISOR', is_primary: true },
    ];
    const rows = await listMyApprovalTasks(USER);
    const wbTask = rows.find((r) => r.taskId === TASK_L1);
    expect(wbTask?.assignmentReason).toBe('WORKBASKET');
  });

  it('My Approvals: active DELEGATION on the assigned role qualifies', async () => {
    tables['core_workflow_task'].rows = tables['core_workflow_task'].rows.map((t) =>
      t.id === TASK_L2 ? { ...t, assigned_to_user_id: null } : t
    );
    seed('bn_role_delegation', [
      {
        id: 'd-1',
        to_user_id: USER,
        role_name: 'BN_MANAGER',
        workbasket_id: null,
        valid_from: '2024-01-01T00:00:00Z',
        valid_to: '2099-01-01T00:00:00Z',
        status: 'APPROVED',
      },
    ]);
    const rows = await listMyApprovalTasks(USER);
    const dTask = rows.find((r) => r.taskId === TASK_L2);
    expect(dTask?.assignmentReason).toBe('DELEGATION');
  });

  it('My Approvals: EXPIRED delegations are excluded', async () => {
    tables['core_workflow_task'].rows = tables['core_workflow_task'].rows.map((t) =>
      t.id === TASK_L2 ? { ...t, assigned_to_user_id: null } : t
    );
    seed('bn_role_delegation', [
      {
        id: 'd-2',
        to_user_id: USER,
        role_name: 'BN_MANAGER',
        workbasket_id: null,
        valid_from: '2023-01-01T00:00:00Z',
        valid_to: '2023-06-01T00:00:00Z',
        status: 'APPROVED',
      },
    ]);
    const rows = await listMyApprovalTasks(USER);
    expect(rows.find((r) => r.taskId === TASK_L2)).toBeUndefined();
  });

  it('My Approvals: excludes completed tasks and non-suspension workflows', async () => {
    const rows = await listMyApprovalTasks(USER);
    expect(rows.find((r) => r.taskId === TASK_COMPLETED)).toBeUndefined();
    expect(rows.find((r) => r.taskId === TASK_OTHER_DOMAIN)).toBeUndefined();
  });

  it('request details map action_log using canonical columns and build approval route', async () => {
    const details = await getSuspensionRequestDetails(EVENT_ID);
    expect(details).not.toBeNull();
    expect(details!.timeline[0].action).toBe('PROPOSED');
    // Mapped from core_workflow_action_log (action_name, before_status, after_status)
    const mapped = details!.timeline.find((t) => t.action === 'Level 0 approved');
    expect(mapped?.fromStatus).toBe('PROPOSED');
    expect(mapped?.toStatus).toBe('PENDING_APPROVAL');

    // Approval route uses the two policy levels + tasks
    const levels = details!.approvalRoute.map((r) => r.level).sort();
    expect(levels).toEqual([1, 2]);
    expect(details!.approvalRoute.find((r) => r.level === 1)?.workbasketCode).toBe('BEN_SUPS');
    expect(details!.approvalRoute.find((r) => r.level === 1)?.policyId).toBe('p1');
  });

  it('request details expose actual audit entries from core_audit_log', async () => {
    const details = await getSuspensionRequestDetails(EVENT_ID);
    expect(details!.audit).toHaveLength(1);
    const a = details!.audit[0];
    expect(a.actionName).toBe('Suspension proposed');
    expect(a.permissionAction).toBe('bn_award_suspension.propose');
    expect(a.correlationId).toBe('corr-1');
    expect(a.approvalLevel).toBe(1);
  });
});
