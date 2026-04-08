/**
 * Risk Realtime Sync Hook
 * Subscribes to Supabase Realtime changes on risk-related tables
 * and automatically invalidates React Query caches so the UI stays current.
 *
 * Mount this ONCE at the audit module layout level.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const RISK_QUERY_KEYS = [
  'ia_risk_register',
  'ia_risk_register_dupes',
  'ia_risk_mitigation_actions',
  'ia_risk_reviews',
  'ia_risk_config_master',
  'ia_risk_classification_thresholds',
  'ia_resolve_engagement_risk',
] as const;

/**
 * Invalidate all risk-related queries so every component
 * re-fetches with the latest data.
 */
function invalidateAllRiskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  RISK_QUERY_KEYS.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

export function useRiskRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('risk-engine-sync')
      // When risk register rows change (e.g. batch recalculation)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ia_risk_register' },
        () => invalidateAllRiskQueries(queryClient)
      )
      // When config master changes (formula, scale, etc.)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ia_risk_config_master' },
        () => invalidateAllRiskQueries(queryClient)
      )
      // When rating bands change
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ia_risk_classification_thresholds' },
        () => invalidateAllRiskQueries(queryClient)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
