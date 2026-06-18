/**
 * BN Template Token Registry
 * --------------------------
 * Phase 2 — Country Pack tokens + structured legal references.
 *
 * Resolves `{{group.field}}` tokens against a typed context bag. Groups:
 *   country, legal, product, rule, decision, claim, person, payment.
 *
 * Country & legal tokens are sourced from `bn_country` and `bn_legal_reference`
 * (Country Pack source of truth). Product/Rule/Decision `.legal_reference`
 * pull from the FK-resolved legal reference attached to the entity.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type TokenGroup =
  | 'country'
  | 'legal'
  | 'product'
  | 'rule'
  | 'decision'
  | 'claim'
  | 'person'
  | 'payment';

export interface TokenDescriptor {
  /** Full token e.g. `country.name` (lower-case dot path). */
  key: string;
  group: TokenGroup;
  label: string;
  description?: string;
  /** Sample value shown in template preview when no context provided. */
  sample?: string;
}

export const TOKEN_REGISTRY: TokenDescriptor[] = [
  // ── Country (bn_country) ────────────────────────────────────────────
  { key: 'country.name', group: 'country', label: 'Country Name', sample: 'Saint Kitts and Nevis' },
  { key: 'country.code', group: 'country', label: 'ISO Country Code', sample: 'KN' },
  { key: 'country.currency', group: 'country', label: 'Currency Code', sample: 'XCD' },
  { key: 'country.currency_symbol', group: 'country', label: 'Currency Symbol', sample: '$' },
  { key: 'country.office_name', group: 'country', label: 'Office Name', sample: 'Social Security Board' },
  { key: 'country.office_address', group: 'country', label: 'Office Address', sample: 'Bay Road, Basseterre, St. Kitts' },
  { key: 'country.phone', group: 'country', label: 'Office Phone', sample: '+1 (869) 465-2535' },
  { key: 'country.email', group: 'country', label: 'Office Email', sample: 'info@socialsecurity.kn' },
  { key: 'country.website', group: 'country', label: 'Office Website', sample: 'www.socialsecurity.kn' },
  { key: 'country.logo', group: 'country', label: 'Letterhead Logo URL', sample: '' },

  // ── Legal reference (bn_legal_reference) ────────────────────────────
  { key: 'legal.reference.short', group: 'legal', label: 'Short Title', sample: 'Social Security Act s.12(2)' },
  { key: 'legal.reference.full', group: 'legal', label: 'Full Citation', sample: 'Social Security Act, Cap. 22.01, Section 12(2)' },
  { key: 'legal.act_name', group: 'legal', label: 'Act Name', sample: 'Social Security Act' },
  { key: 'legal.chapter', group: 'legal', label: 'Chapter', sample: '22.01' },
  { key: 'legal.section', group: 'legal', label: 'Section', sample: '12' },
  { key: 'legal.subsection', group: 'legal', label: 'Subsection', sample: '(2)' },
  { key: 'legal.regulation', group: 'legal', label: 'Regulation', sample: 'Reg. 8(1)' },

  // ── Resolved-by-FK convenience tokens ───────────────────────────────
  { key: 'product.legal_reference', group: 'product', label: 'Product Legal Reference', sample: 'Pensions Act s.4' },
  { key: 'rule.legal_reference', group: 'rule', label: 'Rule Legal Reference', sample: 'Reg. 12(a)' },
  { key: 'decision.legal_reference', group: 'decision', label: 'Decision Legal Reference', sample: 'Social Security Act s.18' },

  // ── Common entity tokens (sourced from caller-supplied context) ─────
  { key: 'product.name', group: 'product', label: 'Product Name', sample: 'Sickness Benefit' },
  { key: 'product.code', group: 'product', label: 'Product Code', sample: 'SKB' },
  { key: 'rule.code', group: 'rule', label: 'Rule Code', sample: 'ELIG_AGE_MIN' },
  { key: 'rule.name', group: 'rule', label: 'Rule Name', sample: 'Minimum Age Check' },
  { key: 'decision.outcome', group: 'decision', label: 'Decision Outcome', sample: 'APPROVED' },
  { key: 'decision.date', group: 'decision', label: 'Decision Date', sample: '2026-06-18' },
  { key: 'claim.number', group: 'claim', label: 'Claim Number', sample: 'CL-2026-000123' },
  { key: 'claim.status', group: 'claim', label: 'Claim Status', sample: 'AWARDED' },
  { key: 'person.full_name', group: 'person', label: 'Person Full Name', sample: 'John A. Citizen' },
  { key: 'person.ssn_masked', group: 'person', label: 'SSN (masked)', sample: '••••56' },
  { key: 'payment.amount', group: 'payment', label: 'Payment Amount', sample: '$1,234.56' },
  { key: 'payment.method', group: 'payment', label: 'Payment Method', sample: 'Bank Transfer' },
  { key: 'payment.date', group: 'payment', label: 'Payment Date', sample: '2026-06-25' },
];

export const TOKEN_GROUPS: { id: TokenGroup; label: string }[] = [
  { id: 'country', label: 'Country' },
  { id: 'legal', label: 'Legal Reference' },
  { id: 'product', label: 'Product' },
  { id: 'rule', label: 'Rule' },
  { id: 'decision', label: 'Decision' },
  { id: 'claim', label: 'Claim' },
  { id: 'person', label: 'Person' },
  { id: 'payment', label: 'Payment' },
];

const REGISTRY_KEYS = new Set(TOKEN_REGISTRY.map(t => t.key.toLowerCase()));

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function extractTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

/** Context bag — partial; missing entries resolve to '' and are reported. */
export interface TokenContext {
  country?: Record<string, any> | null;
  legal?: Record<string, any> | null;
  product?: Record<string, any> | null;
  rule?: Record<string, any> | null;
  decision?: Record<string, any> | null;
  claim?: Record<string, any> | null;
  person?: Record<string, any> | null;
  payment?: Record<string, any> | null;
}

export interface ResolveResult {
  output: string;
  used: string[];
  missing: string[];
  unknown: string[];
}

/** Resolve `{{group.field}}` against ctx. Dot path navigates into nested values. */
export function resolveTokens(template: string | null | undefined, ctx: TokenContext): ResolveResult {
  if (!template) return { output: '', used: [], missing: [], unknown: [] };
  const used: string[] = [];
  const missing: string[] = [];
  const unknown: string[] = [];

  const output = template.replace(TOKEN_RE, (_, raw: string) => {
    const key = raw.toLowerCase();
    used.push(key);
    if (!REGISTRY_KEYS.has(key)) {
      unknown.push(key);
      return `{{${raw}}}`;
    }
    const [group, ...path] = key.split('.');
    const root = (ctx as any)[group];
    if (!root) { missing.push(key); return ''; }
    let cur: any = root;
    for (const seg of path) {
      if (cur == null) break;
      cur = cur[seg];
    }
    if (cur == null || cur === '') { missing.push(key); return ''; }
    return String(cur);
  });

  return { output, used: [...new Set(used)], missing: [...new Set(missing)], unknown: [...new Set(unknown)] };
}

/** Build a Country token bag from a bn_country row. */
export function buildCountryContext(row: any): Record<string, any> {
  if (!row) return {};
  return {
    name: row.country_name,
    code: row.country_code,
    currency: row.currency_code,
    currency_symbol: row.currency_symbol ?? '',
    office_name: row.office_name ?? '',
    office_address: row.office_address ?? '',
    phone: row.office_phone ?? '',
    email: row.office_email ?? '',
    website: row.office_website ?? '',
    logo: row.letterhead_logo_url ?? '',
  };
}

/** Build a Legal token bag from a bn_legal_reference row, including
 *  `reference.short` and `reference.full` nested keys. */
export function buildLegalContext(row: any): Record<string, any> {
  if (!row) return {};
  return {
    reference: {
      short: row.short_title ?? '',
      full: row.full_reference_text ?? row.short_title ?? '',
    },
    act_name: row.act_name ?? '',
    chapter: row.chapter ?? '',
    section: row.section ?? '',
    subsection: row.subsection ?? '',
    regulation: row.regulation ?? '',
  };
}

/** Fetch country row by code and build its token context. */
export async function loadCountryContext(countryCode: string | null | undefined) {
  if (!countryCode) return null;
  const { data } = await db.from('bn_country').select('*').eq('country_code', countryCode).maybeSingle();
  return data ? buildCountryContext(data) : null;
}

/** Fetch legal ref by id and build its token context. */
export async function loadLegalContext(legalRefId: string | null | undefined) {
  if (!legalRefId) return null;
  const { data } = await db.from('bn_legal_reference').select('*').eq('id', legalRefId).maybeSingle();
  return data ? buildLegalContext(data) : null;
}

/** Sample context used by the template editor preview. */
export function sampleContext(): TokenContext {
  const ctx: TokenContext = {};
  for (const t of TOKEN_REGISTRY) {
    const [group, ...path] = t.key.split('.');
    const g = group as TokenGroup;
    ctx[g] = ctx[g] || {};
    let cur: any = ctx[g];
    for (let i = 0; i < path.length - 1; i++) {
      cur[path[i]] = cur[path[i]] || {};
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = t.sample ?? `[${t.label}]`;
  }
  return ctx;
}
