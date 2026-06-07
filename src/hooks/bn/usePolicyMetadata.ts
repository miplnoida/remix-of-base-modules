/**
 * Metadata loaders for the Approval / Override Policy configurator.
 *
 * Each hook returns SearchableSelectOption[]-shaped data sourced from the
 * single source-of-truth tables — no hardcoded enumerations.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface SelectOption {
  value: string;
  label: string;
  searchText?: string;
}

export function useRoleOptions() {
  return useQuery({
    queryKey: ['policy-meta', 'roles'],
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await db
        .from('roles')
        .select('role_name, description, is_active')
        .eq('is_active', true)
        .order('role_name');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        value: String(r.role_name).toUpperCase(),
        label: r.role_name,
        searchText: r.description ?? '',
      }));
    },
    staleTime: 5 * 60_000,
  });
}

export function useReasonCategoryOptions() {
  return useQuery({
    queryKey: ['policy-meta', 'reason-categories'],
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await db
        .from('bn_reason_code')
        .select('reason_category')
        .eq('is_active', true);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) if (r.reason_category) set.add(r.reason_category);
      return Array.from(set).sort().map((c) => ({ value: c, label: c }));
    },
    staleTime: 5 * 60_000,
  });
}

export function useClaimStatusOptions() {
  return useQuery({
    queryKey: ['policy-meta', 'claim-statuses'],
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await db
        .from('bn_claim_status_def')
        .select('status_code, status_label, status_group, is_active')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        value: s.status_code,
        label: `${s.status_code} — ${s.status_label}`,
        searchText: `${s.status_label} ${s.status_group ?? ''}`,
      }));
    },
    staleTime: 5 * 60_000,
  });
}

export function useWorkbasketOptions() {
  return useQuery({
    queryKey: ['policy-meta', 'workbaskets'],
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await db
        .from('bn_workbasket')
        .select('id, basket_code, basket_name, assigned_role, is_active')
        .eq('is_active', true)
        .order('basket_name');
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        value: b.id,
        label: `${b.basket_code} — ${b.basket_name}`,
        searchText: `${b.assigned_role ?? ''}`,
      }));
    },
    staleTime: 5 * 60_000,
  });
}

/** Combined rule code options from eligibility + calculation for a version. */
export function useRuleCodeOptions(productVersionId: string | undefined) {
  return useQuery({
    queryKey: ['policy-meta', 'rule-codes', productVersionId],
    queryFn: async (): Promise<SelectOption[]> => {
      if (!productVersionId) return [];
      const [elig, calc] = await Promise.all([
        db
          .from('bn_eligibility_rule')
          .select('rule_code, rule_name')
          .eq('product_version_id', productVersionId)
          .eq('is_active', true),
        db
          .from('bn_calculation_rule')
          .select('rule_code, rule_name')
          .eq('product_version_id', productVersionId)
          .eq('is_active', true),
      ]);
      const out = new Map<string, SelectOption>();
      for (const r of elig.data ?? []) {
        if (!r.rule_code) continue;
        out.set(r.rule_code, { value: r.rule_code, label: `${r.rule_code} — ${r.rule_name ?? ''}`, searchText: r.rule_name ?? '' });
      }
      for (const r of calc.data ?? []) {
        if (!r.rule_code) continue;
        out.set(r.rule_code, { value: r.rule_code, label: `${r.rule_code} — ${r.rule_name ?? ''}`, searchText: r.rule_name ?? '' });
      }
      return Array.from(out.values()).sort((a, b) => a.value.localeCompare(b.value));
    },
    enabled: !!productVersionId,
    staleTime: 60_000,
  });
}
