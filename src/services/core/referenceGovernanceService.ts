/**
 * referenceGovernanceService — Enterprise Reference Framework governance analytics.
 *
 * Epic 1.1.2 (governance layer). Read-only analytics over the existing
 * core_reference_category / core_reference_group / core_reference_value tables.
 *
 * This service NEVER writes and NEVER duplicates the reference framework;
 * it derives dashboard, health, consumer and dependency projections from
 * the same rows that coreReferenceDataService serves.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/* ---------- Types ---------- */

export interface GovernanceGroup {
  id: string;
  group_code: string;
  group_name: string;
  module_code: string | null;
  category_code: string | null;
  ownership_module_code: string | null;
  business_owner: string | null;
  technical_owner: string | null;
  steward: string | null;
  scope_default: string | null;
  version_strategy: string | null;
  lifecycle_status: string | null;
  is_active: boolean;
  is_system: boolean;
  is_platform_owned: boolean | null;
  is_org_overridable: boolean | null;
  supports_hierarchy: boolean | null;
  supports_i18n: boolean | null;
  supports_external_codes: boolean | null;
  description: string | null;
  documentation_url: string | null;
  value_count?: number;
  active_value_count?: number;
}

export interface GovernanceCategory {
  category_code: string;
  category_name: string;
  description: string | null;
  owner_module_code: string | null;
  sort_order: number;
  is_active: boolean;
  is_platform_category?: boolean;
  lifecycle_status?: string;
  group_count?: number;
}

export interface ReferenceHealthSummary {
  totalGroups: number;
  activeGroups: number;
  totalValues: number;
  activeValues: number;
  deprecatedValues: number;
  categoriesSeeded: number;
  emptyGroups: number;
  missingCategory: number;
  missingOwnership: number;
  missingBusinessOwner: number;
  missingTechnicalOwner: number;
  missingSteward: number;
  missingDocumentation: number;
  duplicateCandidates: number;
  hierarchyEnabled: number;
  i18nEnabled: number;
  externalCodeEnabled: number;
}

export interface ConsumerAnalysis {
  group: GovernanceGroup;
  currentConsumers: string[];       // modules that own values in this group
  potentialConsumers: string[];     // modules that share category but do not consume
  duplicateCandidates: string[];    // other group_codes with overlapping value labels
  migrationCandidates: string[];    // legacy tables that should migrate here
  retirementCandidate: boolean;     // empty + unused
}

/* ---------- Loaders ---------- */

export async function loadCategories(): Promise<GovernanceCategory[]> {
  const { data, error } = await db
    .from('core_reference_category')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  const cats: GovernanceCategory[] = data ?? [];
  const { data: counts } = await db
    .from('core_reference_group')
    .select('category_code');
  const tally = new Map<string, number>();
  (counts ?? []).forEach((r: any) => {
    const k = r.category_code ?? '(uncategorised)';
    tally.set(k, (tally.get(k) ?? 0) + 1);
  });
  return cats.map((c) => ({ ...c, group_count: tally.get(c.category_code) ?? 0 }));
}

export async function loadGroups(): Promise<GovernanceGroup[]> {
  const { data, error } = await db
    .from('core_reference_group')
    .select('*')
    .order('category_code')
    .order('group_code');
  if (error) throw error;
  const groups: GovernanceGroup[] = data ?? [];

  const { data: values } = await db
    .from('core_reference_value')
    .select('group_id, is_active, deleted_at');
  const counts = new Map<string, { total: number; active: number }>();
  (values ?? []).forEach((v: any) => {
    if (v.deleted_at) return;
    const c = counts.get(v.group_id) ?? { total: 0, active: 0 };
    c.total += 1;
    if (v.is_active) c.active += 1;
    counts.set(v.group_id, c);
  });
  return groups.map((g) => ({
    ...g,
    value_count: counts.get(g.id)?.total ?? 0,
    active_value_count: counts.get(g.id)?.active ?? 0,
  }));
}

/* ---------- Dashboard / Health ---------- */

export async function loadHealth(): Promise<ReferenceHealthSummary> {
  const [groups, categories, valuesRes] = await Promise.all([
    loadGroups(),
    loadCategories(),
    db.from('core_reference_value').select('id,is_active,deleted_at,status,value_label,group_id'),
  ]);
  const values: any[] = valuesRes.data ?? [];
  const activeValues = values.filter((v) => v.is_active && !v.deleted_at);
  const deprecated = values.filter((v) => v.status === 'DEPRECATED' || v.status === 'RETIRED');

  // Duplicate candidates: groups with any overlapping label (case-insensitive)
  const labelIndex = new Map<string, Set<string>>();
  values.forEach((v) => {
    if (!v.value_label) return;
    const key = String(v.value_label).trim().toLowerCase();
    const set = labelIndex.get(key) ?? new Set<string>();
    set.add(v.group_id);
    labelIndex.set(key, set);
  });
  const duplicateGroupIds = new Set<string>();
  labelIndex.forEach((set) => {
    if (set.size > 1) set.forEach((gid) => duplicateGroupIds.add(gid));
  });

  return {
    totalGroups: groups.length,
    activeGroups: groups.filter((g) => g.is_active).length,
    totalValues: values.length,
    activeValues: activeValues.length,
    deprecatedValues: deprecated.length,
    categoriesSeeded: categories.length,
    emptyGroups: groups.filter((g) => (g.value_count ?? 0) === 0).length,
    missingCategory: groups.filter((g) => !g.category_code).length,
    missingOwnership: groups.filter((g) => !g.ownership_module_code).length,
    missingBusinessOwner: groups.filter((g) => !g.business_owner).length,
    missingTechnicalOwner: groups.filter((g) => !g.technical_owner).length,
    missingSteward: groups.filter((g) => !g.steward).length,
    missingDocumentation: groups.filter((g) => !g.documentation_url).length,
    duplicateCandidates: duplicateGroupIds.size,
    hierarchyEnabled: groups.filter((g) => g.supports_hierarchy).length,
    i18nEnabled: groups.filter((g) => g.supports_i18n).length,
    externalCodeEnabled: groups.filter((g) => g.supports_external_codes).length,
  };
}

/* ---------- Consumer & Duplicate analysis ---------- */

export async function analyseConsumers(): Promise<ConsumerAnalysis[]> {
  const groups = await loadGroups();
  const { data: values } = await db
    .from('core_reference_value')
    .select('group_id, module_code, value_label, deleted_at');

  const modulesByGroup = new Map<string, Set<string>>();
  const labelIndex = new Map<string, Map<string, Set<string>>>(); // groupCode -> label -> otherGroupCodes
  const labelToGroups = new Map<string, Set<string>>(); // label -> groupIds

  (values ?? []).forEach((v: any) => {
    if (v.deleted_at) return;
    if (v.module_code) {
      const s = modulesByGroup.get(v.group_id) ?? new Set<string>();
      s.add(v.module_code);
      modulesByGroup.set(v.group_id, s);
    }
    if (v.value_label) {
      const key = String(v.value_label).trim().toLowerCase();
      const s = labelToGroups.get(key) ?? new Set<string>();
      s.add(v.group_id);
      labelToGroups.set(key, s);
    }
  });

  const groupsByCategory = new Map<string, string[]>();
  groups.forEach((g) => {
    const key = g.category_code ?? '(uncategorised)';
    const list = groupsByCategory.get(key) ?? [];
    list.push(g.module_code ?? 'UNKNOWN');
    groupsByCategory.set(key, list);
  });

  return groups.map((g) => {
    const current = Array.from(modulesByGroup.get(g.id) ?? []);
    const currentSet = new Set(current);
    const potential = (groupsByCategory.get(g.category_code ?? '(uncategorised)') ?? [])
      .filter((m) => m && !currentSet.has(m));

    // Duplicate candidates: other groups sharing >= 2 identical labels
    const overlapCounts = new Map<string, number>();
    (values ?? []).forEach((v: any) => {
      if (v.deleted_at) return;
      if (v.group_id === g.id) {
        const key = String(v.value_label ?? '').trim().toLowerCase();
        const others = labelToGroups.get(key);
        if (!others) return;
        others.forEach((otherGid) => {
          if (otherGid !== g.id) {
            overlapCounts.set(otherGid, (overlapCounts.get(otherGid) ?? 0) + 1);
          }
        });
      }
    });
    const duplicateIds = Array.from(overlapCounts.entries())
      .filter(([, c]) => c >= 2)
      .map(([gid]) => gid);
    const duplicateCandidates = groups
      .filter((x) => duplicateIds.includes(x.id))
      .map((x) => x.group_code);

    const migrationCandidates: string[] = [];
    if (g.group_code.startsWith('BN_')) migrationCandidates.push('legacy tb_* enums');
    if (g.category_code === 'GEOGRAPHY') migrationCandidates.push('tb_country, tb_district, tb_village');
    if (g.category_code === 'FINANCE') migrationCandidates.push('tb_bank_code, tb_currencies');

    return {
      group: g,
      currentConsumers: Array.from(new Set([...(g.module_code ? [g.module_code] : []), ...current])),
      potentialConsumers: Array.from(new Set(potential)),
      duplicateCandidates,
      migrationCandidates,
      retirementCandidate: (g.value_count ?? 0) === 0 && !g.is_system,
    };
  });
}

/* ---------- Dependencies ---------- */

export interface DependencyNode {
  category_code: string;
  category_name: string;
  groups: string[];
  modules: string[];
}

export async function loadDependencies(): Promise<DependencyNode[]> {
  const [cats, groups] = await Promise.all([loadCategories(), loadGroups()]);
  return cats.map((c) => {
    const gs = groups.filter((g) => g.category_code === c.category_code);
    return {
      category_code: c.category_code,
      category_name: c.category_name,
      groups: gs.map((g) => g.group_code),
      modules: Array.from(new Set(gs.map((g) => g.module_code ?? 'UNKNOWN'))),
    };
  });
}
