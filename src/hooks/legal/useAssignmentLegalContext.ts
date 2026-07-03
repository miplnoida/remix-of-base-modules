import { useQuery } from "@tanstack/react-query";
import { resolveAssignmentLegalContext } from "@/services/legal/postJudgment/lgAssignmentLegalContextService";

export function useAssignmentLegalContext(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["legal", "assignment", "legal-context", assignmentId],
    queryFn: () => resolveAssignmentLegalContext(assignmentId!),
    enabled: !!assignmentId,
    staleTime: 30_000,
  });
}
