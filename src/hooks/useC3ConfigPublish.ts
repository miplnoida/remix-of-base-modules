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
}

// Check if any config has been modified since last publish
export function useC3SyncStatus() {
  return useQuery({
    queryKey: ['c3-sync-status'],
    queryFn: async (): Promise<{ hasPendingChanges: boolean; lastPublishedAt: string | null; pendingCounts: SyncPendingCounts }> => {
      const { data: lastSync } = await supabase
        .from('c3_config_sync_log')
        .select('published_at')
        .eq('status', 'success')
        .order('published_at', { ascending: false })
        .limit(1)
        .single();

      const lastPublishedAt = lastSync?.published_at || null;

      if (!lastPublishedAt) {
        const [{ count: pCount }, { count: sCount }, { count: bpCount }, { count: beCount }, { count: hpCount }, { count: heCount }, { count: ccCount }, { count: icCount }, { count: catCount }, { count: seCount }, { count: icpCount }, { count: iceCount }] = await Promise.all([
          supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }),
          supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }),
          supabase.from('c3_bonus_policy_default').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_bonus_policy_exceptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_default').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_exceptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_calculation_config').select('*', { count: 'exact', head: true }).eq('is_active', true),
          (supabase as any).from('tb_income_codes').select('*', { count: 'exact', head: true }),
          (supabase as any).from('tb_income_cat').select('*', { count: 'exact', head: true }),
          (supabase as any).from('tb_self_emp_contrib_rate').select('*', { count: 'exact', head: true }),
          (supabase as any).from('c3_income_code_policy_default').select('*', { count: 'exact', head: true }).eq('is_active', true),
          (supabase as any).from('c3_income_code_policy_exceptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        ]);
        const total = (pCount || 0) + (sCount || 0) + (bpCount || 0) + (beCount || 0) + (hpCount || 0) + (heCount || 0) + (ccCount || 0) + (icCount || 0) + (catCount || 0) + (seCount || 0) + (icpCount || 0) + (iceCount || 0);
        return {
          hasPendingChanges: total > 0,
          lastPublishedAt: null,
          pendingCounts: {
            periods: pCount || 0, slabs: sCount || 0,
            bonusPolicies: bpCount || 0, bonusExceptions: beCount || 0,
            holidayPolicies: hpCount || 0, holidayExceptions: heCount || 0,
            calculationConfigs: ccCount || 0, incomeCodes: icCount || 0,
            incomeCategories: catCount || 0, selfEmpRates: seCount || 0,
            incomeCodePolicies: icpCount || 0, incomeCodeExceptions: iceCount || 0,
          }
        };
      }

      // Check for modifications since last publish across all tables
      const [
        { count: pMod }, { count: sMod },
        { count: bpMod }, { count: beMod },
        { count: hpMod }, { count: heMod },
        { count: ccMod },
        { count: icpMod }, { count: iceMod },
      ] = await Promise.all([
        supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_bonus_policy_default').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_bonus_policy_exceptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_holiday_pay_policy_default').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_holiday_pay_policy_exceptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_calculation_config').select('*', { count: 'exact', head: true }).gt('updated_at', lastPublishedAt),
        (supabase as any).from('c3_income_code_policy_default').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        (supabase as any).from('c3_income_code_policy_exceptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
      ]);

      // Check for never-published records (tables with last_published_at column)
      const [
        { count: pNew }, { count: sNew },
        { count: bpNew }, { count: beNew },
        { count: hpNew }, { count: heNew },
      ] = await Promise.all([
        supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('c3_bonus_policy_default').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('c3_bonus_policy_exceptions').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('c3_holiday_pay_policy_default').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('c3_holiday_pay_policy_exceptions').select('*', { count: 'exact', head: true }).is('last_published_at', null),
      ]);

      // For tables without last_published_at: compare modification timestamps against last publish
      const [{ count: icMod }, { count: catMod }, { count: seMod }] = await Promise.all([
        (supabase as any).from('tb_income_codes').select('*', { count: 'exact', head: true }).gt('updated_at', lastPublishedAt),
        (supabase as any).from('tb_income_cat').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        (supabase as any).from('tb_self_emp_contrib_rate').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
      ]);

      const periods = (pMod || 0) + (pNew || 0);
      const slabs = (sMod || 0) + (sNew || 0);
      const bonusPolicies = (bpMod || 0) + (bpNew || 0);
      const bonusExceptions = (beMod || 0) + (beNew || 0);
      const holidayPolicies = (hpMod || 0) + (hpNew || 0);
      const holidayExceptions = (heMod || 0) + (heNew || 0);
      const calculationConfigs = ccMod || 0;
      const incomeCodes = icMod || 0;
      const incomeCategories = catMod || 0;
      const selfEmpRates = seMod || 0;
      const incomeCodePolicies = icpMod || 0;
      const incomeCodeExceptions = iceMod || 0;

      return {
        hasPendingChanges: periods + slabs + bonusPolicies + bonusExceptions + holidayPolicies + holidayExceptions + calculationConfigs + incomeCodes + incomeCategories + selfEmpRates + incomeCodePolicies + incomeCodeExceptions > 0,
        lastPublishedAt,
        pendingCounts: { periods, slabs, bonusPolicies, bonusExceptions, holidayPolicies, holidayExceptions, calculationConfigs, incomeCodes, incomeCategories, selfEmpRates, incomeCodePolicies, incomeCodeExceptions }
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

  const syncTimestamp = new Date().toISOString();
  const payload = {
    sync_version: '4.0',
    sync_timestamp: syncTimestamp,
    config_periods: configPeriods,
    levy_slabs: levySlabs,
    bonus_policies: bonusPolicies || [],
    bonus_exceptions: bonusExceptions || [],
    holiday_policies: holidayPolicies || [],
    holiday_exceptions: holidayExceptions || [],
    calculation_configs: calculationConfigs || [],
    income_codes: incomeCodes || [],
    income_categories: incomeCategories || [],
    self_emp_contrib_rates: selfEmpRates || [],
    income_code_policies: incomeCodePolicies || [],
    income_code_exceptions: incomeCodeExceptions || [],
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
    }
  };
}

// Publish to C3-Wizard
export function usePublishToC3Wizard() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  return useMutation({
    mutationFn: async () => {
      const { payload, payloadHash, counts } = await buildSyncPayload();

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
          published_by: userCode || null,
        })
        .select('id')
        .single();

      if (logErr) throw logErr;

      try {
        // Call C3-Wizard sync API
        const syncUrl = import.meta.env.VITE_C3_WIZARD_SYNC_URL;
        
        let result: any;
        
        if (!syncUrl) {
          // Fallback: use edge function to proxy the call (secrets are only accessible there)
          const { data: funcData, error: funcError } = await supabase.functions.invoke('c3-config-sync-publish', {
            body: payload,
          });
          
          if (funcError) {
            // Try to extract meaningful error from the response
            const errorMsg = funcError.message || 'Sync function failed';
            throw new Error(errorMsg);
          }
          
          result = funcData;
        } else {
          // Direct API call (for environments with URL configured)
          const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-sync-api-key': import.meta.env.VITE_C3_CONFIG_SYNC_API_KEY || '',
            },
            body: JSON.stringify(payload),
          });
          
          result = await response.json();
          
          if (!response.ok) {
            throw new Error(result?.error || `Sync failed with status ${response.status}`);
          }
        }

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
        `Published to C3-Wizard (v4.0): ${c.periods} periods, ${c.slabs} levy slabs, ${c.bonusPolicies} bonus policies, ${c.bonusExceptions} bonus exceptions, ${c.holidayPolicies} holiday policies, ${c.holidayExceptions} holiday exceptions, ${c.calculationConfigs} calc configs, ${c.incomeCodes} income codes, ${c.incomeCategories} income categories, ${c.selfEmpRates} self-emp rates, ${c.incomeCodePolicies} IC policies, ${c.incomeCodeExceptions} IC exceptions`
      );
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      toast.error('Failed to publish to C3-Wizard: ' + (error.message || 'Unknown error'));
    }
  });
}
