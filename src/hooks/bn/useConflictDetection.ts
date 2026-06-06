import { useQuery } from '@tanstack/react-query';
import { detectProductVersionConflicts } from '@/services/bn/config/conflictDetectionService';

export function useConflictDetection(versionId?: string) {
  return useQuery({
    queryKey: ['bn', 'conflicts', versionId],
    queryFn: () => detectProductVersionConflicts(versionId!),
    enabled: !!versionId,
    staleTime: 15_000,
  });
}
