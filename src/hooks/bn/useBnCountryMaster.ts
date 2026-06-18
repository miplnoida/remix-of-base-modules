import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/bn/countryMasterService';

export const useCountryMasterList = () =>
  useQuery({ queryKey: ['bn', 'country-master'], queryFn: svc.listCountries, staleTime: 60_000 });

export const useCountryPackStatuses = (codes: string[]) =>
  useQuery({
    queryKey: ['bn', 'country-pack-status', codes.slice().sort().join(',')],
    queryFn: () => svc.getAllCountryPackStatus(codes),
    enabled: codes.length > 0,
  });

export const useCreateCountry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: svc.BnCountryInput; userCode?: string }) => svc.createCountry(vars.input, vars.userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'country-master'] });
      qc.invalidateQueries({ queryKey: ['bn', 'countries'] });
    },
  });
};

export const useUpdateCountry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { code: string; patch: Partial<svc.BnCountryInput>; userCode?: string }) =>
      svc.updateCountry(vars.code, vars.patch, vars.userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'country-master'] });
      qc.invalidateQueries({ queryKey: ['bn', 'countries'] });
    },
  });
};

export const useToggleCountryActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { code: string; isActive: boolean; userCode?: string }) =>
      svc.setCountryActive(vars.code, vars.isActive, vars.userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'country-master'] });
      qc.invalidateQueries({ queryKey: ['bn', 'countries'] });
    },
  });
};

export const useSeedCountryPack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { code: string; userCode?: string }) => svc.seedDefaultCountryPack(vars.code, vars.userCode),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'country-pack-status'] });
      qc.invalidateQueries({ queryKey: ['bn', 'country-pack', vars.code] });
    },
  });
};

export const useOrphanCountryRefs = () =>
  useQuery({ queryKey: ['bn', 'country-orphan-refs'], queryFn: svc.findOrphanCountryRefs });
