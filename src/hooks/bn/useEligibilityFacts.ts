import { useQuery } from '@tanstack/react-query';
import { listEligibilityFacts } from '@/services/bn/eligibilityFactService';

export function useEligibilityFacts() {
  return useQuery({
    queryKey: ['bn', 'eligibility-facts'],
    queryFn: listEligibilityFacts,
    staleTime: 60_000,
  });
}
