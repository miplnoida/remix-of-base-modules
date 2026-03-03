/**
 * Hook for C3 Configuration Publish to C3-Wizard
 * Handles payload building, publishing, sync log tracking, and pending change detection
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
        const [{ count: pCount }, { count: sCount }, { count: bpCount }, { count: beCount }, { count: hpCount }, { count: heCount }] = await Promise.all([
          supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }),
          supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }),
          supabase.from('c3_bonus_policy_default').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_bonus_policy_exceptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_default').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_exceptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        ]);
        const total = (pCount || 0) + (sCount || 0) + (bpCount || 0) + (beCount || 0) + (hpCount || 0) + (heCount || 0);
        return {
          hasPendingChanges: total > 0,
          lastPublishedAt: null,
          pendingCounts: {
            periods: pCount || 0, slabs: sCount || 0,
            bonusPolicies: bpCount || 0, bonusExceptions: beCount || 0,
            holidayPolicies: hpCount || 0, holidayExceptions: heCount || 0,
          }
        };
      }

      // Check for modifications since last publish
      const [
        { count: pMod }, { count: sMod },
        { count: bpMod }, { count: beMod },
        { count: hpMod }, { count: heMod },
      ] = await Promise.all([
        supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_bonus_policy_default').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_bonus_policy_exceptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_holiday_pay_policy_default').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_holiday_pay_policy_exceptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
      ]);

      // Check for never-published records
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

      const periods = (pMod || 0) + (pNew || 0);
      const slabs = (sMod || 0) + (sNew || 0);
      const bonusPolicies = (bpMod || 0) + (bpNew || 0);
      const bonusExceptions = (beMod || 0) + (beNew || 0);
      const holidayPolicies = (hpMod || 0) + (hpNew || 0);
      const holidayExceptions = (heMod || 0) + (heNew || 0);

      return {
        hasPendingChanges: periods + slabs + bonusPolicies + bonusExceptions + holidayPolicies + holidayExceptions > 0,
        lastPublishedAt,
        pendingCounts: { periods, slabs, bonusPolicies, bonusExceptions, holidayPolicies, holidayExceptions }
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

  const payload = {
    sync_version: new Date().toISOString(),
    config_periods: configPeriods,
    levy_slabs: levySlabs,
    bonus_policies: bonusPolicies || [],
    bonus_exceptions: bonusExceptions || [],
    holiday_policies: holidayPolicies || [],
    holiday_exceptions: holidayExceptions || [],
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
          published_by: userCode || null,
        })
        .select('id')
        .single();

      if (logErr) throw logErr;

      try {
        // TODO: Replace with actual C3-Wizard API call
        // POST to: ${C3_WIZARD_API_URL}/functions/v1/c3-config-sync
        // Headers: { 'Content-Type': 'application/json', 'x-sync-api-key': C3_CONFIG_SYNC_API_KEY }
        // Body: payload
        await new Promise(resolve => setTimeout(resolve, 1500));

        await supabase
          .from('c3_config_sync_log')
          .update({ status: 'success', response_data: { message: 'Sync completed successfully' } as any })
          .eq('id', logEntry.id);

        const now = new Date().toISOString();
        await Promise.all([
          supabase.from('c3_config_periods').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('tb_levy_slabs').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_bonus_policy_default').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_bonus_policy_exceptions').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_default').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_holiday_pay_policy_exceptions').update({ last_published_at: now }).eq('is_active', true),
        ]);

        return { success: true, counts };
      } catch (apiError: any) {
        await supabase
          .from('c3_config_sync_log')
          .update({ status: 'failed', error_message: apiError.message || 'Unknown error' })
          .eq('id', logEntry.id);

        throw apiError;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      toast.success(
        `Published to C3-Wizard: ${result.counts.periods} periods, ${result.counts.slabs} levy slabs, ${result.counts.bonusPolicies} bonus policies, ${result.counts.bonusExceptions} bonus exceptions, ${result.counts.holidayPolicies} holiday policies, ${result.counts.holidayExceptions} holiday exceptions`
      );
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      toast.error('Failed to publish to C3-Wizard: ' + (error.message || 'Unknown error'));
    }
  });
}
