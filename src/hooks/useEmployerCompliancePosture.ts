import { useQuery } from '@tanstack/react-query';
import {
  fetchEmployerCompliancePosture,
  EMPTY_POSTURE,
} from '@/services/employerComplianceHistoryService';
import type { EmployerCompliancePosture } from '@/types/employerHistory';

export function useEmployerCompliancePosture(
  employerId: string | undefined,
  monthsBack = 24,
) {
  return useQuery<EmployerCompliancePosture>({
    queryKey: ['ce_employer_compliance_posture', employerId, monthsBack],
    queryFn: () => fetchEmployerCompliancePosture(employerId!, { monthsBack }),
    enabled: !!employerId,
    staleTime: 60_000,
    placeholderData: EMPTY_POSTURE,
  });
}
