/**
 * useLegalReferenceData — the single, unified Legal reference-data hook.
 *
 * Every Legal selector, form, and dropdown should consume its options through
 * this hook (or one of the dependent-lookup helpers below) so we have exactly
 * one source of truth, one cache layer, and one legacy-value strategy.
 *
 * Backed by `core_reference_group` / `core_reference_value` scoped to
 * `module_code = 'LEGAL'` (with COMMON fallback for cross-cutting groups).
 *
 * ### Features
 * - React-Query cached (staleTime 5 min) — no redundant refetching.
 * - Active-only by default; `includeInactive` opt-in for admin / history views.
 * - Free-text search helper.
 * - Legacy value handling: `resolveOption(storedValue)` returns a synthetic
 *   `{ isLegacy: true, label: '<stored value>' }` option when the stored value
 *   is not present in the master, so historical rows stay viewable.
 *
 * See docs/legal/LEGAL_MASTER_CONSUMPTION_IMPLEMENTATION.md for the field map.
 */
import { useMemo } from 'react';
import { useCoreReferenceValues, type ReferenceOption } from '@/hooks/core/useCoreReferenceData';

/** Canonical Legal reference-group codes. Add new groups here, not in components. */
export const LG_REF = {
  MATTER_TYPE: 'LG_MATTER_TYPE',
  CASE_TYPE: 'LG_CASE_TYPE',
  CASE_STAGE: 'LG_CASE_STAGE',
  PARTY_ROLE: 'LG_PARTY_ROLE',
  PARTY_TYPE: 'LG_PARTY_TYPE',
  PRIORITY: 'LG_PRIORITY',
  RISK: 'LG_RISK',
  CLOSURE_REASON: 'LG_CLOSURE_REASON',
  WRITEOFF_REASON: 'LG_WRITEOFF_REASON',
  DOCUMENT_CATEGORY: 'LG_DOCUMENT_CATEGORY',
  NOTICE_TYPE: 'LG_NOTICE_TYPE',
  HEARING_TYPE: 'LG_HEARING_TYPE',
  HEARING_OUTCOME: 'LG_HEARING_OUTCOME',
  ORDER_TYPE: 'LG_ORDER_TYPE',
  APPEAL_TYPE: 'LG_APPEAL_TYPE',
  APPEAL_GROUND: 'LG_APPEAL_GROUND',
  ENFORCEMENT_TYPE: 'LG_ENFORCEMENT_TYPE',
  FUND_TYPE: 'LG_FUND_TYPE',
  LIABILITY_TYPE: 'LG_LIABILITY_TYPE',
  FEE_HEAD: 'LG_FEE_HEAD',
  FEE_EVENT: 'LG_FEE_EVENT',
  WAIVER_REASON: 'LG_WAIVER_REASON',
  DELIVERY_STATUS: 'LG_DELIVERY_STATUS',
  DEADLINE_TYPE: 'LG_DEADLINE_TYPE',
  TASK_TYPE: 'LG_TASK_TYPE',
} as const;

export type LegalReferenceGroupCode = (typeof LG_REF)[keyof typeof LG_REF] | string;

export interface LegalReferenceOption extends ReferenceOption {
  /** Whether this option is currently selectable (retired values render read-only). */
  isActive: boolean;
  /** Synthetic marker for values stored historically that no longer exist in the master. */
  isLegacy: boolean;
}

export interface UseLegalReferenceDataOptions {
  /** Include retired values in the returned list (default: false). */
  includeInactive?: boolean;
  /** Client-side substring filter applied to `label`. */
  search?: string;
  /** Fallback options if the group has no rows yet (e.g. seed pending). */
  fallback?: ReferenceOption[];
}

export interface UseLegalReferenceDataResult {
  /** Selectable (active) options. */
  options: LegalReferenceOption[];
  /** Every option (active + retired) with `isActive` flag. */
  allOptions: LegalReferenceOption[];
  isLoading: boolean;
  error: unknown;
  /**
   * Look up a stored code. Returns a real option when present, or a synthetic
   * `{ isLegacy: true, label: <code> }` placeholder so free-text history stays
   * viewable. Returns `null` for empty input.
   */
  resolveOption: (storedValue: string | null | undefined) => LegalReferenceOption | null;
  /** Convenience: full label for a stored code (falls back to the code itself). */
  labelFor: (storedValue: string | null | undefined) => string;
  /** Whether a stored code exists in the current master. */
  isKnown: (storedValue: string | null | undefined) => boolean;
}

/**
 * Consume any Legal reference group.
 *
 * @example
 *   const priority = useLegalReferenceData(LG_REF.PRIORITY);
 *   <LegalReferenceSelect groupCode={LG_REF.PRIORITY} value={p} onChange={setP} />
 */
export function useLegalReferenceData(
  groupCode: LegalReferenceGroupCode,
  opts: UseLegalReferenceDataOptions = {},
): UseLegalReferenceDataResult {
  const q = useCoreReferenceValues(groupCode, {
    moduleCode: 'LEGAL',
    includeRetired: true,
    fallback: opts.fallback,
  });

  const allOptions: LegalReferenceOption[] = useMemo(
    () =>
      (q.allOptions ?? []).map((o) => ({
        ...o,
        isActive: !q.raw.find((r) => r.value_code === o.value && r.is_active === false),
        isLegacy: false,
      })),
    [q.allOptions, q.raw],
  );

  const options: LegalReferenceOption[] = useMemo(() => {
    const base = opts.includeInactive ? allOptions : allOptions.filter((o) => o.isActive);
    if (!opts.search) return base;
    const needle = opts.search.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle) ||
        (o.description ?? '').toLowerCase().includes(needle),
    );
  }, [allOptions, opts.includeInactive, opts.search]);

  const resolveOption = useMemo(
    () =>
      (storedValue: string | null | undefined): LegalReferenceOption | null => {
        if (storedValue === null || storedValue === undefined || storedValue === '') return null;
        const hit = allOptions.find((o) => o.value === storedValue);
        if (hit) return hit;
        return {
          value: storedValue,
          label: storedValue,
          isActive: false,
          isLegacy: true,
        };
      },
    [allOptions],
  );

  return {
    options,
    allOptions,
    isLoading: q.isLoading,
    error: q.error,
    resolveOption,
    labelFor: (v) => resolveOption(v)?.label ?? '',
    isKnown: (v) => !!allOptions.find((o) => o.value === v),
  };
}

/* ------------------------------------------------------------------ */
/*  Dependent lookups (kept in the same file for cohesion)             */
/* ------------------------------------------------------------------ */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

/** Courts (from `lg_court`) — the parent of judges and venues. */
export function useLegalCourts(opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['legal-ref-courts', !!opts.includeInactive],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = sb.from('lg_court').select('court_code, court_name, court_type, island').order('court_name');
      if (!opts.includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        court_code: string;
        court_name: string;
        court_type: string | null;
        island: string | null;
      }>;
    },
  });
}

/** Judges / registrars / magistrates for a court (from `lg_court_officer`). */
export function useLegalCourtOfficers(courtCode: string | null | undefined, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['legal-ref-court-officers', courtCode ?? null, !!opts.includeInactive],
    enabled: !!courtCode,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = sb
        .from('lg_court_officer')
        .select('officer_code, officer_name, officer_type, court_code')
        .eq('court_code', courtCode)
        .order('officer_name');
      if (!opts.includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        officer_code: string;
        officer_name: string;
        officer_type: string | null;
        court_code: string;
      }>;
    },
  });
}

/** Venues (registries / physical sittings) for a court. */
export function useLegalCourtVenues(courtCode: string | null | undefined, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['legal-ref-court-venues', courtCode ?? null, !!opts.includeInactive],
    enabled: !!courtCode,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = sb
        .from('lg_court_venue')
        .select('venue_code, venue_name, island, court_code')
        .eq('court_code', courtCode)
        .order('venue_name');
      if (!opts.includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        venue_code: string;
        venue_name: string;
        island: string | null;
        court_code: string;
      }>;
    },
  });
}

/** Divisions (civil / criminal / commercial …) for a court. */
export function useLegalCourtDivisions(courtCode: string | null | undefined, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['legal-ref-court-divisions', courtCode ?? null, !!opts.includeInactive],
    enabled: !!courtCode,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = sb
        .from('lg_court_division')
        .select('division_code, division_name, civil_criminal_type, court_code')
        .eq('court_code', courtCode)
        .order('division_name');
      if (!opts.includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        division_code: string;
        division_name: string;
        civil_criminal_type: string | null;
        court_code: string;
      }>;
    },
  });
}

/** Fee Rules filtered by fee head (dependent selector for Legal Costs / Filings). */
export function useLegalFeeRules(feeHeadCode: string | null | undefined) {
  return useQuery({
    queryKey: ['legal-ref-fee-rules', feeHeadCode ?? null],
    enabled: !!feeHeadCode,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from('lg_fee_rule')
        .select('id, rule_code, rule_name, fee_head_code, default_amount, currency_code, status')
        .eq('fee_head_code', feeHeadCode)
        .eq('status', 'ACTIVE')
        .order('rule_name');
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        rule_code: string;
        rule_name: string;
        fee_head_code: string;
        default_amount: number | null;
        currency_code: string | null;
        status: string;
      }>;
    },
  });
}
