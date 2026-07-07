import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import {
  ALL_PERMISSION_DEFINITIONS,
} from './permissionRegistry';
import type {
  PermissionComparison,
  PermissionRegistryEntry,
  PermissionRegistryFilters,
  PermissionRegistryFormValues,
  PermissionSourceDefinition,
  PermissionSyncResult,
} from './permissionTypes';
import { validatePermissionKey } from './permissionTypes';

const TABLE = 'core_permission_registry';
const SYNC_TABLE = 'core_permission_sync_log';

// Cast because generated types aren't updated yet for these tables/views.
const db = supabase as any;

/* ------------------------------------------------------------------ */
/* Permission registry CRUD                                            */
/* ------------------------------------------------------------------ */

export async function getPermissionRegistryEntries(
  filters: PermissionRegistryFilters = {},
): Promise<PermissionRegistryEntry[]> {
  let q = db.from(TABLE).select('*').order('module_code').order('permission_key');

  if (filters.module_code) q = q.eq('module_code', filters.module_code);
  if (filters.domain_code) q = q.eq('domain_code', filters.domain_code);
  if (filters.permission_scope) q = q.eq('permission_scope', filters.permission_scope);
  if (filters.risk_level) q = q.eq('risk_level', filters.risk_level);
  if (filters.lifecycle_status) q = q.eq('lifecycle_status', filters.lifecycle_status);
  if (typeof filters.is_platform_permission === 'boolean')
    q = q.eq('is_platform_permission', filters.is_platform_permission);
  if (typeof filters.is_admin_permission === 'boolean')
    q = q.eq('is_admin_permission', filters.is_admin_permission);
  if (typeof filters.is_sensitive_permission === 'boolean')
    q = q.eq('is_sensitive_permission', filters.is_sensitive_permission);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`permission_key.ilike.${s},permission_name.ilike.${s}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PermissionRegistryEntry[];
}

export async function getPermissionRegistryEntryById(
  id: string,
): Promise<PermissionRegistryEntry | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as PermissionRegistryEntry | null;
}

export async function createPermissionRegistryEntry(
  payload: PermissionRegistryFormValues,
): Promise<PermissionRegistryEntry> {
  const errs = validatePermissionKey(payload.permission_key);
  if (errs.length) throw new Error(errs[0]);
  if (!payload.module_code) throw new Error('module_code is required');
  if (!payload.action_code) throw new Error('action_code is required');

  const { data, error } = await db.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('PERMISSION_REGISTRY_CREATED', data.id, null, data);
  return data as PermissionRegistryEntry;
}

export async function updatePermissionRegistryEntry(
  id: string,
  payload: Partial<PermissionRegistryFormValues>,
): Promise<PermissionRegistryEntry> {
  const before = await getPermissionRegistryEntryById(id);
  const { data, error } = await db.from(TABLE).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('PERMISSION_REGISTRY_UPDATED', id, before, data);
  return data as PermissionRegistryEntry;
}

export async function deactivatePermissionRegistryEntry(id: string): Promise<void> {
  const before = await getPermissionRegistryEntryById(id);
  const { error } = await db.from(TABLE).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('PERMISSION_REGISTRY_DEACTIVATED', id, before, { is_active: false });
}

export async function reactivatePermissionRegistryEntry(id: string): Promise<void> {
  const before = await getPermissionRegistryEntryById(id);
  const { error } = await db.from(TABLE).update({ is_active: true }).eq('id', id);
  if (error) throw error;
  await safeAudit('PERMISSION_REGISTRY_REACTIVATED', id, before, { is_active: true });
}

/* ------------------------------------------------------------------ */
/* Registry ↔ database comparison + sync                               */
/* ------------------------------------------------------------------ */

export async function compareRegistryWithDatabase(): Promise<PermissionComparison> {
  const dbRows = await getPermissionRegistryEntries();
  const dbKeys = new Set(dbRows.map((r) => r.permission_key));
  const srcKeys = new Set(ALL_PERMISSION_DEFINITIONS.map((s) => s.permission_key));

  const missing_in_db = ALL_PERMISSION_DEFINITIONS.filter((s) => !dbKeys.has(s.permission_key));
  const missing_in_registry = dbRows.filter((r) => !srcKeys.has(r.permission_key));
  const in_both = [...srcKeys].filter((k) => dbKeys.has(k));

  return {
    in_both,
    missing_in_db,
    missing_in_registry,
    deprecated_still_assigned: [],
  };
}

function toRegistryRow(def: PermissionSourceDefinition) {
  return {
    permission_key: def.permission_key,
    permission_name: def.permission_name,
    description: def.description ?? null,
    module_code: def.module_code,
    domain_code: def.domain_code ?? null,
    permission_scope: def.permission_scope,
    action_code: def.action_code,
    is_platform_permission: def.is_platform_permission ?? false,
    is_admin_permission: def.is_admin_permission ?? false,
    is_sensitive_permission: def.is_sensitive_permission ?? false,
    risk_level: def.risk_level ?? 'LOW',
    lifecycle_status: def.lifecycle_status ?? 'ACTIVE',
    seeded_from_registry: true,
    source_file: def.source_file ?? null,
    is_active: true,
  };
}

export async function syncPermissionsFromRegistry(): Promise<PermissionSyncResult> {
  const started_at = new Date().toISOString();
  let syncId: string | undefined;

  try {
    const startRow = await db
      .from(SYNC_TABLE)
      .insert({ sync_status: 'STARTED', source: 'permissionRegistry' })
      .select('id')
      .single();
    syncId = startRow.data?.id;
    await safeAudit('PERMISSION_REGISTRY_SYNC_STARTED', syncId ?? 'sync', null, {
      count: ALL_PERMISSION_DEFINITIONS.length,
    });

    const comparison = await compareRegistryWithDatabase();
    let created = 0;
    let updated = 0;

    for (const def of ALL_PERMISSION_DEFINITIONS) {
      const { error, data } = await db
        .from(TABLE)
        .upsert(toRegistryRow(def), { onConflict: 'permission_key' })
        .select('id, xmin')
        .maybeSingle();
      if (error) throw error;
      if (comparison.missing_in_db.some((m) => m.permission_key === def.permission_key)) {
        created += 1;
      } else if (data) {
        updated += 1;
      }
    }

    const completed_at = new Date().toISOString();
    const summary = {
      permissions_found: ALL_PERMISSION_DEFINITIONS.length,
      permissions_created: created,
      permissions_updated: updated,
      permissions_missing_in_db: comparison.missing_in_db.length,
      permissions_missing_in_registry: comparison.missing_in_registry.length,
    };

    if (syncId) {
      await db
        .from(SYNC_TABLE)
        .update({
          sync_status: 'COMPLETED',
          sync_completed_at: completed_at,
          ...summary,
          summary,
        })
        .eq('id', syncId);
    }
    await safeAudit('PERMISSION_REGISTRY_SYNC_COMPLETED', syncId ?? 'sync', null, summary);

    return {
      sync_id: syncId,
      started_at,
      completed_at,
      status: 'COMPLETED',
      permissions_found: ALL_PERMISSION_DEFINITIONS.length,
      permissions_created: created,
      permissions_updated: updated,
      permissions_missing_in_db: comparison.missing_in_db.length,
      permissions_missing_in_registry: comparison.missing_in_registry.length,
      missing_in_db: comparison.missing_in_db.map((m) => m.permission_key),
      missing_in_registry: comparison.missing_in_registry.map((m) => m.permission_key),
    };
  } catch (err: any) {
    const completed_at = new Date().toISOString();
    if (syncId) {
      await db
        .from(SYNC_TABLE)
        .update({
          sync_status: 'FAILED',
          sync_completed_at: completed_at,
          errors: [{ message: err?.message ?? String(err) }],
        })
        .eq('id', syncId);
    }
    await safeAudit('PERMISSION_REGISTRY_SYNC_FAILED', syncId ?? 'sync', null, {
      message: err?.message ?? String(err),
    });
    return {
      sync_id: syncId,
      started_at,
      completed_at,
      status: 'FAILED',
      permissions_found: ALL_PERMISSION_DEFINITIONS.length,
      permissions_created: 0,
      permissions_updated: 0,
      permissions_missing_in_db: 0,
      permissions_missing_in_registry: 0,
      missing_in_db: [],
      missing_in_registry: [],
      errors: [err?.message ?? String(err)],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Compatibility read helpers over existing RBAC tables                */
/* ------------------------------------------------------------------ */

export async function getAppModules() {
  const { data, error } = await db.from('core_app_modules_v').select('*');
  if (error) throw error;
  return data ?? [];
}
export async function getModuleActions() {
  const { data, error } = await db.from('core_module_actions_v').select('*');
  if (error) throw error;
  return data ?? [];
}
export async function getRoles() {
  const { data, error } = await db.from('roles').select('*').order('role_name');
  if (error) throw error;
  return data ?? [];
}
export async function getRolePermissions(roleId?: string) {
  let q = db.from('core_role_permissions_v').select('*');
  if (roleId) q = q.eq('role_id', roleId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export async function getUserRoles(userId?: string) {
  let q = db.from('core_user_roles_v').select('*');
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * NOTE: existing role_permissions uses module_id + action_id, not permission_key.
 * These helpers are placeholders for the future mapping and are intentionally
 * no-ops so we do not break the current RBAC data model in this epic.
 */
export async function grantRolePermission(_roleId: string, _permissionKey: string): Promise<void> {
  // TODO(Epic 6): resolve permission_key → module_id/action_id via
  // core_permission_registry ↔ module_actions mapping.
  return;
}
export async function revokeRolePermission(_roleId: string, _permissionKey: string): Promise<void> {
  // TODO(Epic 6): see grantRolePermission.
  return;
}

/* ------------------------------------------------------------------ */

async function safeAudit(action: string, id: string, before: unknown, after: unknown) {
  try {
    await logAudit({
      action,
      module: 'CORE_ADMIN',
      entity_type: 'core_permission_registry',
      entity_id: id,
      before_value: (before ?? undefined) as any,
      after_value: (after ?? undefined) as any,
    });
  } catch {
    // best effort
  }
}
