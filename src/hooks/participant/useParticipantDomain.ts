/**
 * useParticipantDomain — canonical hooks for the shared Participant / Party
 * Domain Pack (Epic 2.6). Every module MUST consume via these hooks or
 * participantDomainService.
 */
import { useQuery } from '@tanstack/react-query';
import { participantDomainService } from '@/services/participant/participantDomainService';

const STALE = 5 * 60 * 1000;

export function usePartyTypes() {
  return useQuery({ queryKey: ['participant', 'party-types'],
    queryFn: () => participantDomainService.listPartyTypes(), staleTime: STALE });
}
export function useParticipantRoles() {
  return useQuery({ queryKey: ['participant', 'roles'],
    queryFn: () => participantDomainService.listParticipantRoles(), staleTime: STALE });
}
export function useRelationshipTypes() {
  return useQuery({ queryKey: ['participant', 'relationships'],
    queryFn: () => participantDomainService.listRelationshipTypes(), staleTime: STALE });
}
export function useMemberTypes() {
  return useQuery({ queryKey: ['participant', 'member-types'],
    queryFn: () => participantDomainService.listMemberTypes(), staleTime: STALE });
}
export function useEmployerTypes() {
  return useQuery({ queryKey: ['participant', 'employer-types'],
    queryFn: () => participantDomainService.listEmployerTypes(), staleTime: STALE });
}
export function useOccupationCategories() {
  return useQuery({ queryKey: ['participant', 'occupations'],
    queryFn: () => participantDomainService.listOccupationCategories(), staleTime: STALE });
}
export function useNationalities() {
  return useQuery({ queryKey: ['participant', 'nationalities'],
    queryFn: () => participantDomainService.listNationalities(), staleTime: STALE });
}
export function useDisabilityTypes() {
  return useQuery({ queryKey: ['participant', 'disability'],
    queryFn: () => participantDomainService.listDisabilityTypes(), staleTime: STALE });
}
export function useLifeStatuses() {
  return useQuery({ queryKey: ['participant', 'life-status'],
    queryFn: () => participantDomainService.listLifeStatuses(), staleTime: STALE });
}
export function usePartyRoleBindings(partyKind?: string, partyRef?: string) {
  return useQuery({
    queryKey: ['participant', 'bindings', partyKind ?? null, partyRef ?? null],
    queryFn: () => participantDomainService.listPartyRoleBindings(partyKind, partyRef),
    staleTime: STALE,
  });
}

/** Aggregate hook — convenient for a dashboard-style consumer. */
export function useParticipantDomain() {
  const partyTypes    = usePartyTypes();
  const roles         = useParticipantRoles();
  const relationships = useRelationshipTypes();
  const memberTypes   = useMemberTypes();
  const employerTypes = useEmployerTypes();
  const lifeStatuses  = useLifeStatuses();
  const nationalities = useNationalities();
  return {
    partyTypes: partyTypes.data ?? [],
    roles: roles.data ?? [],
    relationships: relationships.data ?? [],
    memberTypes: memberTypes.data ?? [],
    employerTypes: employerTypes.data ?? [],
    lifeStatuses: lifeStatuses.data ?? [],
    nationalities: nationalities.data ?? [],
    isLoading: partyTypes.isLoading || roles.isLoading || relationships.isLoading,
  };
}
