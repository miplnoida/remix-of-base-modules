import { useQuery } from "@tanstack/react-query";
import {
  useWorkflowActions,
  useExecuteWorkflowAction,
} from "@/hooks/useWorkflowActions";
import {
  LG_WORKFLOW_MODULES,
  type LgWorkflowModule,
  checkLgWorkflowGovernance,
  checkLgEscalations,
} from "@/services/legal/lgWorkflowIntegrationService";

/**
 * Governance detector — is a given LG entity being driven by
 * the enterprise workflow engine?
 */
export function useLgWorkflowGovernance(
  sourceModule: LgWorkflowModule,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ["lg", "workflow-governance", sourceModule, entityId],
    queryFn: () => checkLgWorkflowGovernance(sourceModule, entityId!),
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

/** Thin re-export so LG screens don't import from bn/. */
export function useLgWorkflowActions(
  sourceModule: LgWorkflowModule,
  entityId: string | null,
) {
  return useWorkflowActions(sourceModule, entityId);
}

export function useLgExecuteWorkflowAction() {
  return useExecuteWorkflowAction();
}

export function useLgEscalations() {
  return useQuery({
    queryKey: ["lg", "escalations"],
    queryFn: checkLgEscalations,
    refetchInterval: 5 * 60_000,
  });
}

export { LG_WORKFLOW_MODULES };
