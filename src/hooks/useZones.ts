// ============================================
// PHASE 4 — Zones data hook
// ============================================
// Reads from existing ce_zones table. No new tables.
// ============================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceZone {
  id: string;
  zone_code: string;
  zone_name: string;
  territory: string | null;
  is_active: boolean;
}

export function useZones() {
  return useQuery<ComplianceZone[]>({
    queryKey: ['ce-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_zones')
        .select('id, zone_code, zone_name, territory, is_active')
        .eq('is_active', true)
        .order('territory', { ascending: true })
        .order('zone_code', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ComplianceZone[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — zones change rarely
  });
}
