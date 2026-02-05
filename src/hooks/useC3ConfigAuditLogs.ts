 /**
  * Hook for C3 Configuration Audit Logs
  * Fetches audit data from c3_config_audit and c3_calculation_config_audit tables
  */
 
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 export interface C3AuditLog {
   id: string;
   source: 'period_config' | 'calculation_config';
   action: string;
   config_key?: string;
   old_value: string | null;
   new_value: string | null;
   changed_by: string | null;
   changed_by_name: string | null;
   changed_at: string;
   reason: string | null;
   period_start?: string | null;
 }
 
 export function useC3ConfigAuditLogs(limit: number = 100) {
   return useQuery({
     queryKey: ['c3-config-audit-logs', limit],
     queryFn: async (): Promise<C3AuditLog[]> => {
       // Fetch period config audit logs
       const { data: periodAudits, error: periodError } = await supabase
         .from('c3_config_audit')
         .select(`
           id,
           config_period_id,
           action,
           old_values,
           new_values,
           changed_by,
           changed_by_name,
           changed_at,
           reason,
           c3_config_periods!c3_config_audit_config_period_id_fkey(start_date)
         `)
         .order('changed_at', { ascending: false })
         .limit(limit);
 
       if (periodError) throw periodError;
 
       // Fetch calculation config audit logs
       const { data: calcAudits, error: calcError } = await supabase
         .from('c3_calculation_config_audit')
         .select('*')
         .order('changed_at', { ascending: false })
         .limit(limit);
 
       if (calcError) throw calcError;
 
       // Transform period audits
       const transformedPeriodAudits: C3AuditLog[] = (periodAudits || []).map((audit: any) => ({
         id: audit.id,
         source: 'period_config' as const,
         action: audit.action || 'UPDATE',
         config_key: 'Period Configuration',
         old_value: audit.old_values ? JSON.stringify(audit.old_values, null, 2) : null,
         new_value: audit.new_values ? JSON.stringify(audit.new_values, null, 2) : null,
         changed_by: audit.changed_by,
         changed_by_name: audit.changed_by_name,
         changed_at: audit.changed_at,
         reason: audit.reason,
         period_start: audit.c3_config_periods?.start_date
       }));
 
       // Transform calculation audits
       const transformedCalcAudits: C3AuditLog[] = (calcAudits || []).map((audit: any) => ({
         id: audit.id,
         source: 'calculation_config' as const,
         action: 'UPDATE',
         config_key: audit.config_key,
         old_value: audit.old_value?.toString() || null,
         new_value: audit.new_value?.toString() || null,
         changed_by: audit.changed_by,
         changed_by_name: audit.changed_by_name,
         changed_at: audit.changed_at,
         reason: audit.reason,
         period_start: null
       }));
 
       // Combine and sort by date
       const allAudits = [...transformedPeriodAudits, ...transformedCalcAudits];
       allAudits.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
 
       return allAudits.slice(0, limit);
     }
   });
 }