/**
 * BN Mortality — React Query hooks (thin bindings over mortalityQueryService).
 *
 * Every hook enforces the tenancy scope by including the `moduleCode`
 * in the cache key and always going through the secure query client.
 */
import { useBenefitsQuery } from '@/hooks/bn/queries';
import type {
  BnMortalityEventDetailDto,
  BnMortalityEventListItemDto,
  BnMortalityEventSummaryDto,
  BnMortalityPersonMatchDto,
} from '@/types/bn/mortality/mortalityDtos';

const MODULE = 'bn_mortality';

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

export function useMortalityEventList(
  filters: { status?: string; assignedTo?: string; search?: string } = {},
  pageSize = 50,
) {
  return useBenefitsQuery<typeof filters, readonly BnMortalityEventListItemDto[]>({
    queryCode: 'BN_MORTALITY_LIST_EVENTS',
    moduleCode: MODULE,
    params: filters,
    pageSize,
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
  return useBenefitsQuery<{ eventId: string }, readonly unknown[]>({
    queryCode: 'BN_MORTALITY_GET_AWARD_IMPACTS',
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
