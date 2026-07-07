import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/platform/audit/auditService';
import { WORKFLOW_EVENTS } from './workflowEvents';
import type {
  WorkflowActionLog,
  WorkflowDefinition,
  WorkflowDefinitionFormValues,
  WorkflowDelegationRule,
  WorkflowEscalationRule,
  WorkflowFilters,
  WorkflowInboxFilters,
  WorkflowInstance,
  WorkflowStep,
  WorkflowStepFormValues,
  WorkflowTask,
  WorkflowTransition,
  WorkflowTransitionFormValues,
} from './workflowTypes';

const db = supabase as any;

const T = {
  DEF: 'core_workflow_definition',
  STEP: 'core_workflow_step',
  TRAN: 'core_workflow_transition',
  INST: 'core_workflow_instance',
  TASK: 'core_workflow_task',
  LOG: 'core_workflow_action_log',
  DELEG: 'core_workflow_delegation_rule',
  ESC: 'core_workflow_escalation_rule',
} as const;

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch { return null; }
}

async function writeActionLog(payload: Partial<WorkflowActionLog>) {
  await db.from(T.LOG).insert({ ...payload });
}

// ============ Definitions ============
export async function getWorkflowDefinitions(filters: WorkflowFilters = {}): Promise<WorkflowDefinition[]> {
  let q = db.from(T.DEF).select('*').order('workflow_name', { ascending: true });
  if (filters.module_code) q = q.eq('module_code', filters.module_code);
  if (filters.entity_type) q = q.eq('entity_type', filters.entity_type);
  if (filters.workflow_status) q = q.eq('workflow_status', filters.workflow_status);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.search) q = q.or(`workflow_name.ilike.%${filters.search}%,workflow_code.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkflowDefinition[];
}

export async function getWorkflowDefinition(id: string): Promise<WorkflowDefinition | null> {
  const { data, error } = await db.from(T.DEF).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as WorkflowDefinition | null;
}

export async function createWorkflowDefinition(payload: WorkflowDefinitionFormValues): Promise<WorkflowDefinition> {
  const uid = await currentUserId();
  const { data, error } = await db.from(T.DEF).insert({ ...payload, created_by: uid }).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.definition.created,
    action: 'CREATE', module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_definition', entity_id: data.id,
    entity_display_name: data.workflow_name, after_value: data as any,
  });
  return data as WorkflowDefinition;
}

export async function updateWorkflowDefinition(id: string, payload: WorkflowDefinitionFormValues): Promise<WorkflowDefinition> {
  const before = await getWorkflowDefinition(id);
  const { data, error } = await db.from(T.DEF).update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.definition.updated,
    action: 'UPDATE', module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_definition', entity_id: id,
    entity_display_name: data.workflow_name,
    before_value: (before ?? undefined) as any, after_value: data as any,
  });
  return data as WorkflowDefinition;
}

export async function activateWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  const uid = await currentUserId();
  const { data, error } = await db.from(T.DEF)
    .update({ workflow_status: 'ACTIVE', is_active: true, approved_by: uid, approved_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.definition.activated,
    action: 'ACTIVATE', module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_definition', entity_id: id,
    entity_display_name: data.workflow_name, risk_level: 'HIGH', is_sensitive: true,
  });
  return data as WorkflowDefinition;
}

export async function retireWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  const { data, error } = await db.from(T.DEF)
    .update({ workflow_status: 'RETIRED', is_active: false })
    .eq('id', id).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.definition.retired,
    action: 'RETIRE', module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_definition', entity_id: id,
    entity_display_name: data.workflow_name, risk_level: 'HIGH', is_sensitive: true, severity: 'WARNING',
  });
  return data as WorkflowDefinition;
}

export async function deactivateWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  const { data, error } = await db.from(T.DEF)
    .update({ is_active: false, workflow_status: 'INACTIVE' })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as WorkflowDefinition;
}

// ============ Steps ============
export async function getWorkflowSteps(workflowDefinitionId: string): Promise<WorkflowStep[]> {
  const { data, error } = await db.from(T.STEP)
    .select('*').eq('workflow_definition_id', workflowDefinitionId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowStep[];
}

export async function createWorkflowStep(payload: WorkflowStepFormValues): Promise<WorkflowStep> {
  const { data, error } = await db.from(T.STEP).insert(payload).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.step.created, action: 'CREATE',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_step', entity_id: data.id, after_value: data as any,
  });
  return data as WorkflowStep;
}

export async function updateWorkflowStep(id: string, payload: WorkflowStepFormValues): Promise<WorkflowStep> {
  const { data: before } = await db.from(T.STEP).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(T.STEP).update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.step.updated, action: 'UPDATE',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_step', entity_id: id, before_value: (before ?? undefined) as any, after_value: data as any,
  });
  return data as WorkflowStep;
}

export const deactivateWorkflowStep = (id: string) => updateWorkflowStep(id, { is_active: false });
export const reactivateWorkflowStep = (id: string) => updateWorkflowStep(id, { is_active: true });

// ============ Transitions ============
export async function getWorkflowTransitions(workflowDefinitionId: string): Promise<WorkflowTransition[]> {
  const { data, error } = await db.from(T.TRAN)
    .select('*').eq('workflow_definition_id', workflowDefinitionId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowTransition[];
}

export async function createWorkflowTransition(payload: WorkflowTransitionFormValues): Promise<WorkflowTransition> {
  const { data, error } = await db.from(T.TRAN).insert(payload).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.transition.created, action: 'CREATE',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_transition', entity_id: data.id, after_value: data as any,
  });
  return data as WorkflowTransition;
}

export async function updateWorkflowTransition(id: string, payload: WorkflowTransitionFormValues): Promise<WorkflowTransition> {
  const { data: before } = await db.from(T.TRAN).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(T.TRAN).update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction({
    event_code: WORKFLOW_EVENTS.transition.updated, action: 'UPDATE',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_transition', entity_id: id, before_value: (before ?? undefined) as any, after_value: data as any,
  });
  return data as WorkflowTransition;
}

export const deactivateWorkflowTransition = (id: string) => updateWorkflowTransition(id, { is_active: false });
export const reactivateWorkflowTransition = (id: string) => updateWorkflowTransition(id, { is_active: true });

// ============ Instances ============
export async function startWorkflow(payload: Partial<WorkflowInstance> & {
  workflow_code: string; module_code: string; entity_type: string; entity_id: string;
}): Promise<WorkflowInstance> {
  const def = await db.from(T.DEF)
    .select('*').eq('workflow_code', payload.workflow_code)
    .eq('is_active', true).order('version', { ascending: false }).limit(1).maybeSingle();
  const definition = def.data as WorkflowDefinition | null;
  const insertBody: any = {
    ...payload,
    workflow_definition_id: definition?.id ?? null,
    workflow_version: definition?.version ?? null,
    current_step_code: definition?.start_step_code ?? null,
    status: 'SUBMITTED',
    submitted_by: await currentUserId(),
    submitted_at: new Date().toISOString(),
  };
  const { data, error } = await db.from(T.INST).insert(insertBody).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.id, action_type: 'SUBMIT', action_name: 'Start Workflow',
    to_step_code: data.current_step_code, after_status: data.status, outcome: 'SUCCESS',
    actor_user_id: await currentUserId(),
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.instance.started, action: 'SUBMIT',
    module_code: data.module_code, domain_code: 'OPERATIONS',
    entity_type: data.entity_type, entity_id: data.entity_id,
    entity_display_name: data.entity_display_name ?? null, after_value: data as any,
  });
  return data as WorkflowInstance;
}

export async function getWorkflowInstance(id: string): Promise<WorkflowInstance | null> {
  const { data, error } = await db.from(T.INST).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as WorkflowInstance | null;
}

export async function getWorkflowInstanceForEntity(moduleCode: string, entityType: string, entityId: string, workflowCode: string) {
  const { data, error } = await db.from(T.INST).select('*')
    .eq('module_code', moduleCode).eq('entity_type', entityType)
    .eq('entity_id', entityId).eq('workflow_code', workflowCode).maybeSingle();
  if (error) throw error;
  return (data ?? null) as WorkflowInstance | null;
}

async function transitionInstance(
  instanceId: string,
  patch: Partial<WorkflowInstance>,
  event: string,
  actionType: string,
  extra: { reason?: string; comments?: string; taskId?: string; requiresReason?: boolean } = {},
) {
  if (extra.requiresReason && !extra.reason) throw new Error('A reason is required for this action.');
  const before = await getWorkflowInstance(instanceId);
  const { data, error } = await db.from(T.INST).update(patch).eq('id', instanceId).select().single();
  if (error) throw error;
  const uid = await currentUserId();
  await writeActionLog({
    workflow_instance_id: instanceId, workflow_task_id: extra.taskId ?? null,
    action_type: actionType as any, action_name: actionType,
    from_step_code: before?.current_step_code ?? null,
    to_step_code: data.current_step_code, before_status: before?.status ?? null,
    after_status: data.status, outcome: 'SUCCESS',
    reason: extra.reason ?? null, comments: extra.comments ?? null,
    actor_user_id: uid,
  });
  await logAction({
    event_code: event, action: actionType,
    module_code: data.module_code, domain_code: 'OPERATIONS',
    entity_type: data.entity_type, entity_id: data.entity_id,
    entity_display_name: data.entity_display_name ?? null,
    before_value: (before ?? undefined) as any, after_value: data as any,
    reason: extra.reason ?? undefined, notes: extra.comments ?? undefined,
  });
  return data as WorkflowInstance;
}

export const submitWorkflow = (id: string, comments?: string) =>
  transitionInstance(id, { status: 'SUBMITTED', submitted_at: new Date().toISOString() },
    WORKFLOW_EVENTS.instance.submitted, 'SUBMIT', { comments });

export const approveWorkflow = (id: string, taskId?: string, comments?: string) =>
  transitionInstance(id, { status: 'APPROVED' }, WORKFLOW_EVENTS.instance.approved, 'APPROVE', { comments, taskId });

export const rejectWorkflow = (id: string, taskId: string | undefined, reason: string, comments?: string) =>
  transitionInstance(id, { status: 'REJECTED' }, WORKFLOW_EVENTS.instance.rejected, 'REJECT',
    { reason, comments, taskId, requiresReason: true });

export const returnWorkflow = (id: string, taskId: string | undefined, reason: string, comments?: string) =>
  transitionInstance(id, { status: 'RETURNED' }, WORKFLOW_EVENTS.instance.returned, 'RETURN',
    { reason, comments, taskId, requiresReason: true });

export const withdrawWorkflow = (id: string, reason?: string) =>
  transitionInstance(id, { status: 'WITHDRAWN' }, WORKFLOW_EVENTS.instance.withdrawn, 'WITHDRAW', { reason });

export const cancelWorkflow = (id: string, reason?: string) =>
  transitionInstance(id, {
    status: 'CANCELLED', cancellation_reason: reason ?? null,
    cancelled_at: new Date().toISOString(),
  }, WORKFLOW_EVENTS.instance.cancelled, 'CANCEL', { reason, requiresReason: true });

export const completeWorkflow = (id: string) =>
  transitionInstance(id, { status: 'COMPLETED', completed_at: new Date().toISOString() },
    WORKFLOW_EVENTS.instance.completed, 'COMPLETE', {});

// ============ Tasks / inbox ============
export async function getWorkflowTasks(filters: WorkflowInboxFilters = {}): Promise<WorkflowTask[]> {
  let q = db.from(T.TASK).select('*').eq('is_active', true).order('due_at', { ascending: true, nullsFirst: false });
  if (filters.status && filters.status !== 'ALL') q = q.eq('task_status', filters.status);
  if (filters.priority && filters.priority !== 'ALL') q = q.eq('priority', filters.priority);
  if (filters.search) q = q.ilike('task_name', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkflowTask[];
}

export async function getMyWorkflowTasks(filters: WorkflowInboxFilters = {}): Promise<WorkflowTask[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  let q = db.from(T.TASK).select('*').eq('is_active', true).eq('assigned_to_user_id', uid)
    .order('due_at', { ascending: true, nullsFirst: false });
  if (filters.status && filters.status !== 'ALL') q = q.eq('task_status', filters.status);
  if (filters.priority && filters.priority !== 'ALL') q = q.eq('priority', filters.priority);
  if (filters.search) q = q.ilike('task_name', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkflowTask[];
}

export async function claimWorkflowTask(taskId: string): Promise<WorkflowTask> {
  const uid = await currentUserId();
  const { data, error } = await db.from(T.TASK).update({
    task_status: 'CLAIMED', claimed_by: uid, claimed_at: new Date().toISOString(),
    assigned_to_user_id: uid,
  }).eq('id', taskId).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.workflow_instance_id, workflow_task_id: taskId,
    action_type: 'CLAIM', outcome: 'SUCCESS', actor_user_id: uid,
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.task.claimed, action: 'CLAIM',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_task', entity_id: taskId,
    entity_display_name: data.task_name,
  });
  return data as WorkflowTask;
}

export async function completeWorkflowTask(taskId: string, outcome: string, comments?: string): Promise<WorkflowTask> {
  const uid = await currentUserId();
  const { data, error } = await db.from(T.TASK).update({
    task_status: 'COMPLETED', outcome, comments: comments ?? null,
    completed_by: uid, completed_at: new Date().toISOString(),
  }).eq('id', taskId).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.workflow_instance_id, workflow_task_id: taskId,
    action_type: 'COMPLETE', outcome: 'SUCCESS', comments: comments ?? null, actor_user_id: uid,
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.task.completed, action: 'COMPLETE',
    module_code: 'CORE', domain_code: 'OPERATIONS',
    entity_type: 'workflow_task', entity_id: taskId,
    entity_display_name: data.task_name, notes: comments,
  });
  return data as WorkflowTask;
}

export async function reassignWorkflowTask(taskId: string, assigneeUserId: string): Promise<WorkflowTask> {
  const { data, error } = await db.from(T.TASK).update({
    assigned_to_user_id: assigneeUserId, task_status: 'OPEN',
    claimed_by: null, claimed_at: null,
  }).eq('id', taskId).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.workflow_instance_id, workflow_task_id: taskId,
    action_type: 'REASSIGN', outcome: 'SUCCESS', actor_user_id: await currentUserId(),
    metadata: { assignee_user_id: assigneeUserId },
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.task.reassigned, action: 'REASSIGN',
    module_code: 'CORE', domain_code: 'OPERATIONS', risk_level: 'HIGH', is_sensitive: true,
    entity_type: 'workflow_task', entity_id: taskId, entity_display_name: data.task_name,
    metadata: { assignee_user_id: assigneeUserId },
  });
  return data as WorkflowTask;
}

export async function delegateWorkflowTask(taskId: string, delegateUserId: string, reason?: string): Promise<WorkflowTask> {
  const { data, error } = await db.from(T.TASK).update({
    assigned_to_user_id: delegateUserId,
  }).eq('id', taskId).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.workflow_instance_id, workflow_task_id: taskId,
    action_type: 'DELEGATE', outcome: 'SUCCESS', reason: reason ?? null,
    actor_user_id: await currentUserId(),
    metadata: { delegate_user_id: delegateUserId },
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.task.delegated, action: 'DELEGATE',
    module_code: 'CORE', domain_code: 'OPERATIONS', risk_level: 'HIGH', is_sensitive: true,
    entity_type: 'workflow_task', entity_id: taskId, entity_display_name: data.task_name,
    reason, metadata: { delegate_user_id: delegateUserId },
  });
  return data as WorkflowTask;
}

export async function escalateWorkflowTask(taskId: string, reason?: string): Promise<WorkflowTask> {
  const { data, error } = await db.from(T.TASK).update({
    task_status: 'ESCALATED', priority: 'HIGH',
  }).eq('id', taskId).select().single();
  if (error) throw error;
  await writeActionLog({
    workflow_instance_id: data.workflow_instance_id, workflow_task_id: taskId,
    action_type: 'ESCALATE', outcome: 'SUCCESS', reason: reason ?? null,
    actor_user_id: await currentUserId(),
  });
  await logAction({
    event_code: WORKFLOW_EVENTS.task.escalated, action: 'ESCALATE',
    module_code: 'CORE', domain_code: 'OPERATIONS', risk_level: 'HIGH', is_sensitive: true,
    entity_type: 'workflow_task', entity_id: taskId, entity_display_name: data.task_name,
    reason, severity: 'WARNING',
  });
  return data as WorkflowTask;
}

// ============ Logs & rules ============
export async function getWorkflowActionLogs(instanceId: string): Promise<WorkflowActionLog[]> {
  const { data, error } = await db.from(T.LOG)
    .select('*').eq('workflow_instance_id', instanceId)
    .order('action_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkflowActionLog[];
}

export async function getWorkflowDelegationRules(workflowDefinitionId: string): Promise<WorkflowDelegationRule[]> {
  const { data, error } = await db.from(T.DELEG).select('*')
    .eq('workflow_definition_id', workflowDefinitionId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkflowDelegationRule[];
}

export async function createWorkflowDelegationRule(payload: Partial<WorkflowDelegationRule>): Promise<WorkflowDelegationRule> {
  const { data, error } = await db.from(T.DELEG).insert(payload).select().single();
  if (error) throw error;
  return data as WorkflowDelegationRule;
}

export async function updateWorkflowDelegationRule(id: string, payload: Partial<WorkflowDelegationRule>): Promise<WorkflowDelegationRule> {
  const { data, error } = await db.from(T.DELEG).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as WorkflowDelegationRule;
}

export async function getWorkflowEscalationRules(workflowDefinitionId: string): Promise<WorkflowEscalationRule[]> {
  const { data, error } = await db.from(T.ESC).select('*')
    .eq('workflow_definition_id', workflowDefinitionId).order('escalate_after_hours', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowEscalationRule[];
}

export async function createWorkflowEscalationRule(payload: Partial<WorkflowEscalationRule>): Promise<WorkflowEscalationRule> {
  const { data, error } = await db.from(T.ESC).insert(payload).select().single();
  if (error) throw error;
  return data as WorkflowEscalationRule;
}

export async function updateWorkflowEscalationRule(id: string, payload: Partial<WorkflowEscalationRule>): Promise<WorkflowEscalationRule> {
  const { data, error } = await db.from(T.ESC).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as WorkflowEscalationRule;
}

export const coreWorkflowService = {
  getWorkflowDefinitions, getWorkflowDefinition,
  createWorkflowDefinition, updateWorkflowDefinition,
  activateWorkflowDefinition, retireWorkflowDefinition, deactivateWorkflowDefinition,
  getWorkflowSteps, createWorkflowStep, updateWorkflowStep,
  deactivateWorkflowStep, reactivateWorkflowStep,
  getWorkflowTransitions, createWorkflowTransition, updateWorkflowTransition,
  deactivateWorkflowTransition, reactivateWorkflowTransition,
  startWorkflow, getWorkflowInstance, getWorkflowInstanceForEntity,
  submitWorkflow, approveWorkflow, rejectWorkflow, returnWorkflow,
  withdrawWorkflow, cancelWorkflow, completeWorkflow,
  getWorkflowTasks, getMyWorkflowTasks,
  claimWorkflowTask, completeWorkflowTask, reassignWorkflowTask,
  delegateWorkflowTask, escalateWorkflowTask,
  getWorkflowActionLogs,
  getWorkflowDelegationRules, createWorkflowDelegationRule, updateWorkflowDelegationRule,
  getWorkflowEscalationRules, createWorkflowEscalationRule, updateWorkflowEscalationRule,
};
