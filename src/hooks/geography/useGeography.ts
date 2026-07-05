/**
 * useGeography — canonical hooks for the shared Geography Domain Pack (Epic 2.2).
 * Every module MUST consume geography through these hooks or geographyService,
 * never via direct table access.
 */
import { useQuery } from '@tanstack/react-query';
import { geographyService } from '@/services/geography/geographyService';

export function useCountries() {
  return useQuery({
    queryKey: ['geo', 'countries'],
    queryFn: () => geographyService.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminLevels(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'admin-levels', countryCode],
    queryFn: () => geographyService.listAdminLevels(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGeoAreas(countryCode: string | undefined, levelNo?: number) {
  return useQuery({
    queryKey: ['geo', 'areas', countryCode, levelNo],
    queryFn: () => geographyService.listGeoAreas(countryCode!, levelNo),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddressFormats(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'address-formats', countryCode],
    queryFn: () => geographyService.listAddressFormats(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJurisdictions(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'jurisdictions', countryCode],
    queryFn: () => geographyService.listJurisdictions(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCountryPolicies(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'policies', countryCode],
    queryFn: () => geographyService.listPolicies(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGeoExternalCodes(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'external-codes', countryCode],
    queryFn: () => geographyService.listExternalCodes(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

/** Aggregate hook — returns countries plus a helper to inspect a single country. */
export function useGeography() {
  const countries = useCountries();
  return {
    countries: countries.data ?? [],
    isLoading: countries.isLoading,
    error: countries.error,
  };
}
