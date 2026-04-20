/**
 * Phase E — fetches resolved prior-matter rows for a given audit inspection
 * so the audit report can render a "Prior Compliance History" section.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchResolvedPriorMattersForInspection, type ResolvedPriorMatter } from '@/services/auditReportPriorMattersService';

export function useAuditReportPriorMatters(inspectionId: string | null | undefined) {
  return useQuery<ResolvedPriorMatter[]>({
    queryKey: ['audit-report-prior-matters', inspectionId],
    queryFn: () => fetchResolvedPriorMattersForInspection(inspectionId!),
    enabled: !!inspectionId,
    staleTime: 60_000,
  });
}
