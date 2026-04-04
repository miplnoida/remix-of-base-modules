import { useQuery } from '@tanstack/react-query';
import * as histService from '@/services/bn/historicalInquiryService';
import type { HistoricalSearchFilters } from '@/services/bn/historicalInquiryService';

export function useBnHistoricalClaims(filters: HistoricalSearchFilters | null) {
  return useQuery({
    queryKey: ['bn', 'history', 'claims', filters],
    queryFn: () => histService.searchHistoricalClaims(filters!),
    enabled: !!filters && filters.search_type === 'claims',
  });
}

export function useBnHistoricalDisbursements(filters: HistoricalSearchFilters | null) {
  return useQuery({
    queryKey: ['bn', 'history', 'disbursements', filters],
    queryFn: () => histService.searchHistoricalDisbursements(filters!),
    enabled: !!filters && filters.search_type === 'disbursements',
  });
}

export function useBnHistoricalClaimDetail(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'history', 'claim-detail', claimId],
    queryFn: () => histService.fetchHistoricalClaimDetail(claimId!),
    enabled: !!claimId,
  });
}

export function useBnHistoricalStats(ssn?: string) {
  return useQuery({
    queryKey: ['bn', 'history', 'stats', ssn],
    queryFn: () => histService.getHistoricalStats(ssn),
  });
}
