/**
 * useIdentity — canonical hooks for the shared Identity Domain Pack (Epic 2.3).
 * Every module MUST consume identity through these hooks or identityService.
 */
import { useQuery } from '@tanstack/react-query';
import { identityService, type PartyKind, type ValidationResult } from '@/services/identity/identityService';

export function useIdentityTypes() {
  return useQuery({
    queryKey: ['identity', 'types'],
    queryFn: () => identityService.listIdentityTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useValidationPatterns() {
  return useQuery({
    queryKey: ['identity', 'validation-patterns'],
    queryFn: () => identityService.listValidationPatterns(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCountryIdentityRules(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'country-rules', countryCode],
    queryFn: () => identityService.listCountryRules(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartyIdentities(partyKind: PartyKind | undefined, partyRef: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'party', partyKind, partyRef],
    queryFn: () => identityService.listPartyIdentities(partyKind!, partyRef!),
    enabled: !!partyKind && !!partyRef,
  });
}

export function useExternalIdentityRefs(partyKind: PartyKind | undefined, partyRef: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'external', partyKind, partyRef],
    queryFn: () => identityService.listExternalRefs(partyKind!, partyRef!),
    enabled: !!partyKind && !!partyRef,
  });
}

export function useIdentityVerificationEvents(partyIdentityId: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'verification', partyIdentityId],
    queryFn: () => identityService.listVerificationEvents(partyIdentityId!),
    enabled: !!partyIdentityId,
  });
}

export function useIdentityMatchKeys(partyKind: PartyKind | undefined, partyRef: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'match-keys', partyKind, partyRef],
    queryFn: () => identityService.listMatchKeys(partyKind!, partyRef!),
    enabled: !!partyKind && !!partyRef,
  });
}

export function useIdentityValidation() {
  return {
    validate: (countryCode: string, identityTypeCode: string, value: string): Promise<ValidationResult> =>
      identityService.validateIdentity(countryCode, identityTypeCode, value),
  };
}

export function useIdentityDomain() {
  const types = useIdentityTypes();
  return {
    identityTypes: types.data ?? [],
    isLoading: types.isLoading,
    error: types.error,
  };
}
