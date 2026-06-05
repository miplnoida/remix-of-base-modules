/**
 * BN Form Lookup Service
 *
 * Single entry point for "smart" form fields to pull authoritative data.
 * All access goes through platform adapters — no direct table queries here,
 * so the SmartBenefitFormRenderer stays portable across backends.
 *
 * Sources of truth:
 *   - personAdapter        → ip_master (person identity, address, status)
 *   - employerAdapter      → er_master (employer identity, status)
 *   - contributionAdapter  → ip_wages  (weeks / wages / averages)
 *   - personAdapter        → ip_depend (dependants)
 *   - claimService / bn_claim          (existing benefit claims)
 *   - historicalInquiryAdapter / cl_head (legacy claims)
 *   - bn_doc_requirement (via formDefinitionService) → required docs per product version + channel
 */

import {
  bnPersonAdapter,
  bnEmployerAdapter,
  bnContributionAdapter,
} from '@/services/bn/integration';
import type {
  PersonSummary,
  EmployerSummary,
  ContributionSummary,
  Dependant,
} from '@/services/bn/integration';
import { supabase } from '@/integrations/supabase/client';
import type { FormChannel } from './sectionCatalogue';

const db = supabase as any;

// ───────────────────────── Person ─────────────────────────

export interface PersonLookupResult {
  ssn: string;
  found: boolean;
  person?: PersonSummary;
  reason?: 'NOT_FOUND' | 'INVALID_SSN' | 'LOOKUP_ERROR';
  error?: string;
}

export async function lookupPersonBySSN(ssn: string): Promise<PersonLookupResult> {
  const cleaned = (ssn ?? '').toString().trim();
  if (!cleaned) return { ssn: cleaned, found: false, reason: 'INVALID_SSN' };
  try {
    const person = await bnPersonAdapter.lookupPerson(cleaned);
    if (!person) return { ssn: cleaned, found: false, reason: 'NOT_FOUND' };
    return { ssn: cleaned, found: true, person };
  } catch (e: any) {
    return { ssn: cleaned, found: false, reason: 'LOOKUP_ERROR', error: e?.message ?? String(e) };
  }
}

// ───────────────────────── Employer ─────────────────────────

export interface EmployerLookupResult {
  regNo: string;
  found: boolean;
  employer?: EmployerSummary;
  reason?: 'NOT_FOUND' | 'INVALID_REGNO' | 'LOOKUP_ERROR';
  error?: string;
}

export async function lookupEmployerByRegNo(regNo: string): Promise<EmployerLookupResult> {
  const cleaned = (regNo ?? '').toString().trim();
  if (!cleaned) return { regNo: cleaned, found: false, reason: 'INVALID_REGNO' };
  try {
    const employer = await bnEmployerAdapter.lookupEmployer(cleaned);
    if (!employer) return { regNo: cleaned, found: false, reason: 'NOT_FOUND' };
    return { regNo: cleaned, found: true, employer };
  } catch (e: any) {
    return { regNo: cleaned, found: false, reason: 'LOOKUP_ERROR', error: e?.message ?? String(e) };
  }
}

// ───────────────────────── Contributions ─────────────────────────

export interface ContributionWindowConfig {
  /** Window length in weeks, measured back from claim date. Default 52. */
  windowWeeks?: number;
}

export interface ContributionSummaryResult {
  ssn: string;
  claimDate: string;
  productVersionId?: string;
  windowStart: string;
  windowEnd: string;
  totalWeeks: number;
  paidWeeks: number;
  creditedWeeks: number;
  totalWages: number;
  averageWeeklyWage: number;
  raw?: ContributionSummary;
  loadedAt: string;
}

/**
 * Get a contribution summary for the SSN over a window ending at the claim date.
 * The window length comes from the product version configuration if available;
 * defaults to 52 weeks. Returns zeros if no contributions are recorded.
 */
export async function getContributionSummary(
  ssn: string,
  claimDate: string,
  productVersionId?: string,
  cfg: ContributionWindowConfig = {},
): Promise<ContributionSummaryResult> {
  const windowWeeks = cfg.windowWeeks ?? 52;
  const end = new Date(claimDate);
  const start = new Date(end);
  start.setDate(start.getDate() - windowWeeks * 7);
  const windowStart = start.toISOString().slice(0, 10);
  const windowEnd = end.toISOString().slice(0, 10);

  let raw: ContributionSummary | undefined;
  try {
    raw = await bnContributionAdapter.getContributionSummary(ssn, windowStart, windowEnd);
  } catch {
    raw = undefined;
  }

  // Best-effort split between paid / credited weeks from weekly breakdown.
  // contributionAdapter exposes weekly wages; treat zero-wage as credited.
  let paidWeeks = raw?.totalWeeks ?? 0;
  let creditedWeeks = 0;
  try {
    const weekly = await bnContributionAdapter.getWeeklyWages(ssn, windowStart, windowEnd);
    paidWeeks = weekly.filter(w => (w.wages ?? 0) > 0).reduce((s, w) => s + (w.weeks ?? 1), 0);
    creditedWeeks = weekly.filter(w => (w.wages ?? 0) === 0).reduce((s, w) => s + (w.weeks ?? 1), 0);
  } catch {
    /* keep zeros */
  }

  return {
    ssn,
    claimDate,
    productVersionId,
    windowStart,
    windowEnd,
    totalWeeks: raw?.totalWeeks ?? paidWeeks + creditedWeeks,
    paidWeeks,
    creditedWeeks,
    totalWages: raw?.totalAmount ?? 0,
    averageWeeklyWage: raw?.averageWeeklyWage ?? 0,
    raw,
    loadedAt: new Date().toISOString(),
  };
}

// ───────────────────────── Dependants ─────────────────────────

export async function getDependants(ssn: string): Promise<Dependant[]> {
  if (!ssn) return [];
  try {
    return await bnPersonAdapter.getDependants(ssn);
  } catch {
    return [];
  }
}

// ───────────────────────── Existing Claims ─────────────────────────

export interface ExistingClaimRecord {
  id: string;
  claim_number: string | null;
  product_code: string | null;
  status: string | null;
  claim_date: string | null;
  source: 'bn_claim';
}

/**
 * Return open / recent claims for the SSN for the given product (if scoped).
 * Used by smart fields to warn about duplicate claims before submission.
 */
export async function getExistingClaims(
  ssn: string,
  productCode?: string,
  opts: { limit?: number } = {},
): Promise<ExistingClaimRecord[]> {
  if (!ssn) return [];
  const limit = opts.limit ?? 10;
  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_number, status, claim_date, product:bn_product(benefit_code, code)')
    .eq('ssn', ssn)
    .order('claim_date', { ascending: false })
    .limit(limit * 3);
  if (error || !data) return [];
  const mapped: ExistingClaimRecord[] = (data as any[]).map(r => ({
    id: r.id,
    claim_number: r.claim_number ?? null,
    product_code: r.product?.benefit_code ?? r.product?.code ?? null,
    status: r.status ?? null,
    claim_date: r.claim_date ?? null,
    source: 'bn_claim' as const,
  }));
  const filtered = productCode ? mapped.filter(m => m.product_code === productCode) : mapped;
  return filtered.slice(0, limit);
}

// ───────────────────────── Required Documents ─────────────────────────

export interface RequiredDocumentLite {
  id: string;
  document_type_code: string;
  description: string | null;
  requirement_level: 'MANDATORY' | 'CONDITIONAL' | 'OPTIONAL' | string;
  blocks_submission: boolean;
  public_visible: boolean;
  internal_visible: boolean;
  sort_order: number | null;
}

/**
 * Return required documents for a product version, filtered to the channel.
 */
export async function getRequiredDocuments(
  productVersionId: string,
  channel: FormChannel,
): Promise<RequiredDocumentLite[]> {
  if (!productVersionId) return [];
  const { data, error } = await db
    .from('bn_doc_requirement')
    .select('*')
    .eq('product_version_id', productVersionId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return (data as any[])
    .filter(d => (channel === 'PUBLIC' ? d.public_visible !== false : d.internal_visible !== false))
    .map(d => ({
      id: d.id,
      document_type_code: d.document_type_code,
      description: d.description ?? null,
      requirement_level: d.requirement_level,
      blocks_submission: !!d.blocks_submission,
      public_visible: d.public_visible !== false,
      internal_visible: d.internal_visible !== false,
      sort_order: d.sort_order ?? 0,
    }));
}

// ───────────────────────── Legacy Lookup ─────────────────────────

export interface LegacyClaimRecord {
  legacy_ref: string;
  ssn: string;
  product_code: string | null;
  status: string | null;
  effective_date: string | null;
  source: 'cl_head';
}

/**
 * Lightweight legacy claim search by SSN against cl_head, used by the
 * LEGACY_LOOKUP smart field to attach legacy references to a new claim.
 */
export async function lookupLegacyClaims(
  ssn: string,
  opts: { limit?: number } = {},
): Promise<LegacyClaimRecord[]> {
  if (!ssn) return [];
  const limit = opts.limit ?? 25;
  const { data, error } = await db
    .from('cl_head')
    .select('claim_number, claim_seq, insured_ssn, benefit_type, status, effective_start_date')
    .eq('insured_ssn', ssn)
    .order('effective_start_date', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map(r => ({
    legacy_ref: r.claim_seq != null ? `${r.claim_number}/${r.claim_seq}` : String(r.claim_number ?? ''),
    ssn: r.insured_ssn,
    product_code: r.benefit_type ?? null,
    status: r.status ?? null,
    effective_date: r.effective_start_date ?? null,
    source: 'cl_head' as const,
  }));
}

// ───────────────────────── Composite Hydration ─────────────────────────

export interface HydratedClaimantContext {
  person: PersonSummary | null;
  dependants: Dependant[];
  existingClaims: ExistingClaimRecord[];
  contribution?: ContributionSummaryResult;
}

/**
 * One-shot hydration used by SmartBenefitFormRenderer after a successful SSN lookup.
 */
export async function hydrateClaimantContext(
  ssn: string,
  opts: {
    claimDate?: string;
    productCode?: string;
    productVersionId?: string;
    withContribution?: boolean;
  } = {},
): Promise<HydratedClaimantContext> {
  const [personRes, dependants, existingClaims] = await Promise.all([
    lookupPersonBySSN(ssn),
    getDependants(ssn),
    getExistingClaims(ssn, opts.productCode),
  ]);
  let contribution: ContributionSummaryResult | undefined;
  if (opts.withContribution && opts.claimDate) {
    contribution = await getContributionSummary(ssn, opts.claimDate, opts.productVersionId);
  }
  return {
    person: personRes.person ?? null,
    dependants,
    existingClaims,
    contribution,
  };
}
