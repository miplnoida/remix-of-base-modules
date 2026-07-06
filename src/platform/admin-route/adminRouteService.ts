import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import type {
  AdminDomain,
  AdminRouteFilters,
  AdminRouteFormValues,
  AdminRouteRegistryEntry,
} from './adminRouteTypes';

const DOMAIN_TABLE = 'core_admin_domain_registry';
const ROUTE_TABLE = 'core_admin_route_registry';

// Cast to any for tables not yet in generated types
const db = supabase as any;

export async function getAdminDomains(): Promise<AdminDomain[]> {
  const { data, error } = await db
    .from(DOMAIN_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminDomain[];
}

export async function getAdminRoutes(
  filters: AdminRouteFilters = {},
): Promise<AdminRouteRegistryEntry[]> {
  let query = db.from(ROUTE_TABLE).select('*').order('admin_domain').order('display_order');

  if (filters.admin_domain) query = query.eq('admin_domain', filters.admin_domain);
  if (filters.canonical_status) query = query.eq('canonical_status', filters.canonical_status);
  if (filters.owner_module_code) query = query.eq('owner_module_code', filters.owner_module_code);
  if (typeof filters.is_active === 'boolean') query = query.eq('is_active', filters.is_active);
  if (typeof filters.show_in_platform_admin === 'boolean')
    query = query.eq('show_in_platform_admin', filters.show_in_platform_admin);
  if (filters.missing_permission) query = query.is('requires_permission', null);
  if (filters.missing_replacement) query = query.is('replacement_route', null);
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`route_path.ilike.${s},page_name.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminRouteRegistryEntry[];
}

export async function getAdminRouteById(id: string): Promise<AdminRouteRegistryEntry | null> {
  const { data, error } = await db.from(ROUTE_TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as AdminRouteRegistryEntry | null;
}

export async function createAdminRoute(
  payload: AdminRouteFormValues,
): Promise<AdminRouteRegistryEntry> {
  const { data, error } = await db.from(ROUTE_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('ADMIN_ROUTE_CREATED', data.id, null, data);
  return data as AdminRouteRegistryEntry;
}

export async function updateAdminRoute(
  id: string,
  payload: Partial<AdminRouteFormValues>,
): Promise<AdminRouteRegistryEntry> {
  const before = await getAdminRouteById(id);
  const { data, error } = await db
    .from(ROUTE_TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  await safeAudit('ADMIN_ROUTE_UPDATED', id, before, data);
  return data as AdminRouteRegistryEntry;
}

export async function upsertAdminRoute(
  payload: AdminRouteFormValues,
): Promise<AdminRouteRegistryEntry> {
  const { data, error } = await db
    .from(ROUTE_TABLE)
    .upsert(payload, { onConflict: 'route_path' })
    .select('*')
    .single();
  if (error) throw error;
  return data as AdminRouteRegistryEntry;
}

export async function deleteOrDeactivateAdminRoute(id: string): Promise<void> {
  const before = await getAdminRouteById(id);
  const { error } = await db
    .from(ROUTE_TABLE)
    .update({ is_active: false, show_in_platform_admin: false })
    .eq('id', id);
  if (error) throw error;
  await safeAudit('ADMIN_ROUTE_DEACTIVATED', id, before, { is_active: false });
}

export async function reactivateAdminRoute(id: string): Promise<void> {
  const before = await getAdminRouteById(id);
  const { error } = await db.from(ROUTE_TABLE).update({ is_active: true }).eq('id', id);
  if (error) throw error;
  await safeAudit('ADMIN_ROUTE_REACTIVATED', id, before, { is_active: true });
}

async function safeAudit(action: string, id: string, before: unknown, after: unknown) {
  try {
    await logAudit({
      action,
      module: 'CORE_ADMIN',
      entity_type: 'core_admin_route_registry',
      entity_id: id,
      before_value: (before ?? undefined) as any,
      after_value: (after ?? undefined) as any,
    });
  } catch {
    // audit is best-effort
  }
}
