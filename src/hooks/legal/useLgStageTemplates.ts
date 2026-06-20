import { useQuery } from "@tanstack/react-query";
import {
  listTemplatesForStage,
  getStageCompleteness,
  listMissingRequiredForCase,
} from "@/services/legal/lgStageTemplateService";

export function useStageTemplates(stage: string | null | undefined) {
  return useQuery({
    queryKey: ["lg_stage_templates", stage],
    queryFn: () => listTemplatesForStage(stage),
    enabled: !!stage,
    staleTime: 60_000,
  });
}

export function useStageTemplateCompleteness() {
  return useQuery({
    queryKey: ["lg_stage_template_completeness"],
    queryFn: getStageCompleteness,
    staleTime: 60_000,
  });
}

export function useMissingRequiredForCase(caseId?: string, stage?: string | null) {
  return useQuery({
    queryKey: ["lg_missing_required", caseId, stage],
    queryFn: () => listMissingRequiredForCase(caseId as string, stage as string),
    enabled: !!caseId && !!stage,
    staleTime: 30_000,
  });
}
