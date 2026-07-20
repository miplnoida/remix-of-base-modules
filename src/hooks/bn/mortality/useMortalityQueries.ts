/**
 * BN Mortality — React Query hooks (thin bindings over mortalityQueryService).
 *
 * Every hook enforces the tenancy scope by including the `moduleCode`
 * in the cache key and always going through the secure query client.
 */
import { useBenefitsQuery } from '@/hooks/bn/queries';
import type {
  BnMortalityAwardImpactDto,
  BnMortalityDashboardDto,
  BnMortalityEventDetailDto,
  BnMortalityEventListItemDto,
  BnMortalityEventSummaryDto,
  BnMortalityPersonMatchDto,
} from '@/types/bn/mortality/mortalityDtos';

const MODULE = 'bn_mortality';

export function useMortalityDashboard() {
  return useBenefitsQuery<Record<string, never>, BnMortalityDashboardDto>({
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    moduleCode: MODULE,
    params: {},
  });
}

export function useMortalitySummary(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, BnMortalityEventSummaryDto>({
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityEvent(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, BnMortalityEventDetailDto>({
    queryCode: 'BN_MORTALITY_GET_EVENT',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export interface MortalityListFilters {
  status?: string;
  assignedTo?: string;
  search?: string;
  source?: string;
  overdueOnly?: boolean;
}

export function useMortalityEventList(
  filters: MortalityListFilters = {},
  pageSize = 25,
  pageToken: string | null = null,
) {
  return useBenefitsQuery<MortalityListFilters, readonly BnMortalityEventListItemDto[]>({
    queryCode: 'BN_MORTALITY_LIST_EVENTS',
    moduleCode: MODULE,
    params: filters,
    pageSize,
    pageToken,
  });
}

export function useMortalityEventHistory(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly unknown[]>({
    queryCode: 'BN_MORTALITY_GET_EVENT_HISTORY',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityAwardImpacts(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly BnMortalityAwardImpactDto[]>({
    queryCode: 'BN_MORTALITY_GET_AWARD_IMPACTS',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityAffectedAwards(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly BnMortalityAwardImpactDto[]>({
    queryCode: 'BN_MORTALITY_GET_AFFECTED_AWARDS',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityReferrals(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly unknown[]>({
    queryCode: 'BN_MORTALITY_GET_REFERRALS',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityEvidence(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly unknown[]>({
    queryCode: 'BN_MORTALITY_GET_EVIDENCE_LINKS',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityCommunications(eventId: string | null) {
  return useBenefitsQuery<{ eventId: string }, readonly unknown[]>({
    queryCode: 'BN_MORTALITY_GET_COMMUNICATIONS',
    moduleCode: MODULE,
    params: { eventId: eventId ?? '' },
    enabled: !!eventId,
  });
}

export function useMortalityPersonMatches(
  params: { nationalId?: string; fullName?: string; dob?: string },
  enabled = true,
) {
  return useBenefitsQuery<typeof params, readonly BnMortalityPersonMatchDto[]>({
    queryCode: 'BN_MORTALITY_SEARCH_PERSON_MATCHES',
    moduleCode: MODULE,
    params,
    enabled: enabled && !!(params.nationalId || params.fullName),
  });
}
