import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coreWorkflowService } from './workflowService';
import type {
  WorkflowDefinitionFormValues, WorkflowFilters, WorkflowInboxFilters,
  WorkflowStepFormValues, WorkflowTransitionFormValues,
} from './workflowTypes';

const K = {
  defs: (f?: WorkflowFilters) => ['workflow', 'definitions', f ?? {}] as const,
  def: (id: string) => ['workflow', 'definition', id] as const,
  steps: (id: string) => ['workflow', 'steps', id] as const,
  transitions: (id: string) => ['workflow', 'transitions', id] as const,
  tasks: (f?: WorkflowInboxFilters) => ['workflow', 'tasks', f ?? {}] as const,
  myTasks: (f?: WorkflowInboxFilters) => ['workflow', 'my-tasks', f ?? {}] as const,
  logs: (id: string) => ['workflow', 'logs', id] as const,
  delegation: (id: string) => ['workflow', 'delegation', id] as const,
  escalation: (id: string) => ['workflow', 'escalation', id] as const,
};

export const useWorkflowDefinitions = (filters?: WorkflowFilters) =>
  useQuery({ queryKey: K.defs(filters), queryFn: () => coreWorkflowService.getWorkflowDefinitions(filters) });

export const useWorkflowDefinition = (id?: string) =>
  useQuery({ queryKey: K.def(id ?? ''), queryFn: () => coreWorkflowService.getWorkflowDefinition(id as string), enabled: !!id });

export const useCreateWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkflowDefinitionFormValues) => coreWorkflowService.createWorkflowDefinition(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', 'definitions'] }),
  });
};

export const useUpdateWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowDefinitionFormValues }) =>
      coreWorkflowService.updateWorkflowDefinition(id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['workflow', 'definitions'] });
      qc.invalidateQueries({ queryKey: K.def(v.id) });
    },
  });
};

export const useActivateWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coreWorkflowService.activateWorkflowDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', 'definitions'] }),
  });
};

export const useRetireWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coreWorkflowService.retireWorkflowDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', 'definitions'] }),
  });
};

export const useWorkflowSteps = (workflowDefinitionId?: string) =>
  useQuery({
    queryKey: K.steps(workflowDefinitionId ?? ''),
    queryFn: () => coreWorkflowService.getWorkflowSteps(workflowDefinitionId as string),
    enabled: !!workflowDefinitionId,
  });

export const useCreateWorkflowStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkflowStepFormValues) => coreWorkflowService.createWorkflowStep(payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.steps(v.workflow_definition_id as string) }),
  });
};

export const useUpdateWorkflowStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowStepFormValues }) =>
      coreWorkflowService.updateWorkflowStep(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', 'steps'] }),
  });
};

export const useWorkflowTransitions = (workflowDefinitionId?: string) =>
  useQuery({
    queryKey: K.transitions(workflowDefinitionId ?? ''),
    queryFn: () => coreWorkflowService.getWorkflowTransitions(workflowDefinitionId as string),
    enabled: !!workflowDefinitionId,
  });

export const useCreateWorkflowTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkflowTransitionFormValues) => coreWorkflowService.createWorkflowTransition(payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: K.transitions(v.workflow_definition_id as string) }),
  });
};

export const useUpdateWorkflowTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowTransitionFormValues }) =>
      coreWorkflowService.updateWorkflowTransition(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', 'transitions'] }),
  });
};

export const useWorkflowTasks = (filters?: WorkflowInboxFilters) =>
  useQuery({ queryKey: K.tasks(filters), queryFn: () => coreWorkflowService.getWorkflowTasks(filters) });

export const useMyWorkflowTasks = (filters?: WorkflowInboxFilters) =>
  useQuery({ queryKey: K.myTasks(filters), queryFn: () => coreWorkflowService.getMyWorkflowTasks(filters) });

const invalidateTasks = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
  qc.invalidateQueries({ queryKey: ['workflow', 'my-tasks'] });
};

export const useClaimWorkflowTask = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (taskId: string) => coreWorkflowService.claimWorkflowTask(taskId), onSuccess: () => invalidateTasks(qc) });
};

export const useCompleteWorkflowTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, outcome, comments }: { taskId: string; outcome: string; comments?: string }) =>
      coreWorkflowService.completeWorkflowTask(taskId, outcome, comments),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useApproveWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskId, comments }: { instanceId: string; taskId?: string; comments?: string }) =>
      coreWorkflowService.approveWorkflow(instanceId, taskId, comments),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useRejectWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskId, reason, comments }: { instanceId: string; taskId?: string; reason: string; comments?: string }) =>
      coreWorkflowService.rejectWorkflow(instanceId, taskId, reason, comments),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useReturnWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskId, reason, comments }: { instanceId: string; taskId?: string; reason: string; comments?: string }) =>
      coreWorkflowService.returnWorkflow(instanceId, taskId, reason, comments),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useReassignWorkflowTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, assigneeUserId }: { taskId: string; assigneeUserId: string }) =>
      coreWorkflowService.reassignWorkflowTask(taskId, assigneeUserId),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useDelegateWorkflowTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, delegateUserId, reason }: { taskId: string; delegateUserId: string; reason?: string }) =>
      coreWorkflowService.delegateWorkflowTask(taskId, delegateUserId, reason),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useEscalateWorkflowTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      coreWorkflowService.escalateWorkflowTask(taskId, reason),
    onSuccess: () => invalidateTasks(qc),
  });
};

export const useWorkflowActionLogs = (instanceId?: string) =>
  useQuery({
    queryKey: K.logs(instanceId ?? ''),
    queryFn: () => coreWorkflowService.getWorkflowActionLogs(instanceId as string),
    enabled: !!instanceId,
  });

export const useWorkflowDelegationRules = (id?: string) =>
  useQuery({
    queryKey: K.delegation(id ?? ''),
    queryFn: () => coreWorkflowService.getWorkflowDelegationRules(id as string),
    enabled: !!id,
  });

export const useWorkflowEscalationRules = (id?: string) =>
  useQuery({
    queryKey: K.escalation(id ?? ''),
    queryFn: () => coreWorkflowService.getWorkflowEscalationRules(id as string),
    enabled: !!id,
  });
