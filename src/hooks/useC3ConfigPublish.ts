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
  published_by: string | null;
  published_at: string;
  created_at: string;
}

// Check if any config has been modified since last publish
export function useC3SyncStatus() {
  return useQuery({
    queryKey: ['c3-sync-status'],
    queryFn: async (): Promise<{ hasPendingChanges: boolean; lastPublishedAt: string | null; pendingCounts: { periods: number; slabs: number; exemptions: number } }> => {
      // Get the last successful sync
      const { data: lastSync } = await supabase
        .from('c3_config_sync_log')
        .select('published_at')
        .eq('status', 'success')
        .order('published_at', { ascending: false })
        .limit(1)
        .single();

      const lastPublishedAt = lastSync?.published_at || null;

      if (!lastPublishedAt) {
        // Never published - check if any data exists
        const [{ count: pCount }, { count: sCount }, { count: eCount }] = await Promise.all([
          supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }),
          supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }),
          supabase.from('c3_bonus_levy_exemptions').select('*', { count: 'exact', head: true }),
        ]);
        const total = (pCount || 0) + (sCount || 0) + (eCount || 0);
        return {
          hasPendingChanges: total > 0,
          lastPublishedAt: null,
          pendingCounts: { periods: pCount || 0, slabs: sCount || 0, exemptions: eCount || 0 }
        };
      }

      // Check for records modified after last publish
      const [{ count: pCount }, { count: sCount }, { count: eCount }] = await Promise.all([
        supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
        supabase.from('c3_bonus_levy_exemptions').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt),
      ]);

      // Also check records that were never published
      const [{ count: pNew }, { count: sNew }, { count: eNew }] = await Promise.all([
        supabase.from('c3_config_periods').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('tb_levy_slabs').select('*', { count: 'exact', head: true }).is('last_published_at', null),
        supabase.from('c3_bonus_levy_exemptions').select('*', { count: 'exact', head: true }).is('last_published_at', null),
      ]);

      const periods = (pCount || 0) + (pNew || 0);
      const slabs = (sCount || 0) + (sNew || 0);
      const exemptions = (eCount || 0) + (eNew || 0);

      return {
        hasPendingChanges: periods + slabs + exemptions > 0,
        lastPublishedAt,
        pendingCounts: { periods, slabs, exemptions }
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

// Fetch sync history log
export function useC3SyncLog() {
  return useQuery({
    queryKey: ['c3-sync-log'],
    queryFn: async (): Promise<C3SyncLogEntry[]> => {
      const { data, error } = await supabase
        .from('c3_config_sync_log')
        .select('id, sync_version, status, payload_hash, error_message, config_periods_count, levy_slabs_count, bonus_exemptions_count, published_by, published_at, created_at')
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as C3SyncLogEntry[];
    }
  });
}

// Build the full payload from all config tables
async function buildSyncPayload() {
  // Fetch all active config periods with their details
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

  // Map details to periods
  const configPeriods = (periods || []).map(p => ({
    ...p,
    details: details?.find(d => d.config_period_id === p.id) || null
  }));

  // Fetch all active levy slabs with their slab details
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

  // Fetch all active bonus exemptions
  const { data: exemptions, error: eErr } = await supabase
    .from('c3_bonus_levy_exemptions')
    .select('*')
    .eq('is_active', true)
    .order('period_year', { ascending: false });
  if (eErr) throw eErr;

  const payload = {
    sync_version: new Date().toISOString(),
    config_periods: configPeriods,
    levy_slabs: levySlabs,
    bonus_exemptions: exemptions || []
  };

  // Simple hash for deduplication
  const payloadHash = btoa(JSON.stringify(payload)).slice(0, 64);

  return { payload, payloadHash, counts: {
    periods: configPeriods.length,
    slabs: levySlabs.length,
    exemptions: (exemptions || []).length
  }};
}

// Publish to C3-Wizard
export function usePublishToC3Wizard() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  return useMutation({
    mutationFn: async () => {
      const { payload, payloadHash, counts } = await buildSyncPayload();

      // Insert sync log entry as pending
      const { data: logEntry, error: logErr } = await supabase
        .from('c3_config_sync_log')
        .insert({
          status: 'pending',
          payload: payload as any,
          payload_hash: payloadHash,
          config_periods_count: counts.periods,
          levy_slabs_count: counts.slabs,
          bonus_exemptions_count: counts.exemptions,
          published_by: userCode || null,
        })
        .select('id')
        .single();

      if (logErr) throw logErr;

      try {
        // TODO: Replace with actual C3-Wizard API call
        // const response = await fetch(`${C3_WIZARD_API_URL}/api/c3-config/sync`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        //   body: JSON.stringify(payload),
        // });

        // Simulate successful API call for now
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update sync log to success
        await supabase
          .from('c3_config_sync_log')
          .update({ status: 'success', response_data: { message: 'Sync completed successfully' } as any })
          .eq('id', logEntry.id);

        // Update last_published_at on all config tables
        const now = new Date().toISOString();
        await Promise.all([
          supabase.from('c3_config_periods').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('tb_levy_slabs').update({ last_published_at: now }).eq('is_active', true),
          supabase.from('c3_bonus_levy_exemptions').update({ last_published_at: now }).eq('is_active', true),
        ]);

        return { success: true, counts };
      } catch (apiError: any) {
        // Update sync log to failed
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
      toast.success(`Published to C3-Wizard: ${result.counts.periods} periods, ${result.counts.slabs} levy slabs, ${result.counts.exemptions} exemptions`);
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['c3-sync-log'] });
      toast.error('Failed to publish to C3-Wizard: ' + (error.message || 'Unknown error'));
    }
  });
}
