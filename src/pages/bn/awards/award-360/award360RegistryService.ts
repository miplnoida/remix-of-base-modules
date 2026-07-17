/**
 * Award 360 registry service — BN-AWARD360-B3-C3.
 *
 * Loads *only* the modules/actions referenced by `AWARD_360_CAPABILITY_REGISTRY`
 * using filtered, paged queries with an exact count. Rejects silently truncated
 * responses so the capability resolver never mistakes a broken snapshot for a
 * genuinely missing action.
 *
 * This module intentionally contains no React Query orchestration; the hook in
 * `useAwardPermissions.ts` remains the single consumer.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  AWARD_360_CAPABILITY_REGISTRY,
  type Award360ModuleRegistryState,
  type Award360RegistryDiagnostics,
  type RegistrySnapshot,
} from './award360Capabilities';

export const EXPECTED_AWARD360_PROJECT_REF = 'xynceskeiiisiefqlgxo';
const REGISTRY_PAGE_SIZE = 500;
const MAX_REGISTRY_PAGES = 100;

export function getSupabaseProjectRef(url = import.meta.env.VITE_SUPABASE_URL): string | null {
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
  count?: number | null;
}

/** Load every page and enforce that reported exact count matches what was collected. */
export async function fetchAllPages<T>(
  makeQuery: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = REGISTRY_PAGE_SIZE,
): Promise<T[]> {
  const { rows } = await fetchAllPagesWithCount<T>(makeQuery, pageSize);
  return rows;
}

export async function fetchAllPagesWithCount<T>(
  makeQuery: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = REGISTRY_PAGE_SIZE,
): Promise<{ rows: T[]; reportedCount: number | null }> {
  const rows: T[] = [];
  let exactCount: number | null = null;

  for (let page = 0; page < MAX_REGISTRY_PAGES; page += 1) {
    const from = page * pageSize;
    const result = await makeQuery(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const pageRows = result.data ?? [];
    if (typeof result.count === 'number') exactCount = result.count;
    rows.push(...pageRows);

    if (pageRows.length < pageSize || (exactCount !== null && rows.length >= exactCount)) {
      if (exactCount !== null && rows.length < exactCount) {
        throw new Error(`Registry response truncated: expected ${exactCount} rows, received ${rows.length}.`);
      }
      return { rows, reportedCount: exactCount };
    }
  }

  throw new Error(`Registry pagination exceeded the ${MAX_REGISTRY_PAGES}-page safety limit.`);
}

interface RegistryModuleRow {
  id: string;
  name: string;
  is_enabled: boolean | null;
  routes_enabled: boolean | null;
  actions_enabled: boolean | null;
  show_in_menu: boolean | null;
  rollout_state: string | null;
  internal_only: boolean | null;
}

interface RegistryActionRow {
  module_id: string;
  action_name: string;
  is_enabled: boolean | null;
}

export function getRequiredModuleNames(): string[] {
  return Array.from(new Set(
    Object.values(AWARD_360_CAPABILITY_REGISTRY)
      .filter((binding) => !binding.denyForAll)
      .map((binding) => binding.moduleName)
      .filter((name): name is string => Boolean(name)),
  ));
}

export async function fetchRegistrySnapshot(): Promise<RegistrySnapshot> {
  const requiredModuleNames = getRequiredModuleNames();

  const { rows: modules, reportedCount: reportedModuleCount } = await fetchAllPagesWithCount<RegistryModuleRow>((from, to) =>
    supabase
      .from('app_modules')
      .select('id, name, is_enabled, routes_enabled, actions_enabled, show_in_menu, rollout_state, internal_only', { count: 'exact' })
      .in('name', requiredModuleNames)
      .range(from, to) as unknown as PromiseLike<PageResult<RegistryModuleRow>>,
  );

  // Deduplicate modules by id (defensive against duplicate pages).
  const dedupModules = Array.from(new Map(modules.filter((m) => m.id).map((m) => [m.id, m])).values());
  const moduleIds = dedupModules.map((module) => module.id);

  let actions: RegistryActionRow[] = [];
  let reportedActionCount: number | null = null;
  if (moduleIds.length) {
    const result = await fetchAllPagesWithCount<RegistryActionRow>((from, to) =>
      supabase
        .from('module_actions')
        .select('module_id, action_name, is_enabled', { count: 'exact' })
        .in('module_id', moduleIds)
        .range(from, to) as unknown as PromiseLike<PageResult<RegistryActionRow>>,
    );
    actions = result.rows;
    reportedActionCount = result.reportedCount;
  }

  const moduleIdToName = new Map<string, string>();
  const moduleNames = new Set<string>();
  const moduleStates = new Map<string, Award360ModuleRegistryState>();
  for (const m of dedupModules) {
    if (!m.id || !m.name) continue;
    moduleIdToName.set(m.id, m.name);
    moduleNames.add(m.name);
    moduleStates.set(m.name, {
      moduleName: m.name,
      moduleExists: true,
      moduleEnabled: m.is_enabled !== false,
      routesEnabled: m.routes_enabled !== false,
      actionsEnabled: m.actions_enabled === true,
      showInMenu: m.show_in_menu !== false,
      rolloutState: m.rollout_state ?? null,
      internalOnly: m.internal_only === true,
    });
  }

  const actionsByModule = new Map<string, Set<string>>();
  const actionEnabledByModule = new Map<string, Map<string, boolean>>();
  for (const a of actions) {
    const moduleName = moduleIdToName.get(a.module_id);
    if (!moduleName) continue;
    let set = actionsByModule.get(moduleName);
    if (!set) { set = new Set<string>(); actionsByModule.set(moduleName, set); }
    set.add(a.action_name);
    let em = actionEnabledByModule.get(moduleName);
    if (!em) { em = new Map<string, boolean>(); actionEnabledByModule.set(moduleName, em); }
    em.set(a.action_name, a.is_enabled !== false);
  }

  const missingModules = requiredModuleNames.filter((name) => !moduleNames.has(name));
  const missingActions = Array.from(new Set(
    Object.values(AWARD_360_CAPABILITY_REGISTRY)
      .filter((binding) => !binding.denyForAll && binding.moduleName && binding.action)
      .filter((binding) => !actionsByModule.get(binding.moduleName!)?.has(binding.action!))
      .map((binding) => `${binding.moduleName}.${binding.action}`),
  )).sort();
  const actionNamesByModule = Object.fromEntries(
    requiredModuleNames.map((name) => [name, Array.from(actionsByModule.get(name) ?? []).sort()]),
  );
  const awardViewActions = actionsByModule.get('bn_awards_list');
  const appearsTruncated =
    (reportedModuleCount !== null && dedupModules.length < reportedModuleCount) ||
    (reportedActionCount !== null && actions.length < reportedActionCount);

  const diagnostics: Award360RegistryDiagnostics = {
    projectRef: getSupabaseProjectRef(),
    fetchedAt: new Date().toISOString(),
    requiredModuleCount: requiredModuleNames.length,
    returnedModuleCount: dedupModules.length,
    returnedActionCount: actions.length,
    reportedModuleCount,
    reportedActionCount,
    missingModules,
    missingActions,
    actionNamesByModule,
    awardView: {
      module: 'bn_awards_list',
      action: 'view',
      moduleFound: moduleNames.has('bn_awards_list'),
      actionFound: awardViewActions?.has('view') ?? false,
      actionEnabled: actionEnabledByModule.get('bn_awards_list')?.get('view') ?? false,
    },
    appearsTruncated,
    responseTruncated: appearsTruncated,
  };
  return { modules: moduleNames, actionsByModule, moduleStates, actionEnabledByModule, diagnostics };
}
