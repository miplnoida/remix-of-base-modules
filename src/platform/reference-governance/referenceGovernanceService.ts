/**
 * Epic 4 — Reference Data Consolidation service layer.
 *
 * CRUD for the four new governance tables plus helpers that surface
 * legacy value mappings and health warnings by cross-referencing
 * core_legacy_value_map, core_table_registry, core_legacy_table_map and
 * core_admin_route_registry.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import type {
  HealthIssue,
  ReferenceChangePolicy,
  ReferenceChangePolicyForm,
  ReferenceConsumerMap,
  ReferenceConsumerMapForm,
  ReferenceDependencyMap,
  ReferenceDependencyMapForm,
  ReferenceSourceMap,
  ReferenceSourceMapForm,
} from './referenceGovernanceTypes';

const SRC = 'core_reference_source_map';
const CON = 'core_reference_consumer_map';
const DEP = 'core_reference_dependency_map';
const POL = 'core_reference_change_policy';
const VAL = 'core_legacy_value_map';
const REG = 'core_table_registry';
const LTM = 'core_legacy_table_map';
const ROUTE = 'core_admin_route_registry';

const db = supabase as any;

async function audit(action: string, entity: string, id: string, before: unknown, after: unknown) {
  try {
    await logAudit({
      action,
      module: 'CORE_ADMIN',
      entity_type: entity,
      entity_id: id,
      before_value: (before ?? undefined) as any,
      after_value: (after ?? undefined) as any,
    });
  } catch { /* best-effort */ }
}

/* ------------ Sources ------------ */
export async function listSources(): Promise<ReferenceSourceMap[]> {
  const { data, error } = await db.from(SRC).select('*').order('reference_group_code');
  if (error) throw error;
  return (data ?? []) as ReferenceSourceMap[];
}

export async function createSource(payload: ReferenceSourceMapForm): Promise<ReferenceSourceMap> {
  const { data, error } = await db.from(SRC).insert(payload).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_SOURCE_CREATED', SRC, data.id, null, data);
  return data as ReferenceSourceMap;
}

export async function updateSource(id: string, payload: Partial<ReferenceSourceMapForm>): Promise<ReferenceSourceMap> {
  const { data: before } = await db.from(SRC).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(SRC).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_SOURCE_UPDATED', SRC, id, before, data);
  return data as ReferenceSourceMap;
}

export async function setSourceActive(id: string, active: boolean): Promise<ReferenceSourceMap> {
  const { data, error } = await db.from(SRC).update({ is_active: active }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(active ? 'REFERENCE_SOURCE_REACTIVATED' : 'REFERENCE_SOURCE_DEACTIVATED', SRC, id, null, data);
  return data as ReferenceSourceMap;
}

/* ------------ Consumers ------------ */
export async function listConsumers(): Promise<ReferenceConsumerMap[]> {
  const { data, error } = await db.from(CON).select('*').order('reference_group_code');
  if (error) throw error;
  return (data ?? []) as ReferenceConsumerMap[];
}
export async function createConsumer(payload: ReferenceConsumerMapForm): Promise<ReferenceConsumerMap> {
  const { data, error } = await db.from(CON).insert(payload).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_CONSUMER_CREATED', CON, data.id, null, data);
  return data as ReferenceConsumerMap;
}
export async function updateConsumer(id: string, payload: Partial<ReferenceConsumerMapForm>): Promise<ReferenceConsumerMap> {
  const { data: before } = await db.from(CON).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(CON).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_CONSUMER_UPDATED', CON, id, before, data);
  return data as ReferenceConsumerMap;
}
export async function setConsumerActive(id: string, active: boolean): Promise<ReferenceConsumerMap> {
  const { data, error } = await db.from(CON).update({ is_active: active }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(active ? 'REFERENCE_CONSUMER_REACTIVATED' : 'REFERENCE_CONSUMER_DEACTIVATED', CON, id, null, data);
  return data as ReferenceConsumerMap;
}

/* ------------ Dependencies ------------ */
export async function listDependencies(): Promise<ReferenceDependencyMap[]> {
  const { data, error } = await db.from(DEP).select('*').order('source_reference_group_code');
  if (error) throw error;
  return (data ?? []) as ReferenceDependencyMap[];
}
export async function createDependency(payload: ReferenceDependencyMapForm): Promise<ReferenceDependencyMap> {
  const { data, error } = await db.from(DEP).insert(payload).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_DEPENDENCY_CREATED', DEP, data.id, null, data);
  return data as ReferenceDependencyMap;
}
export async function updateDependency(id: string, payload: Partial<ReferenceDependencyMapForm>): Promise<ReferenceDependencyMap> {
  const { data: before } = await db.from(DEP).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(DEP).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit('REFERENCE_DEPENDENCY_UPDATED', DEP, id, before, data);
  return data as ReferenceDependencyMap;
}
export async function setDependencyActive(id: string, active: boolean): Promise<ReferenceDependencyMap> {
  const { data, error } = await db.from(DEP).update({ is_active: active }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(active ? 'REFERENCE_DEPENDENCY_REACTIVATED' : 'REFERENCE_DEPENDENCY_DEACTIVATED', DEP, id, null, data);
  return data as ReferenceDependencyMap;
}

/* ------------ Change policies ------------ */
export async function listPolicies(): Promise<ReferenceChangePolicy[]> {
  const { data, error } = await db.from(POL).select('*').order('reference_group_code');
  if (error) throw error;
  return (data ?? []) as ReferenceChangePolicy[];
}
export async function upsertPolicy(payload: ReferenceChangePolicyForm): Promise<ReferenceChangePolicy> {
  const { data, error } = await db.from(POL)
    .upsert(payload, { onConflict: 'reference_group_code' })
    .select('*').single();
  if (error) throw error;
  await audit('REFERENCE_POLICY_UPDATED', POL, data.id, null, data);
  return data as ReferenceChangePolicy;
}
export async function setPolicyActive(id: string, active: boolean): Promise<ReferenceChangePolicy> {
  const { data, error } = await db.from(POL).update({ is_active: active }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(active ? 'REFERENCE_POLICY_REACTIVATED' : 'REFERENCE_POLICY_DEACTIVATED', POL, id, null, data);
  return data as ReferenceChangePolicy;
}

/* ------------ Cross-registry helpers ------------ */
export async function listTableRegistry(): Promise<Array<{ id: string; table_name: string; is_legacy_table: boolean }>> {
  const { data, error } = await db.from(REG).select('id, table_name, is_legacy_table').order('table_name');
  if (error) throw error;
  return (data ?? []) as any;
}
export async function listLegacyTableMaps(): Promise<Array<{ id: string; legacy_table_name: string; modern_entity_name: string | null }>> {
  const { data, error } = await db.from(LTM).select('id, legacy_table_name, modern_entity_name').order('legacy_table_name');
  if (error) throw error;
  return (data ?? []) as any;
}
export async function listAdminRoutes(): Promise<Array<{ route_path: string; canonical_status: string; is_active: boolean }>> {
  const { data, error } = await db.from(ROUTE).select('route_path, canonical_status, is_active');
  if (error) throw error;
  return (data ?? []) as any;
}

/* ------------ Legacy value mapping (read-only surface) ------------ */
export interface LegacyValueRow {
  id: string;
  reference_group_code: string | null;
  legacy_table_name: string | null;
  legacy_column_name: string | null;
  legacy_code: string | null;
  legacy_label: string | null;
  modern_code: string | null;
  modern_label: string | null;
  mapping_status: string | null;
  is_active: boolean;
}

export async function listLegacyValueMappings(): Promise<LegacyValueRow[]> {
  const { data, error } = await db.from(VAL).select('*').order('reference_group_code');
  if (error) throw error;
  return (data ?? []) as LegacyValueRow[];
}

/* ------------ Health analysis ------------ */
export async function computeHealth(): Promise<HealthIssue[]> {
  const [sources, consumers, deps, policies, registry, legacyMaps, routes, values] = await Promise.all([
    listSources(), listConsumers(), listDependencies(), listPolicies(),
    listTableRegistry(), listLegacyTableMaps(), listAdminRoutes(), listLegacyValueMappings(),
  ]);

  const issues: HealthIssue[] = [];
  const registryNames = new Set(registry.map((r) => r.table_name));
  const legacyNames = new Set(legacyMaps.map((l) => l.legacy_table_name));
  const routeMap = new Map(routes.map((r) => [r.route_path, r]));

  const groupsWithSource = new Set(sources.map((s) => s.reference_group_code));
  const groupsWithConsumer = new Set(consumers.map((c) => c.reference_group_code));
  const groupsWithDep = new Set(deps.map((d) => d.source_reference_group_code));
  const groupsWithPolicy = new Set(policies.map((p) => p.reference_group_code));
  const groupsWithValues = new Set(values.map((v) => v.reference_group_code).filter(Boolean) as string[]);

  // Consumers referencing groups that have no source
  for (const c of consumers) {
    if (!groupsWithSource.has(c.reference_group_code)) {
      issues.push({
        severity: 'ERROR',
        code: 'NO_SOURCE',
        message: `Reference group "${c.reference_group_code}" is consumed but has no source mapping.`,
        reference_group_code: c.reference_group_code,
      });
    }
  }

  for (const s of sources) {
    if (!s.owner_module_code) {
      issues.push({ severity: 'WARNING', code: 'NO_OWNER',
        message: `Source for "${s.reference_group_code}" has no owner module.`,
        reference_group_code: s.reference_group_code });
    }
    if (s.source_type === 'LEGACY_TABLE') {
      if (s.legacy_table_name && !legacyNames.has(s.legacy_table_name)) {
        issues.push({ severity: 'ERROR', code: 'LEGACY_NOT_MAPPED',
          message: `Legacy-backed source "${s.reference_group_code}" references legacy table "${s.legacy_table_name}" which is not in core_legacy_table_map.`,
          reference_group_code: s.reference_group_code });
      }
    }
    if (s.source_table_name && !registryNames.has(s.source_table_name)) {
      issues.push({ severity: 'WARNING', code: 'TABLE_NOT_REGISTERED',
        message: `Source table "${s.source_table_name}" for group "${s.reference_group_code}" is not registered in core_table_registry.`,
        reference_group_code: s.reference_group_code });
    }
    if (s.admin_route) {
      const r = routeMap.get(s.admin_route);
      if (!r) {
        issues.push({ severity: 'WARNING', code: 'ROUTE_NOT_REGISTERED',
          message: `Admin route "${s.admin_route}" for group "${s.reference_group_code}" is not in core_admin_route_registry.`,
          reference_group_code: s.reference_group_code });
      } else if (!r.is_active) {
        issues.push({ severity: 'INFO', code: 'ROUTE_INACTIVE',
          message: `Admin route "${s.admin_route}" for group "${s.reference_group_code}" is inactive.`,
          reference_group_code: s.reference_group_code });
      }
    }
    if (groupsWithConsumer.has(s.reference_group_code) && !groupsWithPolicy.has(s.reference_group_code)) {
      issues.push({ severity: 'WARNING', code: 'NO_POLICY',
        message: `Group "${s.reference_group_code}" has consumers but no change policy.`,
        reference_group_code: s.reference_group_code });
    }
  }

  for (const d of deps) {
    if (!d.dependency_rule) {
      issues.push({ severity: 'INFO', code: 'NO_DEP_RULE',
        message: `Dependency "${d.source_reference_group_code}" -> "${d.depends_on_reference_group_code}" has no rule text.`,
        reference_group_code: d.source_reference_group_code });
    }
  }

  // High-impact groups that allow delete
  const highImpact = new Set(consumers.filter((c) => c.impact_level === 'HIGH' || c.impact_level === 'CRITICAL')
    .map((c) => c.reference_group_code));
  for (const p of policies) {
    if (p.allow_delete && highImpact.has(p.reference_group_code)) {
      issues.push({ severity: 'CRITICAL', code: 'DELETE_ON_HIGH_IMPACT',
        message: `High-impact group "${p.reference_group_code}" allows delete.`,
        reference_group_code: p.reference_group_code });
    }
  }

  // Legacy-backed source missing legacy value mapping
  for (const s of sources) {
    if (s.source_type === 'LEGACY_TABLE' && !groupsWithValues.has(s.reference_group_code)) {
      issues.push({ severity: 'INFO', code: 'NO_VALUE_MAPPING',
        message: `Legacy-backed group "${s.reference_group_code}" has no value mappings yet.`,
        reference_group_code: s.reference_group_code });
    }
  }

  // Deps referencing unknown groups
  for (const d of deps) {
    if (!groupsWithSource.has(d.depends_on_reference_group_code)) {
      issues.push({ severity: 'WARNING', code: 'DEP_TARGET_UNKNOWN',
        message: `Dependency target "${d.depends_on_reference_group_code}" has no source mapping.`,
        reference_group_code: d.source_reference_group_code });
    }
  }

  return issues;
}

export interface OverviewMetrics {
  totalGroups: number;
  legacyBackedGroups: number;
  coreBackedGroups: number;
  moduleBackedGroups: number;
  groupsWithConsumers: number;
  groupsWithDependencies: number;
  groupsMissingSource: number;
  groupsMissingOwner: number;
  groupsWithPolicy: number;
  highImpactGroups: number;
}

export async function computeOverview(): Promise<OverviewMetrics> {
  const [sources, consumers, deps, policies] = await Promise.all([
    listSources(), listConsumers(), listDependencies(), listPolicies(),
  ]);
  const groups = new Set([
    ...sources.map((s) => s.reference_group_code),
    ...consumers.map((c) => c.reference_group_code),
    ...deps.map((d) => d.source_reference_group_code),
  ]);
  const withConsumer = new Set(consumers.map((c) => c.reference_group_code));
  const withDep = new Set(deps.map((d) => d.source_reference_group_code));
  const withPolicy = new Set(policies.map((p) => p.reference_group_code));
  const highImpact = new Set(consumers
    .filter((c) => c.impact_level === 'HIGH' || c.impact_level === 'CRITICAL')
    .map((c) => c.reference_group_code));
  const withSource = new Set(sources.map((s) => s.reference_group_code));
  const missingOwner = new Set(sources.filter((s) => !s.owner_module_code).map((s) => s.reference_group_code));

  return {
    totalGroups: groups.size,
    legacyBackedGroups: new Set(sources.filter((s) => s.source_type === 'LEGACY_TABLE').map((s) => s.reference_group_code)).size,
    coreBackedGroups: new Set(sources.filter((s) => s.source_type === 'CORE_REFERENCE').map((s) => s.reference_group_code)).size,
    moduleBackedGroups: new Set(sources.filter((s) => s.source_type === 'MODULE_TABLE').map((s) => s.reference_group_code)).size,
    groupsWithConsumers: withConsumer.size,
    groupsWithDependencies: withDep.size,
    groupsMissingSource: Array.from(groups).filter((g) => !withSource.has(g)).length,
    groupsMissingOwner: missingOwner.size,
    groupsWithPolicy: withPolicy.size,
    highImpactGroups: highImpact.size,
  };
}
