import { useMemo } from 'react';
import { useERLookups, LookupItem } from '@/hooks/useERLookups';
import type { EmployerApplicationDetail } from '@/hooks/useEmployerApplicationDetail';

export interface ResolvedEmployerCodes {
  ownershipDescription: string;
  sectorDescription: string;
  officeDescription: string;
  industryDescription: string;
  villageDescription: string;
  activityTypeDescription: string;
  inspectorDescription: string;
  isLoading: boolean;
}

/**
 * Resolve a code to its description from a lookup list.
 * Returns "code - description" if found, otherwise the raw code or '—'.
 */
function resolveCode(lookupList: LookupItem[], code: string | null | undefined): string {
  if (!code) return '—';
  const trimmed = code.trim();
  const match = lookupList.find(item => item.code === trimmed);
  if (match) return match.label; // label is already "code - description"
  return trimmed;
}

/**
 * Hook that takes an employer application and resolves all code fields
 * to human-readable descriptions using existing lookup tables.
 */
export function useEmployerCodeResolver(application: EmployerApplicationDetail | null | undefined): ResolvedEmployerCodes {
  const {
    officeCodes,
    ownershipCodes,
    sectorCodes,
    industrialCodes,
    villageCodes,
    activityTypes,
    inspectorCodes,
    isLoading,
  } = useERLookups();

  return useMemo(() => ({
    ownershipDescription: resolveCode(ownershipCodes, application?.ownership_code),
    sectorDescription: resolveCode(sectorCodes, application?.sector_code),
    officeDescription: resolveCode(officeCodes, application?.office_code),
    industryDescription: resolveCode(industrialCodes, application?.industry_code),
    villageDescription: resolveCode(villageCodes, application?.village_code),
    activityTypeDescription: resolveCode(activityTypes, application?.activity_type),
    inspectorDescription: resolveCode(inspectorCodes, application?.inspector_code),
    isLoading,
  }), [
    application?.ownership_code, application?.sector_code, application?.office_code,
    application?.industry_code, application?.village_code, application?.activity_type,
    application?.inspector_code, officeCodes, ownershipCodes, sectorCodes,
    industrialCodes, villageCodes, activityTypes, inspectorCodes, isLoading,
  ]);
}
