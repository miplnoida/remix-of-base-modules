import { useQuery } from "@tanstack/react-query";
import {
  loadDuplicateAnalysis,
  loadBusinessContext,
  loadSourceContext,
} from "@/services/legal/lgIntakeDecisionService";
import type { IntakeRow } from "@/services/legal/lgIntakeQualificationService";

export function useIntakeDuplicates(intake?: IntakeRow | null) {
  return useQuery({
    queryKey: ["lg_intake_duplicates", intake?.id],
    queryFn: () => loadDuplicateAnalysis(intake!),
    enabled: !!intake?.id,
    staleTime: 60_000,
  });
}

export function useIntakeBusinessContext(intake?: IntakeRow | null) {
  return useQuery({
    queryKey: ["lg_intake_business_context", intake?.id],
    queryFn: () => loadBusinessContext(intake!),
    enabled: !!intake?.id,
    staleTime: 60_000,
  });
}

export function useIntakeSourceContext(intake?: IntakeRow | null) {
  return useQuery({
    queryKey: ["lg_intake_source_context", intake?.id],
    queryFn: () => loadSourceContext(intake!),
    enabled: !!intake?.id,
    staleTime: 60_000,
  });
}
