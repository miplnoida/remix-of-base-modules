import { useQuery } from '@tanstack/react-query';
import * as svc from '@/services/bn/awards/awardService';

export function useBnAwards(filters: svc.AwardFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'awards', filters],
    queryFn: () => svc.fetchAwards(filters),
  });
}

export function useBnAwardDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'award', id],
    queryFn: () => svc.fetchAwardDetail(id!),
    enabled: !!id,
  });
}

export function useBnAwardAdjustments() {
  return useQuery({
    queryKey: ['bn', 'award-adjustments'],
    queryFn: () => svc.fetchAwardAdjustments(),
  });
}
