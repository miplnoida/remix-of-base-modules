/**
 * Communication Domain Pack — canonical hooks (Epic 2.7).
 * All modules MUST consume via these hooks or communicationDomainService.
 */
import { useQuery } from '@tanstack/react-query';
import {
  communicationDomainService,
} from '@/services/communication/communicationDomainService';
import type { PartySourceSystem } from '@/services/participant/partyProjectionService';

const STALE = 5 * 60 * 1000;

export function useCommunicationChannels() {
  return useQuery({ queryKey: ['comm', 'channels'],
    queryFn: () => communicationDomainService.listCommunicationChannels(), staleTime: STALE });
}
export function useCorrespondenceTypes() {
  return useQuery({ queryKey: ['comm', 'types'],
    queryFn: () => communicationDomainService.listCorrespondenceTypes(), staleTime: STALE });
}
export function useDeliveryStatuses() {
  return useQuery({ queryKey: ['comm', 'statuses'],
    queryFn: () => communicationDomainService.listDeliveryStatuses(), staleTime: STALE });
}
export function useRecipientPreferences(partySource?: string, partyRef?: string) {
  return useQuery({
    queryKey: ['comm', 'preferences', partySource ?? null, partyRef ?? null],
    queryFn: () => communicationDomainService.listRecipientPreferences(partySource, partyRef),
    staleTime: STALE,
  });
}
export function useTemplateBindings(correspondenceCode?: string) {
  return useQuery({
    queryKey: ['comm', 'bindings', correspondenceCode ?? null],
    queryFn: () => communicationDomainService.listTemplateBindings(correspondenceCode),
    staleTime: STALE,
  });
}
export function useLegalNoticeMappings() {
  return useQuery({ queryKey: ['comm', 'legal-map'],
    queryFn: () => communicationDomainService.listLegalNoticeMappings(), staleTime: STALE });
}
export function useProviderCodes() {
  return useQuery({ queryKey: ['comm', 'providers'],
    queryFn: () => communicationDomainService.listProviderCodes(), staleTime: STALE });
}
export function useResolveRecipient(
  partySource: PartySourceSystem | undefined,
  legacyId: string | undefined,
) {
  return useQuery({
    queryKey: ['comm', 'resolve-recipient', partySource, legacyId],
    queryFn: () => communicationDomainService.resolveRecipient(partySource!, legacyId!),
    enabled: Boolean(partySource && legacyId),
    staleTime: 60 * 1000,
  });
}
