/**
 * Party Projection hooks — Epic 2.6A.
 * Read-only facade hooks over `v_ssp_party_projection` (legacy ip_master /
 * er_master). Downstream modules MUST consume via these hooks, never direct
 * legacy table reads.
 */
import { useQuery } from '@tanstack/react-query';
import {
  partyProjectionService,
  type PartySearchParams,
  type PartySourceSystem,
} from '@/services/participant/partyProjectionService';

const STALE = 60 * 1000;

export function usePartySearch(params: PartySearchParams = {}) {
  return useQuery({
    queryKey: ['party-projection', 'search', params],
    queryFn: () => partyProjectionService.search(params),
    staleTime: STALE,
  });
}

export function useMemberParties(limit = 100) {
  return useQuery({
    queryKey: ['party-projection', 'members', limit],
    queryFn: () => partyProjectionService.listMembers(limit),
    staleTime: STALE,
  });
}

export function useEmployerParties(limit = 100) {
  return useQuery({
    queryKey: ['party-projection', 'employers', limit],
    queryFn: () => partyProjectionService.listEmployers(limit),
    staleTime: STALE,
  });
}

export function usePartyRoles(
  sourceSystem: PartySourceSystem | undefined,
  legacyId: string | undefined,
) {
  return useQuery({
    queryKey: ['party-projection', 'roles', sourceSystem, legacyId],
    queryFn: () => partyProjectionService.listRoles(sourceSystem!, legacyId!),
    enabled: Boolean(sourceSystem && legacyId),
    staleTime: STALE,
  });
}

export function useResolvePartyByLegacyId(
  sourceSystem: PartySourceSystem | undefined,
  legacyId: string | undefined,
) {
  return useQuery({
    queryKey: ['party-projection', 'resolve', sourceSystem, legacyId],
    queryFn: () => partyProjectionService.resolveByLegacyId(sourceSystem!, legacyId!),
    enabled: Boolean(sourceSystem && legacyId),
    staleTime: STALE,
  });
}
