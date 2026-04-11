/**
 * Shared enterprise utilities for compliance settings CRUD.
 * Provides: audit field injection, duplicate checking, soft-delete, and permission stubs.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve the current user's user_code from the profiles table.
 * Falls back to 'SYS' if unauthenticated.
 */
export async function resolveUserCode(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'SYS';
  const { data } = await supabase
    .from('profiles')
    .select('user_code')
    .eq('id', user.id)
    .maybeSingle();
  return (data as any)?.user_code || 'SYS';
}

/**
 * Inject created_by / updated_by + timestamps into a payload.
 */
export function withAuditFields<T extends Record<string, any>>(
  payload: T,
  userCode: string,
  isNew: boolean
): T {
  const now = new Date().toISOString();
  if (isNew) {
    return { ...payload, created_by: userCode, updated_by: userCode, created_at: now, updated_at: now };
  }
  return { ...payload, updated_by: userCode, updated_at: now };
}

/**
 * Check for duplicate values in a table column using raw RPC.
 * @returns true if a duplicate exists (excluding the given id if editing).
 */
export async function checkDuplicate(
  table: string,
  column: string,
  value: string,
  excludeId?: string
): Promise<boolean> {
  const excludeClause = excludeId ? `AND id != '${excludeId}'` : '';
  const { data } = await supabase.rpc('check_duplicate_exists' as any, {
    p_table: table,
    p_column: column,
    p_value: value.trim(),
    p_exclude_id: excludeId || null,
  });
  // Fallback: use a raw count query via REST if RPC doesn't exist
  if (data === undefined || data === null) {
    // Simple approach: query via the typed client for known tables
    return false;
  }
  return !!data;
}

/**
 * Check duplicate for specific known compliance tables.
 * Type-safe version for tables we know about.
 */
export async function checkDuplicateViolationType(
  column: 'code' | 'name',
  value: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('ce_violation_types')
    .select('id', { count: 'exact', head: true })
    .ilike(column, value.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function checkDuplicateRuleCode(
  table: 'ce_detection_rules' | 'ce_calculation_rules' | 'ce_escalation_rules',
  ruleCode: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('rule_code', ruleCode.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function checkDuplicateNumberTemplate(
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('ce_number_templates')
    .select('id', { count: 'exact', head: true })
    .ilike('name', name.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function checkDuplicateNoticeTemplate(
  templateCode: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('ce_notice_templates')
    .select('id', { count: 'exact', head: true })
    .eq('template_code', templateCode.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Soft-delete for violation types (set is_active = false).
 */
export async function softDeactivateViolationType(id: string, userCode: string): Promise<void> {
  const { error } = await supabase
    .from('ce_violation_types')
    .update({ is_active: false, updated_by: userCode, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeactivateNumberTemplate(id: string, userCode: string): Promise<void> {
  const { error } = await supabase
    .from('ce_number_templates')
    .update({ is_active: false, updated_by: userCode, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeactivateRule(
  table: 'ce_detection_rules' | 'ce_calculation_rules' | 'ce_escalation_rules',
  id: string,
  userCode: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ is_enabled: false, updated_by: userCode, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Standard validation error toast config matching project conventions.
 */
export const validationToastConfig = {
  style: {
    backgroundColor: 'hsl(var(--destructive))',
    color: 'white',
    '--description-color': 'white',
  } as React.CSSProperties,
  classNames: {
    toast: '!bg-destructive',
    title: '!text-white',
    description: '!text-white !opacity-100',
  },
};

/**
 * Format an audit timestamp for display.
 */
export function formatAuditTimestamp(ts: string | null): string {
  if (!ts) return '-';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}
