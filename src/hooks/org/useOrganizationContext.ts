import { useQuery } from "@tanstack/react-query";
import { resolveOrganizationContext, type OrgContextInput } from "@/lib/org/organizationContextResolver";

export const ORG_CONTEXT_KEY = (input: OrgContextInput) =>
  ["org_context", input.moduleCode ?? null, input.departmentCode ?? null, input.locationId ?? null, input.organizationId ?? null] as const;

export function useOrganizationContext(input: OrgContextInput = {}) {
  return useQuery({
    queryKey: ORG_CONTEXT_KEY(input),
    queryFn: () => resolveOrganizationContext(input),
    staleTime: 5 * 60_000,
  });
}
