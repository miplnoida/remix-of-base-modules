import { useQuery } from '@tanstack/react-query';
import { useWorkflowActions, useExecuteWorkflowAction } from '@/hooks/useWorkflowActions';
import {
  BN_WORKFLOW_MODULES,
  type BnWorkflowModule,
  checkWorkflowGovernance,
  checkBnEscalations,
} from '@/services/bn/bnWorkflowIntegrationService';

/**
 * Detects whether a BN entity is governed by the enterprise workflow engine
 * or falls through to BN's own transition matrix (CLAIM_TRANSITIONS).
 */
export function useBnWorkflowGovernance(sourceModule: BnWorkflowModule, entityId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'workflow-governance', sourceModule, entityId],
    queryFn: () => checkWorkflowGovernance(sourceModule, entityId!),
    enabled: !!entityId,
    staleTime: 60000,
  });
}

/**
 * Wraps the generic useWorkflowActions hook for BN sub-modules.
 * Returns the full workflow context including available actions,
 * current step, and whether the user can act.
 */
export function useBnWorkflowActions(sourceModule: BnWorkflowModule, entityId: string | null) {
  return useWorkflowActions(sourceModule, entityId);
}

/**
 * Re-exports the generic execute action hook for BN usage.
 */
export function useBnExecuteWorkflowAction() {
  return useExecuteWorkflowAction();
}

/**
 * Fetches overdue BN workflow tasks for escalation dashboards.
 */
export function useBnEscalations() {
  return useQuery({
    queryKey: ['bn', 'escalations'],
    queryFn: checkBnEscalations,
    refetchInterval: 300000, // 5 min
  });
}

export { BN_WORKFLOW_MODULES };
