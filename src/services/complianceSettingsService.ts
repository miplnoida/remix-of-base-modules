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
): T & { created_by?: string; updated_by: string; created_at?: string; updated_at: string } {
  const now = new Date().toISOString();
  if (isNew) {
    return { ...payload, created_by: userCode, updated_by: userCode, created_at: now, updated_at: now };
  }
  return { ...payload, updated_by: userCode, updated_at: now };
}

/**
 * Check for duplicate values in a table column.
 * @returns true if a duplicate exists (excluding the given id if editing).
 */
export async function checkDuplicate(
  table: string,
  column: string,
  value: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .ilike(column, value.trim());
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Soft-delete: set is_active/is_enabled to false instead of destructive delete.
 */
export async function softDeactivate(
  table: string,
  id: string,
  userCode: string,
  activeField: 'is_active' | 'is_enabled' = 'is_active'
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({
      [activeField]: false,
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    } as any)
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
