/**
 * React hooks for consuming BN integration adapters
 */
import { useQuery } from '@tanstack/react-query';
import { bnPersonAdapter, bnContributionAdapter, bnEmployerAdapter } from '@/services/bn/integration';
import type { PersonSummary, ContributionSummary, EmployerSummary } from '@/services/bn/integration';

/** Look up a person by SSN for claim intake */
export function useBnPersonLookup(ssn: string | undefined) {
  return useQuery<PersonSummary | null>({
    queryKey: ['bn-person', ssn],
    queryFn: () => bnPersonAdapter.lookupPerson(ssn!),
    enabled: !!ssn && ssn.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get contribution summary for eligibility check */
export function useBnContributionSummary(
  ssn: string | undefined,
  windowStart: string | undefined,
  windowEnd: string | undefined
) {
  return useQuery<ContributionSummary>({
    queryKey: ['bn-contributions', ssn, windowStart, windowEnd],
    queryFn: () => bnContributionAdapter.getContributionSummary(ssn!, windowStart!, windowEnd!),
    enabled: !!ssn && !!windowStart && !!windowEnd,
    staleTime: 5 * 60 * 1000,
  });
}

/** Look up employer for claim context */
export function useBnEmployerLookup(regNo: string | undefined) {
  return useQuery<EmployerSummary | null>({
    queryKey: ['bn-employer', regNo],
    queryFn: () => bnEmployerAdapter.lookupEmployer(regNo!),
    enabled: !!regNo && regNo.trim().length > 0,
    staleTime: 10 * 60 * 1000,
  });
}
