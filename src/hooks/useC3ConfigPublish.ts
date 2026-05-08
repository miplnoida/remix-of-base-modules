/**
 * Hook for C3 Configuration Publish to C3-Wizard
 * Handles payload building, publishing, sync log tracking, and pending change detection
 * Sync Protocol v4.0 — includes all config tables
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';

export interface C3SyncLogEntry {
  id: string;
  sync_version: string;
  status: string;
  payload_hash: string;
  error_message: string | null;
  config_periods_count: number;
  levy_slabs_count: number;
  bonus_exemptions_count: number;
  bonus_policies_count: number;
  bonus_exceptions_count: number;
  holiday_policies_count: number;
  holiday_exceptions_count: number;
  published_by: string | null;
  published_at: string;
  created_at: string;
}

export interface SyncPendingCounts {
  periods: number;
  slabs: number;
  bonusPolicies: number;
  bonusExceptions: number;
  holidayPolicies: number;
  holidayExceptions: number;
  calculationConfigs: number;
  incomeCodes: number;
  incomeCategories: number;
  selfEmpRates: number;
  incomeCodePolicies: number;
  incomeCodeExceptions: number;
  filingConfigPeriods: number;
}

// Check if any config has been modified since last publish.
// Compares actual payload hash against last successful sync to avoid
// false positives caused by `modified_on` being bumped without value changes.
export function useC3SyncStatus() {
  return useQuery({
    queryKey: ['c3-sync-status'],
    queryFn: async (): Promise<{ hasPendingChanges: boolean; lastPublishedAt: string | null; pendingCounts: SyncPendingCounts }> => {
      const { data: lastSync } = await supabase
        .from('c3_config_sync_log')
        .select('published_at, payload_hash')
        .eq('status', 'success')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastPublishedAt = lastSync?.published_at || null;
      const lastPublishedHash = lastSync?.payload_hash || null;

      // Build the current payload and compare hashes — this is the source of truth.
      let currentHash: string | null = null;
      let currentCounts: SyncPendingCounts = {
        periods: 0, slabs: 0, bonusPolicies: 0, bonusExceptions: 0,
        holidayPolicies: 0, holidayExceptions: 0, calculationConfigs: 0,
        incomeCodes: 0, incomeCategories: 0, selfEmpRates: 0,
        incomeCodePolicies: 0, incomeCodeExceptions: 0, filingConfigPeriods: 0,
      };
      try {
        const { payloadHash, counts } = await buildSyncPayload();
        currentHash = payloadHash;
        currentCounts = {
          periods: counts.periods,
          slabs: counts.slabs,
          bonusPolicies: counts.bonusPolicies,
          bonusExceptions: counts.bonusExceptions,
          holidayPolicies: counts.holidayPolicies,
          holidayExceptions: counts.holidayExceptions,
          calculationConfigs: counts.calculationConfigs,
          incomeCodes: counts.incomeCodes,
          incomeCategories: counts.incomeCategories,
          selfEmpRates: counts.selfEmpRates,
          incomeCodePolicies: counts.incomeCodePolicies,
          incomeCodeExceptions: counts.incomeCodeExceptions,
          filingConfigPeriods: counts.filingConfigPeriods,
        };
      } catch (e) {
        // If payload build fails, fall back to "no pending" so UI doesn't lie.
        return {
          hasPendingChanges: false,
          lastPublishedAt,
          pendingCounts: currentCounts,
        };
      }

      const hasPendingChanges = lastPublishedHash
        ? currentHash !== lastPublishedHash
        : Object.values(currentCounts).some(c => c > 0);

      return {
        hasPendingChanges,
        lastPublishedAt,
        pendingCounts: currentCounts,
      };
    },
    refetchInterval: 30000,
  });
}


// Fetch sync history log
export function useC3SyncLog() {
  return useQuery({
    queryKey: ['c3-sync-log'],
    queryFn: async (): Promise<C3SyncLogEntry[]> => {
      const { data, error } = await supabase
        .from('c3_config_sync_log')
        .select('id, sync_version, status, payload_hash, error_message, config_periods_count, levy_slabs_count, bonus_exemptions_count, bonus_policies_count, bonus_exceptions_count, holiday_policies_count, holiday_exceptions_count, published_by, published_at, created_at')
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as C3SyncLogEntry[];
    }
  });
}

// Build the full payload from all config tables
async function buildSyncPayload() {
  // 1. Config Periods + Details
  const { data: periods, error: pErr } = await supabase
    .from('c3_config_periods')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false });
  if (pErr) throw pErr;

  const { data: details, error: dErr } = await supabase
    .from('c3_config_details')
    .select('*');
  if (dErr) throw dErr;

  const configPeriods = (periods || []).map(p => ({
    ...p,
    details: details?.find(d => d.config_period_id === p.id) || null
  }));

  // 2. Levy Slabs + Slab Details
  const { data: slabs, error: sErr } = await supabase
    .from('tb_levy_slabs')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false });
  if (sErr) throw sErr;

  const slabIds = (slabs || []).map(s => s.id);
  let slabDetails: any[] = [];
  if (slabIds.length > 0) {
    const { data: sd, error: sdErr } = await supabase
      .from('tb_levy_slab_details')
      .select('*')
      .in('slab_id', slabIds)
      .eq('is_active', true)
      .order('order_no', { ascending: true });
    if (sdErr) throw sdErr;
    slabDetails = sd || [];
  }

  const levySlabs = (slabs || []).map(s => ({
    ...s,
    details: slabDetails.filter(d => d.slab_id === s.id)
  }));

  // 3. Bonus Policy Default
  const { data: bonusPolicies, error: bpErr } = await supabase
    .from('c3_bonus_policy_default')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false });
  if (bpErr) throw bpErr;

  // 4. Bonus Policy Exceptions
  const { data: bonusExceptions, error: beErr } = await supabase
    .from('c3_bonus_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .order('year_from', { ascending: false });
  if (beErr) throw beErr;

  // 5. Holiday Pay Policy Default
  const { data: holidayPolicies, error: hpErr } = await supabase
    .from('c3_holiday_pay_policy_default')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false });
  if (hpErr) throw hpErr;

  // 6. Holiday Pay Policy Exceptions
  const { data: holidayExceptions, error: heErr } = await supabase
    .from('c3_holiday_pay_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .order('year_from', { ascending: false });
  if (heErr) throw heErr;

  // 7. Calculation Config (global rules — week_start_day, penalty thresholds, etc.)
  const { data: calculationConfigs, error: ccErr } = await supabase
    .from('c3_calculation_config')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('display_order');
  if (ccErr) throw ccErr;

  // 8. Income Codes (master data)
  const { data: incomeCodes, error: icErr } = await (supabase as any)
    .from('tb_income_codes')
    .select('*')
    .order('code');
  if (icErr) throw icErr;

  // 9. Income Categories / Wage Categories (master data for self-employed)
  const { data: incomeCategories, error: catErr } = await (supabase as any)
    .from('tb_income_cat')
    .select('*')
    .order('wage_upper');
  if (catErr) throw catErr;

  // 10. Self-Employed Contribution Rates
  const { data: selfEmpRates, error: seErr } = await (supabase as any)
    .from('tb_self_emp_contrib_rate')
    .select('*')
    .order('effstart', { ascending: false });
  if (seErr) throw seErr;

  // 11. Income Code Policy Defaults
  const { data: incomeCodePolicies, error: icpErr } = await (supabase as any)
    .from('c3_income_code_policy_default')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false });
  if (icpErr) throw icpErr;

  // 12. Income Code Policy Exceptions
  const { data: incomeCodeExceptions, error: iceErr } = await (supabase as any)
    .from('c3_income_code_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false });
  if (iceErr) throw iceErr;

  // 13. Filing & Penalties Configuration Periods (week_start_day, filing window, penalty thresholds)
  const { data: filingConfigPeriods, error: fcErr } = await (supabase as any)
    .from('c3_filing_config_periods')
    .select('*')
    .eq('is_active', true)
    .order('date_from', { ascending: false });
  if (fcErr) throw fcErr;

  // C3-Wizard v4.1+ widened audit user fields to varchar(50) to match our user_code standard.
  // Truncate defensively to 50 chars on every outgoing row so a stray over-long value
  // can never break the upsert. (Mirror copy only — local DB values are not modified.)
  const AUDIT_FIELDS = ['created_by', 'modified_by', 'updated_by'] as const;
  const AUDIT_MAX_LEN = 50;
  const truncateAuditFields = <T,>(row: T): T => {
    if (!row || typeof row !== 'object') return row;
    const clone: any = { ...row };
    for (const f of AUDIT_FIELDS) {
      if (typeof clone[f] === 'string' && clone[f].length > AUDIT_MAX_LEN) {
        clone[f] = clone[f].slice(0, AUDIT_MAX_LEN);
      }
    }
    if (clone.details && typeof clone.details === 'object' && !Array.isArray(clone.details)) {
      clone.details = truncateAuditFields(clone.details);
    }
    if (Array.isArray(clone.details)) {
      clone.details = clone.details.map((d: any) => truncateAuditFields(d));
    }
    return clone;
  };
  const sanitize = <T,>(rows: T[] | null | undefined): T[] =>
    (rows || []).map((r) => truncateAuditFields(r));

  const syncTimestamp = new Date().toISOString();
  const payload = {
    sync_version: '4.1',
    sync_timestamp: syncTimestamp,
    config_periods: sanitize(configPeriods),
    levy_slabs: sanitize(levySlabs),
    bonus_policies: sanitize(bonusPolicies),
    bonus_exceptions: sanitize(bonusExceptions),
    holiday_policies: sanitize(holidayPolicies),
    holiday_exceptions: sanitize(holidayExceptions),
    calculation_configs: sanitize(calculationConfigs),
    income_codes: sanitize(incomeCodes),
    income_categories: sanitize(incomeCategories),
    self_emp_contrib_rates: sanitize(selfEmpRates),
    income_code_policies: sanitize(incomeCodePolicies),
    income_code_exceptions: sanitize(incomeCodeExceptions),
    filing_config_periods: sanitize(filingConfigPeriods),
  };

  const payloadHash = btoa(JSON.stringify(payload)).slice(0, 64);

  return {
    payload,
    payloadHash,
    counts: {
      periods: configPeriods.length,
      slabs: levySlabs.length,
      bonusPolicies: (bonusPolicies || []).length,
      bonusExceptions: (bonusExceptions || []).length,
      holidayPolicies: (holidayPolicies || []).length,
      holidayExceptions: (holidayExceptions || []).length,
      calculationConfigs: (calculationConfigs || []).length,
      incomeCodes: (incomeCodes || []).length,
      incomeCategories: (incomeCategories || []).length,
      selfEmpRates: (selfEmpRates || []).length,
      incomeCodePolicies: (incomeCodePolicies || []).length,
      incomeCodeExceptions: (incomeCodeExceptions || []).length,
      filingConfigPeriods: (filingConfigPeriods || []).length,
    }
  };
}

// Publish to C3-Wizard
export function usePublishToC3Wizard() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  return useMutation({
    mutationKey: ['C3Config', 'c3_config_publish', 'create'],
    mutationFn: async () => {
      // Build payload — wrap so we can distinguish payload-build failures
      // (local DB / RLS / missing column) from Wizard-side failures.
      let payload: any, payloadHash: string, counts: any;
      try {
        const built = await buildSyncPayload();
        payload = built.payload;
        payloadHash = built.payloadHash;
        counts = built.counts;
      } catch (buildErr: any) {
        console.error('[C3 Publish] payload build failed:', buildErr);
        // Record the failed attempt so the History tab still shows it.
        try {
          await supabase.from('c3_config_sync_log').insert({
            status: 'failed',
            payload: {} as any,
            payload_hash: 'payload_build_failed',
            error_message: `[payload_build] ${buildErr?.message || String(buildErr)}`,
            published_by: userCode || null,
          });
        } catch (logInsertErr) {
          console.error('[C3 Publish] could not record payload_build failure:', logInsertErr);
        }
        throw new Error(`[payload_build] ${buildErr?.message || 'Failed to build sync payload'}`);
      }

      const { data: logEntry, error: logErr } = await supabase
        .from('c3_config_sync_log')
        .insert({
          status: 'pending',
          payload: payload as any,
          payload_hash: payloadHash,
          config_periods_count: counts.periods,
          levy_slabs_count: counts.slabs,
          bonus_exemptions_count: 0,
          bonus_policies_count: counts.bonusPolicies,
          bonus_exceptions_count: counts.bonusExceptions,
          holiday_policies_count: counts.holidayPolicies,
          holiday_exceptions_count: counts.holidayExceptions,
          calculation_configs_count: counts.calculationConfigs,
          income_codes_count: counts.incomeCodes,
          income_categories_count: counts.incomeCategories,
          self_emp_rates_count: counts.selfEmpRates,
          income_code_policies_count: counts.incomeCodePolicies,
          income_code_exceptions_count: counts.incomeCodeExceptions,
          filing_config_periods_count: counts.filingConfigPeriods,
          published_by: userCode || null,
        })
        .select('id')
        .single();

      if (logErr) throw logErr;

      try {
        // Always route through the c3-config-sync-publish edge function.
        // The edge function resolves the C3-Wizard URL + sync key from c3_site_settings
        // (DB is the single source of truth — no client-side env-var paths).
        let result: any;
        const { data: funcData, error: funcError } = await supabase.functions.invoke('c3-config-sync-publish', {
          body: payload,
        });

        if (funcError) {
          const errorMsg = funcError.message || 'Sync function failed';
          throw new Error(errorMsg);
        }

        result = funcData;

        // Check for error status in response (edge function now always returns 200 with wrapped errors)
        if (result?.status === 'error') {
          const errorDetail = result.error_type 
            ? `[${result.error_type}] ${result.error}` 
            : result.error;
          throw new Error(errorDetail || 'Sync failed on Wizard side');
        }

        // Handle success or skipped (idempotent duplicate)
        await supabase
          .from('c3_config_sync_log')
          .update({ 
            status: 'success', 
            response_data: result as any,
          })
          .eq('id', logEntry.id);

        // Mark all published tables as synced
        const now = new Date().toISOString();
        await Promise.all([
          supabase.from('c3_config_periods').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('tb_levy_slabs').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_bonus_policy_default').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_bonus_policy_exceptions').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_default').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_exceptions').update({ last_published_at: now }).eq('is_active', true),
          (supabase as any).from('c3_filing_config_periods').update({ last_published_at: now }).eq('is_active', true),
          // Note: c3_calculation_config, tb_income_codes, tb_income_cat, tb_self_emp_contrib_rate
          // don't have last_published_at columns — they are always fully synced on each publish
        ]);

        return { success: true, counts };
      } catch (apiError: any) {
        const errorMsg = apiError.message || 'Unknown error';
        await supabase
          .from('c3_config_sync_log')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', logEntry.id);

        throw apiError;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      const c = result.counts;
      toast.success(
        `Published to C3-Wizard (v4.1): ${c.periods} periods, ${c.slabs} levy slabs, ${c.bonusPolicies} bonus policies, ${c.bonusExceptions} bonus exceptions, ${c.holidayPolicies} holiday policies, ${c.holidayExceptions} holiday exceptions, ${c.calculationConfigs} calc configs, ${c.incomeCodes} income codes, ${c.incomeCategories} income categories, ${c.selfEmpRates} self-emp rates, ${c.incomeCodePolicies} IC policies, ${c.incomeCodeExceptions} IC exceptions, ${c.filingConfigPeriods} filing periods`
      );
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      toast.error('Failed to publish to C3-Wizard: ' + (error.message || 'Unknown error'));
    }
  });
}
