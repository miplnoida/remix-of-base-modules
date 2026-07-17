import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  modules: [] as Row[],
  actions: [] as Row[],
  calls: [] as Array<{ table: string; inColumn: string | null; inValues: unknown[]; from: number; to: number }>,
}));

class SelectQuery implements PromiseLike<{ data: Row[]; error: null; count: number }> {
  private inColumn: string | null = null;
  private inValues: unknown[] = [];
  constructor(private readonly table: 'app_modules' | 'module_actions') {}
  in(column: string, values: unknown[]) {
    this.inColumn = column;
    this.inValues = values;
    return this;
  }
  range(from: number, to: number) {
    const source = this.table === 'app_modules' ? state.modules : state.actions;
    const filtered = this.inColumn
      ? source.filter((row) => this.inValues.includes(row[this.inColumn!]))
      : source;
    state.calls.push({ table: this.table, inColumn: this.inColumn, inValues: [...this.inValues], from, to });
    return Promise.resolve({ data: filtered.slice(from, to + 1), error: null, count: filtered.length });
  }
  then<TResult1 = { data: Row[]; error: null; count: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.range(0, 999).then(onfulfilled, onrejected);
  }
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: 'app_modules' | 'module_actions') => ({
      select: () => new SelectQuery(table),
    }),
  },
}));

vi.mock('@/contexts/SupabaseAuthContext', () => ({ useSupabaseAuth: () => ({}) }));
vi.mock('@/hooks/useAdminStatus', () => ({ useAdminStatus: () => ({}) }));
vi.mock('@/lib/permissions/fetchAllUserPermissions', () => ({ fetchAllUserPermissions: vi.fn() }));

import {
  EXPECTED_AWARD360_PROJECT_REF,
  fetchAllPages,
  fetchRegistrySnapshot,
  getSupabaseProjectRef,
} from '@/pages/bn/awards/award-360/useAwardPermissions';
import { AWARD_360_CAPABILITY_REGISTRY, resolveAward360Capabilities } from '@/pages/bn/awards/award-360/award360Capabilities';

const moduleRow = (id: string, name: string): Row => ({
  id,
  name,
  is_enabled: true,
  routes_enabled: true,
  actions_enabled: true,
  show_in_menu: true,
  rollout_state: 'active',
  internal_only: false,
});

describe('BN-AWARD360-B3-C3 · filtered paged registry snapshot', () => {
  beforeEach(() => {
    state.calls.length = 0;
    const names = Array.from(new Set(Object.values(AWARD_360_CAPABILITY_REGISTRY)
      .map((binding) => binding.moduleName)
      .filter((name): name is string => Boolean(name))));
    state.modules = [
      ...names.map((name, index) => moduleRow(`required-${index}`, name)),
      ...Array.from({ length: 1_100 }, (_, index) => moduleRow(`global-${index}`, `unrelated_${index}`)),
    ];
    const awardModule = state.modules.find((row) => row.name === 'bn_awards_list')!;
    state.actions = [
      ...Array.from({ length: 1_200 }, (_, index) => ({ module_id: `global-${index}`, action_name: 'view', is_enabled: true })),
      { module_id: awardModule.id, action_name: 'view', is_enabled: true },
    ];
  });

  it('resolves bn_awards_list.view even when the global registry contains more than 1,000 actions', async () => {
    const snapshot = await fetchRegistrySnapshot();
    expect(snapshot.actionsByModule.get('bn_awards_list')?.has('view')).toBe(true);
    expect(snapshot.diagnostics?.awardView).toMatchObject({ actionFound: true, actionEnabled: true });
  });

  it('queries only modules referenced by the capability registry', async () => {
    await fetchRegistrySnapshot();
    const call = state.calls.find((entry) => entry.table === 'app_modules')!;
    expect(call.inColumn).toBe('name');
    expect(call.inValues).toContain('bn_awards_list');
    expect(call.inValues).not.toContain('unrelated_1');
  });

  it('restricts action loading to resolved required module IDs', async () => {
    await fetchRegistrySnapshot();
    const call = state.calls.find((entry) => entry.table === 'module_actions')!;
    expect(call.inColumn).toBe('module_id');
    expect(call.inValues).toContain(state.modules.find((row) => row.name === 'bn_awards_list')!.id);
    expect(call.inValues).not.toContain('global-1');
  });

  it('combines pages and finds a required action on page two', async () => {
    const awardModule = state.modules.find((row) => row.name === 'bn_awards_list')!;
    state.actions = [
      ...Array.from({ length: 500 }, (_, index) => ({ module_id: awardModule.id, action_name: `extra_${index}`, is_enabled: true })),
      { module_id: awardModule.id, action_name: 'view', is_enabled: true },
    ];
    const snapshot = await fetchRegistrySnapshot();
    expect(state.calls.filter((entry) => entry.table === 'module_actions').map((entry) => entry.from)).toEqual([0, 500]);
    expect(snapshot.actionsByModule.get('bn_awards_list')?.has('view')).toBe(true);
  });

  it('does not silently accept a truncated first page', async () => {
    let page = 0;
    await expect(fetchAllPages<Row>(() => {
      page += 1;
      return Promise.resolve({
        data: page === 1 ? Array.from({ length: 500 }, () => ({})) : [],
        error: null,
        count: 700,
      });
    })).rejects.toThrow(/truncated/i);
    expect(page).toBe(2);
  });

  it('deduplicates duplicate actions across pages', async () => {
    const awardModule = state.modules.find((row) => row.name === 'bn_awards_list')!;
    state.actions = [
      ...Array.from({ length: 500 }, () => ({ module_id: awardModule.id, action_name: 'view', is_enabled: true })),
      { module_id: awardModule.id, action_name: 'view', is_enabled: true },
    ];
    const snapshot = await fetchRegistrySnapshot();
    expect(Array.from(snapshot.actionsByModule.get('bn_awards_list') ?? [])).toEqual(['view']);
  });

  it('keeps missing and disabled actions fail-closed', async () => {
    const awardModule = state.modules.find((row) => row.name === 'bn_awards_list')!;
    state.actions = [];
    let snapshot = await fetchRegistrySnapshot();
    expect(resolveAward360Capabilities({ registry: snapshot, userPermissions: [], isAdmin: true }).AWARD_VIEW.effectiveAccess).toBe(false);
    state.actions = [{ module_id: awardModule.id, action_name: 'view', is_enabled: false }];
    snapshot = await fetchRegistrySnapshot();
    expect(resolveAward360Capabilities({ registry: snapshot, userPermissions: [], isAdmin: true }).AWARD_VIEW.reason).toMatch(/Action disabled/);
  });

  it('exposes only the safe expected browser project reference', () => {
    expect(getSupabaseProjectRef(`https://${EXPECTED_AWARD360_PROJECT_REF}.example.test`)).toBe(EXPECTED_AWARD360_PROJECT_REF);
    expect(JSON.stringify({ projectRef: EXPECTED_AWARD360_PROJECT_REF })).not.toMatch(/key|token|jwt|eyJ/i);
  });
});