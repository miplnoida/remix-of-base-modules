/**
 * Eligibility Fact Resolver — the single runtime entry point for evaluating
 * eligibility facts.
 *
 *   const value = await resolveFact('contribution.paid_weeks', ctx);
 *
 * All rule evaluation MUST go through this resolver so that:
 *   • every fact has a known, registered source,
 *   • the source table is recorded for explainability,
 *   • free-text JSON keys never reach the database layer.
 *
 * Unknown fact keys throw.
 */

import { supabase } from '@/integrations/supabase/client';
import { getFact } from './eligibilityFactRegistry';

const db = supabase as any;

export interface EligibilityContext {
  ssn?: string | null;
  claimId?: string | null;
  productCode?: string | null;
  /** ISO date string (yyyy-MM-dd) — the claim date used for age / windows. */
  claimDate?: string | null;
  /** Optional employer to scope employer-related facts to. */
  employerRegno?: string | null;
  /** Free-form extras the runtime can stash (e.g. injury date overrides). */
  extras?: Record<string, unknown>;
}

export interface FactResolution {
  fact_key: string;
  value: unknown;
  source_table: string;
  source_column: string;
  resolved_at: string;
  /** If a resolver could not run (missing context, etc.) it sets reason here. */
  reason?: string;
}

type ResolverFn = (ctx: EligibilityContext) => Promise<unknown>;

// ───────────────────────── helpers ─────────────────────────

function yearsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  let years = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) years--;
  return years;
}

async function loadIpMaster(ssn: string) {
  const { data } = await db
    .from('ip_master')
    .select('ssn, dob, sex, status, date_died')
    .eq('ssn', ssn)
    .maybeSingle();
  return data ?? null;
}

async function loadClaim(claimId: string) {
  const { data } = await db
    .from('bn_claim')
    .select('id, ssn, product_id, claim_date, submission_date, employer_regno, application_channel, channel_code')
    .eq('id', claimId)
    .maybeSingle();
  return data ?? null;
}

async function loadContributionSnapshot(claimId: string) {
  const { data } = await db
    .from('bn_claim_contribution_snapshot')
    .select('claim_id, total_weeks, paid_weeks, credited_weeks, total_wages, average_weekly_wage, contribution_json, captured_at, period_from, period_to')
    .eq('claim_id', claimId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function loadEmployer(regno: string) {
  const { data } = await db
    .from('er_master')
    .select('regno, status, registration_date, date_of_closure')
    .eq('regno', regno)
    .maybeSingle();
  return data ?? null;
}

async function hasClaimDocument(claimId: string, codes: string[]): Promise<boolean> {
  const { data } = await db
    .from('bn_claim_document')
    .select('id, document_type_code')
    .eq('claim_id', claimId)
    .in('document_type_code', codes)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

// ───────────────────────── resolvers ─────────────────────────

const RESOLVERS: Record<string, ResolverFn> = {
  // Person
  resolvePersonAge: async (ctx) => {
    if (!ctx.ssn || !ctx.claimDate) return null;
    const ip = await loadIpMaster(ctx.ssn);
    if (!ip?.dob) return null;
    return yearsBetween(ip.dob, ctx.claimDate);
  },
  resolvePersonGender: async (ctx) => {
    if (!ctx.ssn) return null;
    const ip = await loadIpMaster(ctx.ssn);
    return ip?.sex ?? null;
  },
  resolvePersonAlive: async (ctx) => {
    if (!ctx.ssn) return null;
    const ip = await loadIpMaster(ctx.ssn);
    if (!ip) return null;
    if (ip.date_died) return 'DECEASED';
    const status = (ip.status ?? '').toString().toUpperCase();
    if (status.includes('DECEAS')) return 'DECEASED';
    return 'ALIVE';
  },

  // Contribution (snapshot-first, falls back to null when no snapshot yet)
  resolveContribTotalWeeks: async (ctx) => {
    if (!ctx.claimId) return null;
    const s = await loadContributionSnapshot(ctx.claimId);
    return s?.total_weeks ?? null;
  },
  resolveContribPaidWeeks: async (ctx) => {
    if (!ctx.claimId) return null;
    const s = await loadContributionSnapshot(ctx.claimId);
    return s?.paid_weeks ?? null;
  },
  resolveContribRecentWeeks: async (ctx) => {
    if (!ctx.claimId) return null;
    const s = await loadContributionSnapshot(ctx.claimId);
    // Prefer an explicit `recent_weeks` key in contribution_json; otherwise null.
    const j = (s?.contribution_json as Record<string, unknown> | null) ?? null;
    if (j && typeof j['recent_weeks'] === 'number') return j['recent_weeks'];
    return null;
  },
  resolveContribAvgWage: async (ctx) => {
    if (!ctx.claimId) return null;
    const s = await loadContributionSnapshot(ctx.claimId);
    return s?.average_weekly_wage ?? null;
  },
  resolveContribLastDate: async (ctx) => {
    if (!ctx.claimId) return null;
    const s = await loadContributionSnapshot(ctx.claimId);
    return s?.period_to ?? null;
  },

  // Employer
  resolveEmployerExists: async (ctx) => {
    if (ctx.employerRegno) {
      const er = await loadEmployer(ctx.employerRegno);
      return Boolean(er);
    }
    if (!ctx.claimId) return false;
    const c = await loadClaim(ctx.claimId);
    if (!c?.employer_regno) return false;
    const er = await loadEmployer(c.employer_regno);
    return Boolean(er);
  },
  resolveEmployerStatus: async (ctx) => {
    let regno = ctx.employerRegno ?? null;
    if (!regno && ctx.claimId) {
      const c = await loadClaim(ctx.claimId);
      regno = c?.employer_regno ?? null;
    }
    if (!regno) return null;
    const er = await loadEmployer(regno);
    if (!er?.status) return null;
    const s = String(er.status).toUpperCase();
    if (s.startsWith('A')) return 'ACTIVE';
    if (s.startsWith('C')) return 'CEASED';
    return 'PENDING';
  },
  resolveEmployerActiveOnInjuryDate: async (ctx) => {
    if (!ctx.claimId) return false;
    const c = await loadClaim(ctx.claimId);
    const regno = ctx.employerRegno ?? c?.employer_regno ?? null;
    const injuryDate = (ctx.extras?.['injury_date'] as string | undefined) ?? c?.claim_date ?? null;
    if (!regno || !injuryDate) return false;
    const er = await loadEmployer(regno);
    if (!er) return false;
    if (er.date_of_closure && er.date_of_closure < injuryDate) return false;
    if (er.registration_date && er.registration_date > injuryDate) return false;
    return String(er.status ?? '').toUpperCase().startsWith('A');
  },

  // Claim event
  resolveClaimInjuryDate: async (ctx) => {
    if (ctx.extras && typeof ctx.extras['injury_date'] === 'string') {
      return ctx.extras['injury_date'];
    }
    if (!ctx.claimId) return null;
    const c = await loadClaim(ctx.claimId);
    return c?.claim_date ?? null;
  },
  resolveClaimSubmissionDate: async (ctx) => {
    if (!ctx.claimId) return null;
    const c = await loadClaim(ctx.claimId);
    return c?.submission_date ?? null;
  },
  resolveClaimDaysSinceEvent: async (ctx) => {
    if (!ctx.claimId) return null;
    const c = await loadClaim(ctx.claimId);
    const evt = (ctx.extras?.['injury_date'] as string | undefined) ?? c?.claim_date ?? null;
    const sub = c?.submission_date ?? ctx.claimDate ?? new Date().toISOString().slice(0, 10);
    if (!evt) return null;
    const ms = Date.parse(sub) - Date.parse(evt);
    if (!Number.isFinite(ms)) return null;
    return Math.floor(ms / 86_400_000);
  },
  resolveClaimChannel: async (ctx) => {
    if (!ctx.claimId) return null;
    const c = await loadClaim(ctx.claimId);
    return c?.application_channel ?? c?.channel_code ?? null;
  },

  // Documents
  resolveDocMedicalCert: async (ctx) => {
    if (!ctx.claimId) return false;
    return hasClaimDocument(ctx.claimId, ['MEDICAL_CERT', 'MED_CERT', 'MEDICAL_CERTIFICATE']);
  },
  resolveDocDeathCert: async (ctx) => {
    if (!ctx.claimId) return false;
    return hasClaimDocument(ctx.claimId, ['DEATH_CERT', 'DEATH_CERTIFICATE']);
  },
  resolveDocBirthCert: async (ctx) => {
    if (!ctx.claimId) return false;
    return hasClaimDocument(ctx.claimId, ['BIRTH_CERT', 'BIRTH_CERTIFICATE']);
  },
  resolveDocEmployerReport: async (ctx) => {
    if (!ctx.claimId) return false;
    return hasClaimDocument(ctx.claimId, ['EMPLOYER_RPT', 'EMPLOYER_REPORT', 'ACCIDENT_REPORT']);
  },

  // Existing benefits
  resolveActiveAward: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_award')
      .select('id, status')
      .eq('ssn', ctx.ssn)
      .eq('status', 'ACTIVE')
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  },
  resolveDuplicateClaim: async (ctx) => {
    if (!ctx.ssn || !ctx.productCode) return false;
    const { data } = await db
      .from('bn_claim')
      .select('id, status, product:bn_product(benefit_code, code)')
      .eq('ssn', ctx.ssn)
      .neq('id', ctx.claimId ?? '')
      .in('status', ['OPEN', 'IN_REVIEW', 'APPROVED', 'PENDING'])
      .limit(50);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => {
      const code = r.product?.benefit_code ?? r.product?.code ?? null;
      return code === ctx.productCode;
    });
  },
  resolvePreviousMaternity: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_claim')
      .select('id, product:bn_product(benefit_code, code)')
      .eq('ssn', ctx.ssn)
      .neq('id', ctx.claimId ?? '')
      .order('claim_date', { ascending: false })
      .limit(50);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => {
      const code = String(r.product?.benefit_code ?? r.product?.code ?? '').toUpperCase();
      return code.includes('MAT');
    });
  },

  // ───────── Phase 3 additions ─────────
  // Claim date facts (fall back to context.extras / claim columns when present)
  resolveClaimReportedDate: async (ctx) => {
    if (typeof ctx.extras?.['reported_date'] === 'string') return ctx.extras['reported_date'];
    if (!ctx.claimId) return null;
    const { data } = await db.from('bn_claim').select('id, reported_date, submission_date').eq('id', ctx.claimId).maybeSingle();
    return (data as any)?.reported_date ?? null;
  },
  resolveClaimSicknessStartDate: async (ctx) => {
    if (typeof ctx.extras?.['sickness_start_date'] === 'string') return ctx.extras['sickness_start_date'];
    if (!ctx.claimId) return null;
    const { data } = await db.from('bn_claim').select('id, sickness_start_date, claim_date').eq('id', ctx.claimId).maybeSingle();
    return (data as any)?.sickness_start_date ?? (data as any)?.claim_date ?? null;
  },
  resolveClaimMaternityExpectedDate: async (ctx) => {
    if (typeof ctx.extras?.['expected_confinement_date'] === 'string') return ctx.extras['expected_confinement_date'];
    if (!ctx.claimId) return null;
    const { data } = await db.from('bn_claim').select('id, expected_confinement_date').eq('id', ctx.claimId).maybeSingle();
    return (data as any)?.expected_confinement_date ?? null;
  },
  resolveClaimDeathDate: async (ctx) => {
    if (typeof ctx.extras?.['death_date'] === 'string') return ctx.extras['death_date'];
    if (!ctx.claimId) return null;
    const { data } = await db.from('bn_claim').select('id, death_date').eq('id', ctx.claimId).maybeSingle();
    return (data as any)?.death_date ?? null;
  },
  resolveClaimLastWorkedDate: async (ctx) => {
    if (typeof ctx.extras?.['last_worked_date'] === 'string') return ctx.extras['last_worked_date'];
    if (!ctx.claimId) return null;
    const { data } = await db.from('bn_claim').select('id, last_worked_date').eq('id', ctx.claimId).maybeSingle();
    return (data as any)?.last_worked_date ?? null;
  },

  // Document status (vs existence). Returns the verification_status of the most recent document of the type.
  ...(() => {
    const make = (codes: string[]) => async (ctx: EligibilityContext) => {
      if (!ctx.claimId) return null;
      const { data } = await db
        .from('bn_claim_document')
        .select('id, document_type_code, verification_status, uploaded_at')
        .eq('claim_id', ctx.claimId)
        .in('document_type_code', codes)
        .order('uploaded_at', { ascending: false })
        .limit(1);
      if (!Array.isArray(data) || data.length === 0) return 'PENDING';
      const s = String((data[0] as any).verification_status ?? '').toUpperCase();
      return s || 'RECEIVED';
    };
    return {
      resolveDocStatusMedicalCert: make(['MEDICAL_CERT', 'MED_CERT', 'MEDICAL_CERTIFICATE']),
      resolveDocStatusDeathCert: make(['DEATH_CERT', 'DEATH_CERTIFICATE']),
      resolveDocStatusEmployerReport: make(['EMPLOYER_RPT', 'EMPLOYER_REPORT', 'ACCIDENT_REPORT']),
      resolveDocStatusFuneralInvoice: make(['FUNERAL_INVOICE', 'FUN_INVOICE']),
      resolveDocStatusSchoolCert: make(['SCHOOL_CERT', 'SCHOOL_CERTIFICATE']),
      resolveDocStatusLifeCert: make(['LIFE_CERT', 'LIFE_CERTIFICATE']),
      resolveDocStatusBirthCert: make(['BIRTH_CERT', 'BIRTH_CERTIFICATE']),
    };
  })(),

  // Existing benefits — extended
  resolvePriorEmploymentInjury: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_claim')
      .select('id, product:bn_product(benefit_code, code)')
      .eq('ssn', ctx.ssn)
      .neq('id', ctx.claimId ?? '')
      .limit(50);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => {
      const code = String(r.product?.benefit_code ?? r.product?.code ?? '').toUpperCase();
      return code === 'SKN-EI' || code.startsWith('SKN-EI');
    });
  },
  resolveContributoryPensionExists: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_award')
      .select('id, status, product:bn_product(benefit_code, code)')
      .eq('ssn', ctx.ssn)
      .eq('status', 'ACTIVE')
      .limit(50);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => {
      const code = String(r.product?.benefit_code ?? r.product?.code ?? '').toUpperCase();
      return code === 'SKN-AGE' || code === 'SKN-INV' || code === 'SKN-SURV';
    });
  },
  resolveActiveSurvivorChildAward: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_award_beneficiary')
      .select('id, relationship, is_active')
      .eq('beneficiary_ssn', ctx.ssn)
      .limit(10);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => String(r.relationship ?? '').toUpperCase().includes('CHILD') && r.is_active !== false);
  },

  // Medical / Medical Board — try real table, fall back to notImplemented signal
  resolveMedicalDisablementPct: async (ctx) => {
    if (!ctx.claimId) return null;
    const { data, error } = await db
      .from('bn_medical_recommendation')
      .select('disablement_pct')
      .eq('claim_id', ctx.claimId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.disablement_pct ?? null;
  },
  resolveMedicalBoardDecision: async (ctx) => {
    if (!ctx.claimId) return null;
    const { data, error } = await db
      .from('bn_medical_recommendation')
      .select('decision')
      .eq('claim_id', ctx.claimId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.decision ?? null;
  },
  resolveMedicalInvalidityConfirmed: async (ctx) => {
    if (!ctx.claimId) return false;
    const { data, error } = await db
      .from('bn_medical_recommendation')
      .select('decision')
      .eq('claim_id', ctx.claimId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return String((data as any)?.decision ?? '').toUpperCase() === 'APPROVED';
  },

  // Beneficiary / Applicant / Payment / Means test — pragmatic implementations
  resolveBeneficiaryRelationshipValid: async (ctx) => {
    if (!ctx.claimId) return false;
    const { data } = await db
      .from('bn_award_beneficiary')
      .select('id, relationship')
      .eq('claim_id', ctx.claimId)
      .limit(10);
    if (!Array.isArray(data)) return false;
    const allowed = ['SPOUSE', 'CHILD', 'PARENT', 'DEPENDENT'];
    return data.some((r: any) => allowed.includes(String(r.relationship ?? '').toUpperCase()));
  },
  resolveBeneficiaryStudentStatus: async (ctx) => {
    if (!ctx.claimId) return 'PENDING';
    const { data } = await db
      .from('bn_award_beneficiary')
      .select('id, is_student, student_verification_status')
      .eq('claim_id', ctx.claimId)
      .limit(10);
    if (!Array.isArray(data) || data.length === 0) return 'PENDING';
    const row = data[0] as any;
    return row.student_verification_status ?? (row.is_student ? 'VERIFIED' : 'PENDING');
  },
  resolveFuneralResponsibilityConfirmed: async (ctx) => {
    if (!ctx.claimId) return false;
    const { data } = await db.from('bn_claim').select('id, applicant_attestation').eq('id', ctx.claimId).maybeSingle();
    return Boolean((data as any)?.applicant_attestation);
  },
  resolvePaymentBankDetailsValid: async (ctx) => {
    if (!ctx.ssn) return false;
    const { data } = await db
      .from('bn_payment_profile')
      .select('id, is_verified, is_active')
      .eq('ssn', ctx.ssn)
      .eq('is_active', true)
      .limit(5);
    if (!Array.isArray(data)) return false;
    return data.some((r: any) => r.is_verified === true);
  },
  resolveMeansTestResult: async (_ctx) => {
    // NOT_IMPLEMENTED — backing table to be introduced
    return null;
  },
};

/** Resolve a single fact. Throws on unknown fact keys. */
export async function resolveFact(
  factKey: string,
  ctx: EligibilityContext,
): Promise<FactResolution> {
  const def = getFact(factKey);
  if (!def) {
    throw new Error(`Unknown eligibility fact: "${factKey}". Add it to the registry first.`);
  }
  const fn = RESOLVERS[def.resolver_function];
  if (!fn) {
    throw new Error(
      `No resolver "${def.resolver_function}" registered for fact "${factKey}".`,
    );
  }
  let value: unknown = null;
  let reason: string | undefined;
  try {
    value = await fn(ctx);
  } catch (e: any) {
    reason = e?.message ?? 'resolver failed';
  }
  return {
    fact_key: factKey,
    value,
    source_table: def.source_table,
    source_column: def.source_column,
    resolved_at: new Date().toISOString(),
    reason,
  };
}

/** Convenience: resolve many facts in parallel, preserving order. */
export async function resolveFacts(
  factKeys: string[],
  ctx: EligibilityContext,
): Promise<FactResolution[]> {
  return Promise.all(factKeys.map((k) => resolveFact(k, ctx)));
}

/** List all registered resolver names — used by the validator. */
export function getRegisteredResolverNames(): string[] {
  return Object.keys(RESOLVERS);
}
