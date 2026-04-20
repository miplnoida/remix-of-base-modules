/**
 * Lightweight chainable mock for `@/integrations/supabase/client`.
 * Returns whatever the test registers per (table, operation) pair.
 *
 * Usage:
 *   registerTable('ce_inspections', { selectMaybeSingle: { id: 'i1', ... } });
 *   registerTable('ce_violations', { insertSingle: { id: 'v1', violation_number: 'V-1' } });
 */

type Op =
  | 'selectMaybeSingle'
  | 'selectSingle'
  | 'selectList'
  | 'insertSingle'
  | 'insertList'
  | 'update'
  | 'delete';

interface TableMock {
  selectMaybeSingle?: any;
  selectSingle?: any;
  selectList?: any[];
  insertSingle?: any;
  insertList?: any[];
  update?: any;
  delete?: any;
  // Optional spies — populated by the harness on every call
  inserts?: any[];
  updates?: any[];
}

const registry = new Map<string, TableMock>();
const calls: Array<{ table: string; op: Op; args?: any }> = [];

export function resetSupabaseMock() {
  registry.clear();
  calls.length = 0;
}

export function registerTable(name: string, mock: TableMock) {
  const existing = registry.get(name) ?? {};
  registry.set(name, { ...existing, ...mock, inserts: existing.inserts ?? [], updates: existing.updates ?? [] });
}

export function getCalls() {
  return calls.slice();
}

export function getInserts(table: string) {
  return registry.get(table)?.inserts ?? [];
}

export function getUpdates(table: string) {
  return registry.get(table)?.updates ?? [];
}

function createBuilder(table: string, mode: 'select' | 'insert' | 'update' | 'delete', payload?: any) {
  const state: any = { table, mode, payload, returnList: false };

  const builder: any = {
    select(_cols?: string) {
      state.returnList = true;
      return builder;
    },
    eq(_col: string, _val: any) { return builder; },
    in(_col: string, _vals: any[]) { return builder; },
    is(_col: string, _val: any) { return builder; },
    or(_expr: string) { return builder; },
    order(_col: string, _opts?: any) { return builder; },
    limit(_n: number) { return builder; },
    single() {
      const m = registry.get(table) ?? {};
      const data =
        mode === 'insert' ? (m.insertSingle ?? null) :
        mode === 'update' ? (m.update ?? null) :
        (m.selectSingle ?? null);
      return Promise.resolve({ data, error: null });
    },
    maybeSingle() {
      const m = registry.get(table) ?? {};
      const data =
        mode === 'insert' ? (m.insertSingle ?? null) :
        (m.selectMaybeSingle ?? null);
      return Promise.resolve({ data, error: null });
    },
    then(onFulfilled: any, onRejected?: any) {
      const m = registry.get(table) ?? {};
      let data: any;
      if (mode === 'insert') data = m.insertList ?? m.insertSingle ?? null;
      else if (mode === 'update') data = m.update ?? null;
      else if (mode === 'delete') data = m.delete ?? null;
      else data = m.selectList ?? null;
      return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

export const supabase = {
  from(table: string) {
    return {
      select(cols?: string) {
        calls.push({ table, op: 'selectList', args: { cols } });
        return createBuilder(table, 'select');
      },
      insert(payload: any) {
        calls.push({ table, op: 'insertSingle', args: payload });
        const m = registry.get(table) ?? {};
        m.inserts = m.inserts ?? [];
        m.inserts.push(payload);
        registry.set(table, m);
        return createBuilder(table, 'insert', payload);
      },
      update(payload: any) {
        calls.push({ table, op: 'update', args: payload });
        const m = registry.get(table) ?? {};
        m.updates = m.updates ?? [];
        m.updates.push(payload);
        registry.set(table, m);
        return createBuilder(table, 'update', payload);
      },
      delete() {
        calls.push({ table, op: 'delete' });
        return createBuilder(table, 'delete');
      },
    };
  },
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'u-1', email: 'tester@test.local' } }, error: null }),
  },
  storage: {
    from() {
      return {
        upload: () => Promise.resolve({ data: { path: 'mock/path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://mock/file' } }),
      };
    },
  },
};
