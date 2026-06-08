import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listEligibilityFacts, getEligibilityFactUsage,
  upsertEligibilityFact, cloneEligibilityFact,
  deleteEligibilityFact, setEligibilityFactActive,
  type EligibilityFact, type EligibilityFactInput,
} from '@/services/bn/eligibilityFactService';

const KEY = ['bn', 'eligibility-facts'];

export function useEligibilityFacts() {
  return useQuery({ queryKey: KEY, queryFn: listEligibilityFacts, staleTime: 60_000 });
}

export function useEligibilityFactUsage() {
  return useQuery({ queryKey: [...KEY, 'usage'], queryFn: getEligibilityFactUsage, staleTime: 30_000 });
}

export function useUpsertEligibilityFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { input: EligibilityFactInput; userCode: string }) => upsertEligibilityFact(p.input, p.userCode),
    onSuccess: () => { toast.success('Fact saved'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });
}

export function useCloneEligibilityFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { source: EligibilityFact; newFactKey: string; userCode: string }) =>
      cloneEligibilityFact(p.source, p.newFactKey, p.userCode),
    onSuccess: () => { toast.success('Fact cloned'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Clone failed', { description: e?.message }),
  });
}

export function useDeleteEligibilityFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; factKey: string }) => deleteEligibilityFact(p.id, p.factKey),
    onSuccess: () => { toast.success('Fact deleted'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Delete failed', { description: e?.message }),
  });
}

export function useToggleEligibilityFactActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; isActive: boolean; userCode: string }) =>
      setEligibilityFactActive(p.id, p.isActive, p.userCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Update failed', { description: e?.message }),
  });
}
