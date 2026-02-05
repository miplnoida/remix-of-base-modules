 /**
  * C3 Configuration Audit Logger
  * Centralized utility for logging all C3 configuration changes
  */
 
 import { supabase } from '@/integrations/supabase/client';
 
 export type C3ConfigType = 'period_config' | 'levy_slab' | 'levy_slab_detail' | 'bonus_exemption';
 export type C3AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CLONE';
 
 interface LogC3ChangeParams {
   configType: C3ConfigType;
   recordId: string;
   action: C3AuditAction;
   entityName: string;
   fieldName?: string;
   oldValue?: any;
   newValue?: any;
   changedBy?: string;
   changedByName?: string;
   reason?: string;
   metadata?: Record<string, any>;
 }
 
 /**
  * Log a C3 configuration change to the unified audit log
  */
 export async function logC3ConfigChange({
   configType,
   recordId,
   action,
   entityName,
   fieldName,
   oldValue,
   newValue,
   changedBy,
   changedByName,
   reason,
   metadata
 }: LogC3ChangeParams): Promise<string | null> {
   try {
     const { data, error } = await supabase.rpc('log_c3_config_change', {
       p_config_type: configType,
       p_record_id: recordId,
       p_action: action,
       p_entity_name: entityName,
       p_field_name: fieldName || null,
       p_old_value: oldValue !== undefined ? JSON.stringify(oldValue) : null,
       p_new_value: newValue !== undefined ? JSON.stringify(newValue) : null,
       p_changed_by: changedBy || null,
       p_changed_by_name: changedByName || null,
       p_reason: reason || null,
       p_metadata: metadata ? JSON.stringify(metadata) : null
     });
 
     if (error) {
       console.error('Failed to log C3 config change:', error);
       return null;
     }
 
     return data;
   } catch (err) {
     console.error('Error logging C3 config change:', err);
     return null;
   }
 }
 
 /**
  * Helper to format dates for display in audit logs
  */
 export function formatAuditDate(dateStr: string): string {
   const date = new Date(dateStr);
   return date.toLocaleDateString('en-GB', {
     day: '2-digit',
     month: 'short',
     year: 'numeric'
   });
 }
 
 /**
  * Helper to format period for bonus exemption
  */
 export function formatBonusPeriod(year: number, month: number): string {
   const monthNames = [
     'January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'
   ];
   return `${monthNames[month - 1]} ${year}`;
 }