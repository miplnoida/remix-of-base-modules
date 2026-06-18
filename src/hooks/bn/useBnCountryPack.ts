import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cps from '@/services/bn/countryPackService';

// Full pack
export const useBnCountryPack = (countryCode: string | undefined) =>
  useQuery({
    queryKey: ['bn', 'country-pack', countryCode],
    queryFn: () => cps.fetchCountryPack(countryCode!),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });

// ID Rules
export const useBnCountryIdRules = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-id-rules', countryCode], queryFn: () => cps.fetchCountryIdRules(countryCode!), enabled: !!countryCode });

export const useUpsertCountryIdRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.upsertCountryIdRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-id-rules'] }) });
};

export const useDeleteCountryIdRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.deleteCountryIdRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-id-rules'] }) });
};

// Address Model
export const useBnCountryAddressModel = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-address', countryCode], queryFn: () => cps.fetchCountryAddressModel(countryCode!), enabled: !!countryCode });

export const useUpsertCountryAddressField = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.upsertCountryAddressField, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-address'] }) });
};

export const useDeleteCountryAddressField = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.deleteCountryAddressField, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-address'] }) });
};

// Participant Types
export const useBnCountryParticipantTypes = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-participants', countryCode], queryFn: () => cps.fetchCountryParticipantTypes(countryCode!), enabled: !!countryCode });

export const useBnActiveCountryParticipantTypes = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-participants-active', countryCode], queryFn: () => cps.fetchActiveCountryParticipantTypes(countryCode!), enabled: !!countryCode, staleTime: 5 * 60_000 });

export const useBnParticipantTypeUsage = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-participants-usage', countryCode], queryFn: () => cps.fetchParticipantTypeUsage(countryCode!), enabled: !!countryCode, staleTime: 60_000 });

export const useUpsertCountryParticipantType = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.upsertCountryParticipantType, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-participants'] }) });
};

export const useDeleteCountryParticipantType = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.deleteCountryParticipantType, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-participants'] }) });
};

export const useRetireCountryParticipantType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, userCode }: { id: string; reason: string; userCode?: string }) => cps.retireCountryParticipantType(id, reason, userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-participants'] }),
  });
};

export const useReactivateCountryParticipantType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cps.reactivateCountryParticipantType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-participants'] }),
  });
};

export const useSetParticipantTypeLifecycle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'DRAFT' | 'ACTIVE' | 'RETIRED' }) => cps.setParticipantTypeLifecycle(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-participants'] }),
  });
};

// Payment Config
export const useBnCountryPaymentConfig = (countryCode: string | undefined) =>
  useQuery({ queryKey: ['bn', 'country-payment', countryCode], queryFn: () => cps.fetchCountryPaymentConfig(countryCode!), enabled: !!countryCode });

export const useUpsertCountryPaymentConfig = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.upsertCountryPaymentConfig, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-payment'] }) });
};

export const useDeleteCountryPaymentConfig = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.deleteCountryPaymentConfig, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-payment'] }) });
};

// Legal Refs
export const useBnCountryLegalRefs = (countryCode: string | undefined, productId?: string) =>
  useQuery({ queryKey: ['bn', 'country-legal', countryCode, productId], queryFn: () => cps.fetchCountryLegalRefs(countryCode!, productId), enabled: !!countryCode });

export const useUpsertCountryLegalRef = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.upsertCountryLegalRef, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-legal'] }) });
};

export const useDeleteCountryLegalRef = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cps.deleteCountryLegalRef, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'country-legal'] }) });
};
