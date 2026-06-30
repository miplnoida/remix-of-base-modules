/**
 * useLegalEnterpriseLabels
 * ------------------------
 * Single source for Legal UI display labels (module name, department name,
 * organization name, primary location). Everything is resolved through the
 * Enterprise Context Resolver — never read `app_modules`, `core_organization`,
 * `core_department_profile`, or `office_locations` directly from a Legal
 * screen.
 *
 * Safe by design:
 *   - Returns sensible fallbacks ("Legal", "Legal Department") while the query
 *     is loading or when the resolver returns nothing.
 *   - Never throws.
 *   - `trace` is exposed for the dev-only debug panel; production UI must not
 *     surface it.
 */
import { useEnterpriseContext } from "@/hooks/enterprise/useEnterpriseContext";

export interface LegalEnterpriseLabels {
  moduleName: string;
  departmentName: string;
  organizationName: string;
  locationName: string;
  isLoading: boolean;
  trace: Array<{ slot: string; source: string; ok: boolean }>;
}

export function useLegalEnterpriseLabels(opts?: {
  locationId?: string | null;
}): LegalEnterpriseLabels {
  const { data, isLoading } = useEnterpriseContext({
    moduleCode: "LEGAL",
    departmentCode: "LEGAL",
    locationId: opts?.locationId ?? null,
  });

  return {
    moduleName: data?.module?.displayName?.trim() || "Legal",
    departmentName:
      (data?.department as any)?.name?.trim() ||
      (data?.department as any)?.displayName?.trim() ||
      "Legal Department",
    organizationName: (data?.organization as any)?.name?.trim() || "",
    locationName: (data?.location as any)?.name?.trim() || "",
    isLoading,
    trace: (data?.trace as any) ?? [],
  };
}
