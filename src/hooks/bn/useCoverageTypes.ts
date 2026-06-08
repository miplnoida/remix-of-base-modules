import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listCoverageTypes, listCoverageTypeRules, upsertCoverageType,
  deleteCoverageType, assignRuleToCoverageType, unassignRuleFromCoverageType,
  type CoverageTypeInput,
} from '@/services/bn/coverageTypeService';

const KEY = ['bn', 'coverage-types'];
const RULES_KEY = ['bn', 'coverage-type-rules'];

export function useCoverageTypes() {
  return useQuery({ queryKey: KEY, queryFn: listCoverageTypes, staleTime: 30_000 });
}
export function useCoverageTypeRules() {
  return useQuery({ queryKey: RULES_KEY, queryFn: listCoverageTypeRules, staleTime: 30_000 });
}

export function useUpsertCoverageType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { input: CoverageTypeInput; userCode: string }) => upsertCoverageType(p.input, p.userCode),
    onSuccess: () => { toast.success('Coverage type saved'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });
}

export function useDeleteCoverageType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoverageType(id),
    onSuccess: () => { toast.success('Coverage type deleted'); qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: RULES_KEY }); },
    onError: (e: any) => toast.error('Delete failed', { description: e?.message }),
  });
}

export function useAssignRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { coverage_type_id: string; rule_code: string; priority: number; effective_date: string | null; end_date: string | null; userCode: string }) =>
      assignRuleToCoverageType(p.coverage_type_id, p.rule_code, p.priority, p.effective_date, p.end_date, p.userCode),
    onSuccess: () => { toast.success('Rule assigned'); qc.invalidateQueries({ queryKey: RULES_KEY }); },
    onError: (e: any) => toast.error('Assign failed', { description: e?.message }),
  });
}

export function useUnassignRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { coverage_type_id: string; rule_code: string }) => unassignRuleFromCoverageType(p.coverage_type_id, p.rule_code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RULES_KEY }); },
    onError: (e: any) => toast.error('Unassign failed', { description: e?.message }),
  });
}
