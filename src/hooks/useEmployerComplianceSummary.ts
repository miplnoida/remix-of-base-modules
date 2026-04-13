import { useQuery } from '@tanstack/react-query';
import {
  fetchEmployerComplianceSummary,
  EMPTY_COMPLIANCE_SUMMARY,
  type EmployerComplianceSummary,
} from '@/services/compliance/complianceSummaryService';

export function useEmployerComplianceSummary(employerId: string | undefined) {
  return useQuery<EmployerComplianceSummary>({
    queryKey: ['ce_employer_compliance_summary', employerId],
    queryFn: () => fetchEmployerComplianceSummary(employerId!),
    enabled: !!employerId,
    staleTime: 60_000,
    placeholderData: EMPTY_COMPLIANCE_SUMMARY,
  });
}
