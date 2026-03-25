/**
 * Hook for publishing Self-Employed wages (ip_self_category) to C3-Wizard
 * Follows the same pattern as useC3ConfigPublish
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';

interface SEWagesPayloadEntry {
  activity_seq_no: string;
  activity_type: string | null;
  self_ref_no: string;
  effective_start_date: string;
  effective_end_date: string | null;
  wage_category: number | null;
  category_code: string | null;
}

interface SEWagesPayload {
  sync_version: string;
  sync_type: string;
  sync_timestamp: string;
  ssn: string;
  self_ref_no: string;
  wages: SEWagesPayloadEntry[];
}

// Build publish payload from ip_self_category + ip_self_employ + tb_income_cat
async function buildSEWagesPayload(ssn: string): Promise<{
  payload: SEWagesPayload;
  payloadHash: string;
  recordsCount: number;
}> {
  // Fetch all wage categories for this SSN
  const { data: categories, error: catErr } = await (supabase as any)
    .from('ip_self_category')
    .select('*')
    .eq('ssn', ssn)
    .order('activity_seq_no')
    .order('effective_start_date');
  if (catErr) throw catErr;

  // Fetch activities for this SSN to get activity_type and self_ref_no
  const { data: activities, error: actErr } = await (supabase as any)
    .from('ip_self_employ')
    .select('activity_seq_no, activity_type, self_ref_no')
    .eq('ssn', ssn);
  if (actErr) throw actErr;

  // Fetch income categories for code lookup
  const { data: incomeCats, error: icErr } = await (supabase as any)
    .from('tb_income_cat')
    .select('category_code, wage_upper');
  if (icErr) throw icErr;

  const selfRefNo = activities?.[0]?.self_ref_no || '';

  const wages: SEWagesPayloadEntry[] = (categories || []).map((cat: any) => {
    const activity = activities?.find((a: any) => a.activity_seq_no === cat.activity_seq_no);
    const incomeCat = incomeCats?.find((ic: any) => Number(ic.wage_upper) === Number(cat.wage_category));

    return {
      activity_seq_no: cat.activity_seq_no,
      activity_type: activity?.activity_type || null,
      self_ref_no: cat.self_ref_no || selfRefNo,
      effective_start_date: cat.effective_start_date,
      effective_end_date: cat.effective_end_date || null,
      wage_category: cat.wage_category != null ? Number(cat.wage_category) : null,
      category_code: incomeCat?.category_code || null,
    };
  });

  const payload: SEWagesPayload = {
    sync_version: '1.0',
    sync_type: 'se_wages',
    sync_timestamp: new Date().toISOString(),
    ssn,
    self_ref_no: selfRefNo,
    wages,
  };

  const payloadHash = btoa(JSON.stringify(payload)).slice(0, 64);

  return { payload, payloadHash, recordsCount: wages.length };
}

// Sync status: last publish info for a given SSN
export function useSEWagesSyncStatus(ssn: string) {
  return useQuery({
    queryKey: ['se-wages-sync-status', ssn],
    enabled: !!ssn,
    queryFn: async () => {
      const { data: lastSync } = await (supabase as any)
        .from('se_wages_sync_log')
        .select('published_at, status, records_count')
        .eq('ssn', ssn)
        .eq('status', 'success')
        .order('published_at', { ascending: false })
        .limit(1)
        .single();

      return {
        lastPublishedAt: lastSync?.published_at || null,
        lastRecordsCount: lastSync?.records_count || 0,
      };
    },
    refetchInterval: 30000,
  });
}

// Publish mutation
export function usePublishSEWages() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  return useMutation({
    mutationFn: async (ssn: string) => {
      const { payload, payloadHash, recordsCount } = await buildSEWagesPayload(ssn);

      if (recordsCount === 0) {
        throw new Error('No wage categories to publish for this SSN.');
      }

      // Insert pending log
      const { data: logEntry, error: logErr } = await (supabase as any)
        .from('se_wages_sync_log')
        .insert({
          ssn,
          status: 'pending',
          payload: payload,
          payload_hash: payloadHash,
          records_count: recordsCount,
          published_by: userCode || null,
        })
        .select('id')
        .single();

      if (logErr) throw logErr;

      try {
        // Invoke edge function
        const { data: funcData, error: funcError } = await supabase.functions.invoke('se-wages-sync-publish', {
          body: payload,
        });

        if (funcError) {
          throw new Error(funcError.message || 'SE wages sync function failed');
        }

        // Check for error in response
        if (funcData?.status === 'error') {
          const errorDetail = funcData.error_type
            ? `[${funcData.error_type}] ${funcData.error}`
            : funcData.error;
          throw new Error(errorDetail || 'Sync failed on Wizard side');
        }

        // Update log to success
        await (supabase as any)
          .from('se_wages_sync_log')
          .update({ status: 'success', response_data: funcData })
          .eq('id', logEntry.id);

        return { success: true, recordsCount };
      } catch (apiError: any) {
        const errorMsg = apiError.message || 'Unknown error';
        await (supabase as any)
          .from('se_wages_sync_log')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', logEntry.id);
        throw apiError;
      }
    },
    onSuccess: (result, ssn) => {
      queryClient.invalidateQueries({ queryKey: ['se-wages-sync-status', ssn] });
      toast.success(`Published ${result.recordsCount} wage categor${result.recordsCount === 1 ? 'y' : 'ies'} to C3-Wizard`);
    },
    onError: (error: any) => {
      toast.error('Failed to publish SE wages: ' + (error.message || 'Unknown error'));
    },
  });
}
