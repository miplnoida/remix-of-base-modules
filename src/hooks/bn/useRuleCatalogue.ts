import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listRuleCatalogue, getRuleCatalogueUsage, upsertRuleCatalogue,
  cloneRuleCatalogue, deleteRuleCatalogue, setRuleCatalogueActive,
  type RuleCatalogueItem, type RuleCatalogueInput,
} from '@/services/bn/ruleCatalogueService';

const KEY = ['bn', 'rule-catalogue'];

export function useRuleCatalogue() {
  return useQuery({ queryKey: KEY, queryFn: listRuleCatalogue, staleTime: 30_000 });
}

export function useRuleCatalogueUsage() {
  return useQuery({ queryKey: [...KEY, 'usage'], queryFn: getRuleCatalogueUsage, staleTime: 30_000 });
}

export function useUpsertRuleCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { input: RuleCatalogueInput; userCode: string }) => upsertRuleCatalogue(p.input, p.userCode),
    onSuccess: () => { toast.success('Rule saved'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });
}

export function useCloneRuleCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { source: RuleCatalogueItem; newCode: string; userCode: string }) =>
      cloneRuleCatalogue(p.source, p.newCode, p.userCode),
    onSuccess: () => { toast.success('Rule cloned'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Clone failed', { description: e?.message }),
  });
}

export function useDeleteRuleCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; code: string }) => deleteRuleCatalogue(p.id, p.code),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Delete failed', { description: e?.message }),
  });
}

export function useToggleRuleCatalogueActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; isActive: boolean; userCode: string }) =>
      setRuleCatalogueActive(p.id, p.isActive, p.userCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Update failed', { description: e?.message }),
  });
}
