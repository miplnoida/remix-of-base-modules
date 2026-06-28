import { useQuery } from "@tanstack/react-query";
import {
  resolveEnterpriseContext,
  type EnterpriseContextInput,
  type EnterpriseContext,
} from "@/lib/enterprise/enterpriseContextResolver";

/**
 * React hook wrapper around `resolveEnterpriseContext()`.
 *
 * Every module (Legal, Compliance, Benefits, Finance, HR, DMS, Notifications,
 * Reports, Public/Portal) should call this hook for any UI surface that needs
 * organization / department / module / location / branding / DMS / AI context.
 *
 * Never read `core_organization`, `core_department_profile`, `comm_*`,
 * `app_modules`, or `office_locations` directly from a module component.
 */
export function useEnterpriseContext(
  input: EnterpriseContextInput,
  options?: { enabled?: boolean },
) {
  return useQuery<EnterpriseContext>({
    queryKey: [
      "enterprise-context",
      input.moduleCode,
      input.departmentCode ?? null,
      input.departmentId ?? null,
      input.locationId ?? null,
      input.templateId ?? null,
      input.documentType ?? null,
      input.language ?? null,
    ],
    queryFn: () => resolveEnterpriseContext(input),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
