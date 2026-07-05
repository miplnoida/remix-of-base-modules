/**
 * useSspLegalReference — canonical hooks for the shared Legal Reference Domain
 * Pack (Epic 2.5). Every module MUST consume via these hooks or
 * legalReferenceService, never via direct table access.
 */
import { useQuery } from '@tanstack/react-query';
import { legalReferenceService } from '@/services/legal-reference/sspLegalReferenceService';

const STALE = 5 * 60 * 1000;

export function useLegalReferenceTypes() {
  return useQuery({
    queryKey: ['lgref', 'types'],
    queryFn: () => legalReferenceService.listReferenceTypes(),
    staleTime: STALE,
  });
}

export function useLegalActs(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'acts', countryCode ?? null],
    queryFn: () => legalReferenceService.listActs(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useLegalSections(actId?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'sections', actId ?? null],
    queryFn: () => legalReferenceService.listSections(actId ?? null),
    enabled: !!actId,
    staleTime: STALE,
  });
}

export function useRegulations(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'regulations', countryCode ?? null],
    queryFn: () => legalReferenceService.listRegulations(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useJurisdictions(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'jurisdictions', countryCode ?? null],
    queryFn: () => legalReferenceService.listJurisdictions(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useCourtReferences(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'courts', countryCode ?? null],
    queryFn: () => legalReferenceService.listCourts(countryCode ?? null),
    staleTime: STALE,
  });
}

/** Shared canonical legal reference registry (ssp_legal_reference). */
export function useLegalReferences(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'refs', countryCode ?? null],
    queryFn: () => legalReferenceService.listLegalReferences(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useLegalExternalCodes(entityType?: string) {
  return useQuery({
    queryKey: ['lgref', 'ext', entityType ?? null],
    queryFn: () => legalReferenceService.listExternalCodes(entityType),
    staleTime: STALE,
  });
}

export function useCountryLegalApplicability(countryCode?: string | null) {
  return useQuery({
    queryKey: ['lgref', 'applicability', countryCode ?? null],
    queryFn: () => legalReferenceService.listCountryApplicability(countryCode ?? null),
    enabled: !!countryCode,
    staleTime: STALE,
  });
}
