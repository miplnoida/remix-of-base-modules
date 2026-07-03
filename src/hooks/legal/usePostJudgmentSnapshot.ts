import { useQuery } from "@tanstack/react-query";
import { loadPostJudgmentSnapshot } from "@/services/legal/postJudgment/postJudgmentSnapshotService";

export function usePostJudgmentSnapshot(caseId: string | undefined) {
  return useQuery({
    queryKey: ["legal", "post-judgment", "snapshot", caseId],
    queryFn: () => loadPostJudgmentSnapshot(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}
