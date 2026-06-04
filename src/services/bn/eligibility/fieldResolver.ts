/**
 * BN Eligibility Field Resolver
 *
 * Resolves business-safe field keys (from fieldRegistry) into actual values
 * by delegating to the correct adapter / RPC. The calculation engine and the
 * UI "preview/test" button both call resolveField() — keeping resolution
 * logic in a single place.
 */
import { supabase } from '@/integrations/supabase/client';
import { bnPersonAdapter } from '@/services/bn/integration/personAdapter';
import { bnEmployerAdapter } from '@/services/bn/integration/employerAdapter';
import { getFieldDef, type EligibilityWindowType } from './fieldRegistry';

const db = supabase as any;

export interface FieldResolutionContext {
  ssn: string;
  claimId?: string;
  claimDate: string; // ISO date
  benefitType?: string;
  employerRegNo?: string;
}

export interface RuleResolutionOptions {
  windowType?: EligibilityWindowType;
  windowFrom?: string | null;
  windowTo?: string | null;
  documentTypeCode?: string | null;
}

export interface ResolvedValue {
  fieldKey: string;
  resolver: string;
  value: unknown;
  sourceLabel: string;
  windowResolved?: { from: string; to: string; type: EligibilityWindowType };
  notes?: string;
}

function resolveWindow(
  claimDate: string,
  windowType: EligibilityWindowType = 'LIFETIME',
  windowFrom?: string | null,
  windowTo?: string | null
): { from: string; to: string; type: EligibilityWindowType } {
  const to = windowTo || claimDate;
  if (windowType === 'LAST_52_WEEKS') {
    const d = new Date(claimDate);
    d.setDate(d.getDate() - 364);
    return { from: d.toISOString().substring(0, 10), to, type: windowType };
  }
  if (windowType === 'LAST_3_YEARS') {
    const d = new Date(claimDate);
    d.setFullYear(d.getFullYear() - 3);
    return { from: d.toISOString().substring(0, 10), to, type: windowType };
  }
  if (windowType === 'CUSTOM_DATE_RANGE') {
    return { from: windowFrom || '1900-01-01', to, type: windowType };
  }
  return { from: '1900-01-01', to, type: 'LIFETIME' };
}

async function getContributionSummary(ssn: string, from: string, to: string) {
  const { data, error } = await db.rpc('bn_get_contribution_summary', {
    p_ssn: ssn,
    p_from_date: from,
    p_to_date: to,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) ?? { total_weeks: 0, total_wages: 0, avg_weekly_wages: 0 };
}

function ageFromDob(dob: string | null, refDate: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const ref = new Date(refDate);
  if (isNaN(d.getTime()) || isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

export async function resolveField(
  fieldKey: string,
  ctx: FieldResolutionContext,
  opts: RuleResolutionOptions = {}
): Promise<ResolvedValue> {
  const def = getFieldDef(fieldKey);
  if (!def) {
    throw new Error(`Unknown eligibility field key: ${fieldKey}`);
  }

  switch (def.resolver) {
    case 'contribution.totalWeeks':
    case 'contribution.totalWages':
    case 'contribution.avgWeeklyWage': {
      const win = resolveWindow(ctx.claimDate, opts.windowType, opts.windowFrom, opts.windowTo);
      const summary = await getContributionSummary(ctx.ssn, win.from, win.to);
      const value =
        def.resolver === 'contribution.totalWeeks' ? summary.total_weeks ?? 0 :
        def.resolver === 'contribution.totalWages' ? summary.total_wages ?? 0 :
        summary.avg_weekly_wages ?? 0;
      return { fieldKey, resolver: def.resolver, value, sourceLabel: def.dataSource, windowResolved: win };
    }
    case 'person.ageAtClaim': {
      const dob = await bnPersonAdapter.getPersonDOB(ctx.ssn);
      const age = ageFromDob(dob, ctx.claimDate);
      return {
        fieldKey, resolver: def.resolver, value: age,
        sourceLabel: 'ip_master.dob',
        notes: dob ? `DOB ${dob}` : 'DOB not found',
      };
    }
    case 'person.status': {
      const status = await bnPersonAdapter.getPersonStatus(ctx.ssn);
      return { fieldKey, resolver: def.resolver, value: status, sourceLabel: 'ip_master.status' };
    }
    case 'person.deceased': {
      const status = await bnPersonAdapter.getPersonStatus(ctx.ssn);
      return { fieldKey, resolver: def.resolver, value: status === 'deceased', sourceLabel: 'ip_master.status' };
    }
    case 'employer.status': {
      if (!ctx.employerRegNo) {
        return { fieldKey, resolver: def.resolver, value: null, sourceLabel: 'er_master.status', notes: 'No employer on claim' };
      }
      try {
        const emp: any = await (bnEmployerAdapter as any).lookupEmployer?.(ctx.employerRegNo);
        return { fieldKey, resolver: def.resolver, value: emp?.status ?? null, sourceLabel: 'er_master.status' };
      } catch {
        return { fieldKey, resolver: def.resolver, value: null, sourceLabel: 'er_master.status', notes: 'Employer lookup failed' };
      }
    }
    case 'evidence.requiredDocsComplete': {
      if (!ctx.claimId) {
        return { fieldKey, resolver: def.resolver, value: false, sourceLabel: 'bn_evidence_checklist', notes: 'No claim id' };
      }
      const { data, error } = await db
        .from('bn_evidence_checklist')
        .select('status, is_blocking')
        .eq('claim_id', ctx.claimId);
      if (error) {
        return { fieldKey, resolver: def.resolver, value: false, sourceLabel: 'bn_evidence_checklist', notes: error.message };
      }
      const outstanding = (data ?? []).filter((r: any) => r.is_blocking && r.status !== 'FULFILLED');
      return {
        fieldKey, resolver: def.resolver,
        value: outstanding.length === 0,
        sourceLabel: 'bn_evidence_checklist',
        notes: `${outstanding.length} blocking item(s) outstanding`,
      };
    }
    case 'evidence.documentVerified': {
      if (!ctx.claimId) {
        return { fieldKey, resolver: def.resolver, value: false, sourceLabel: 'bn_claim_evidence', notes: 'No claim id' };
      }
      let query = db.from('bn_claim_evidence').select('status, document_type_code').eq('claim_id', ctx.claimId);
      if (opts.documentTypeCode) query = query.eq('document_type_code', opts.documentTypeCode);
      const { data, error } = await query;
      if (error) {
        return { fieldKey, resolver: def.resolver, value: false, sourceLabel: 'bn_claim_evidence', notes: error.message };
      }
      const verified = (data ?? []).some((r: any) => ['VERIFIED', 'ACCEPTED', 'FULFILLED'].includes(String(r.status).toUpperCase()));
      return { fieldKey, resolver: def.resolver, value: verified, sourceLabel: 'bn_claim_evidence' };
    }
    case 'claim.claimDate':
      return { fieldKey, resolver: def.resolver, value: ctx.claimDate, sourceLabel: 'engine input' };
    case 'claim.benefitType':
      return { fieldKey, resolver: def.resolver, value: ctx.benefitType ?? null, sourceLabel: 'engine input' };
    case 'claim.hasDuplicateActiveClaim': {
      // Check active BN claims for same SSN + benefit type (excluding this claim)
      let bnQ = db.from('bn_claim').select('id, status, product_id').eq('ssn', ctx.ssn)
        .not('status', 'in', '(REJECTED,CANCELLED,CLOSED,DRAFT)');
      if (ctx.claimId) bnQ = bnQ.neq('id', ctx.claimId);
      const { data: bnRows } = await bnQ;
      const bnDup = (bnRows ?? []).length > 0;
      let legacyDup = false;
      try {
        const { getLegacyClaimsBySsn } = await import('@/services/bn/integration/historicalInquiryAdapter');
        const legacy = await getLegacyClaimsBySsn(ctx.ssn);
        legacyDup = (legacy?.data ?? []).some((c: any) => {
          const st = String(c.status ?? '').toUpperCase();
          const benefitMatch = !ctx.benefitType || String(c.benefitType ?? c.benefit_type ?? '').toUpperCase() === ctx.benefitType.toUpperCase();
          return benefitMatch && !['CLOSED', 'REJECTED', 'CANCELLED', 'PAID'].includes(st);
        });
      } catch { /* legacy unavailable — non-fatal */ }
      return {
        fieldKey, resolver: def.resolver, value: bnDup || legacyDup,
        sourceLabel: 'bn_claim + legacy cl_head',
        notes: `bn=${bnDup} legacy=${legacyDup}`,
      };
    }
    default:
      throw new Error(`No resolver implemented for ${def.resolver}`);
  }
}
