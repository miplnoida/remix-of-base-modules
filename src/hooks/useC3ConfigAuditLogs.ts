/**
 * Hook for C3 Configuration Audit Logs
 * Fetches audit data from the unified c3_unified_audit_log table
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface C3AuditLog {
  id: string;
  config_type: string;
  record_id: string;
  action: string;
  entity_name: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  reason: string | null;
  metadata: any;
}

export function useC3ConfigAuditLogs(limit: number = 200) {
  return useQuery({
    queryKey: ['c3-unified-audit-logs', limit],
    queryFn: async (): Promise<C3AuditLog[]> => {
      const { data, error } = await supabase
        .from('c3_unified_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    // Refetch every 30 seconds to keep audit logs fresh
    refetchInterval: 30000
  });
}

// Helper to get display name for config type
export function getConfigTypeLabel(configType: string): string {
  switch (configType) {
    case 'period_config':
      return 'Period Configuration';
    case 'levy_slab':
      return 'Levy Slab';
    case 'levy_slab_detail':
      return 'Levy Slab Detail';
    case 'bonus_exemption':
      return 'Bonus Exemption';
    default:
      return configType;
  }
}