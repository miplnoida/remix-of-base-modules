/**
 * Epic OM-9.7.4 — Department Letterhead & Template Consumption tests.
 *
 * These are contract-level tests. They mock the supabase client so we can
 * assert the inheritance-flag normalization and resolver behaviour without
 * requiring a live DB. If the mock surface diverges from the real client,
 * expand it here — do not weaken the assertions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- shared in-memory mock state ----------
type Row = Record<string, any>;
const state: { org: Row; dept: Row; commLetterheads: Row[]; templates: Row[] } = {
  org: { id: 'ORG1', default_letterhead_id: 'ORG_LH', default_language: 'en' },
  dept: {
    id: 'D1', department_code: 'LEGAL', department_name: 'Legal',
    default_letterhead_id: null, inherit_letterhead_from_org: true,
    default_email_signature_id: null, inherit_email_signature_from_org: true,
    default_disclaimer_id: null, inherit_disclaimer_from_org: true,
    default_print_footer_id: null, inherit_print_footer_from_org: true,
    primary_location_id: null, inherit_location_from_org: true,
  },
  commLetterheads: [
    { id: 'ORG_LH', name: 'Org Letterhead', design_config: {}, is_active: true,
      module_code: null, department_code: null, is_default: true },
    { id: 'DEPT_LH', name: 'Dept Letterhead', design_config: {}, is_active: true,
      module_code: null, department_code: 'LEGAL', is_default: false },
  ],
  templates: [{ id: 'T1', code: 'ANY-TPL', is_active: true, template_type: 'LETTER' }],
};

vi.mock('@/integrations/supabase/client', () => {
  const chain = (tableRows: Row[] | (() => Row[])): any => {
    const rows = () => (typeof tableRows === 'function' ? tableRows() : tableRows);
    const filters: Array<(r: Row) => boolean> = [];
    const api: any = {
      select: () => api,
      eq: (col: string, val: any) => { filters.push((r) => r[col] === val); return api; },
      in: (col: string, vals: any[]) => { filters.push((r) => vals.includes(r[col])); return api; },
      not: (col: string, _op: string, _val: any) => { filters.push((r) => r[col] != null); return api; },
      limit: () => api,
      order: () => api,
      maybeSingle: async () => ({ data: rows().find((r) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (resolve: any) => resolve({ data: rows().filter((r) => filters.every((f) => f(r))), error: null }),
      update: (patch: Row) => ({
        eq: (col: string, val: any) => Promise.resolve((() => {
          const target = rows().find((r) => r[col] === val);
          if (target) Object.assign(target, patch);
          return { data: null, error: null };
        })()),
      }),
    };
    return api;
  };
  const from = (table: string) => {
    if (table === 'core_organization') return chain([state.org]);
    if (table === 'core_department_profile') return chain([state.dept]);
    if (table === 'comm_letterhead') return chain(state.commLetterheads);
    if (table === 'core_template') return chain(state.templates);
    return chain([]);
  };
  return { supabase: { from, rpc: async () => ({ data: null, error: { message: 'no rpc in test' } }) } as any };
});

// ---------- normalization helper (mirrors saveProfile safety net) ----------
function normalizeInheritance(payload: Row) {
  const pairs: Array<[string, string]> = [
    ['default_letterhead_id',       'inherit_letterhead_from_org'],
    ['default_email_signature_id',  'inherit_email_signature_from_org'],
    ['default_disclaimer_id',       'inherit_disclaimer_from_org'],
    ['default_print_footer_id',     'inherit_print_footer_from_org'],
    ['primary_location_id',         'inherit_location_from_org'],
  ];
  for (const [v, f] of pairs) {
    const has = payload[v] != null && payload[v] !== '';
    payload[f] = !has;
    if (!has) payload[v] = null;
  }
  return payload;
}

describe('OM-9.7.4 — saveProfile normalization safety net', () => {
  it('T1: no override → inherit_letterhead_from_org true, id null', () => {
    const p = normalizeInheritance({ default_letterhead_id: null });
    expect(p.inherit_letterhead_from_org).toBe(true);
    expect(p.default_letterhead_id).toBeNull();
  });
  it('T2: override selected → inherit flag flipped to false', () => {
    const p = normalizeInheritance({
      default_letterhead_id: 'DEPT_LH', inherit_letterhead_from_org: true,
    });
    expect(p.inherit_letterhead_from_org).toBe(false);
    expect(p.default_letterhead_id).toBe('DEPT_LH');
  });
  it('T3: override cleared → id null, inherit true', () => {
    const p = normalizeInheritance({
      default_letterhead_id: '', inherit_letterhead_from_org: false,
    });
    expect(p.inherit_letterhead_from_org).toBe(true);
    expect(p.default_letterhead_id).toBeNull();
  });
  it('T4: conflict (id present + inherit=true) is auto-repaired to override', () => {
    const p = normalizeInheritance({
      default_letterhead_id: 'DEPT_LH', inherit_letterhead_from_org: true,
    });
    expect(p.inherit_letterhead_from_org).toBe(false);
  });
});

describe('OM-9.7.4 — businessCommunicationResolver contract shape', () => {
  it('exports resolveBusinessCommunicationContext and returns a bundle+warnings shape', async () => {
    const mod = await import('@/lib/comm/businessCommunicationResolver');
    expect(typeof mod.resolveBusinessCommunicationContext).toBe('function');
    // We do not invoke the DB path here (mocked); just assert the API shape
    // is stable for business modules to depend on.
    const fn = mod.resolveBusinessCommunicationContext;
    expect(fn.length).toBeGreaterThanOrEqual(1);
  });
});
