/**
 * BN Person 360 Service
 * 
 * Unified service for the Person 360 screen.
 * Sources:
 *   - ip_master (contributor profile) via personAdapter
 *   - bn_claim (claims) 
 *   - bn_payment_instruction (payables)
 *   - bn_claim_evidence (documents/evidence)
 *   - bn_claim_event (timeline)
 *   - er_master (employers) via employerAdapter
 *   - ip_wages (contribution history) via contributionAdapter
 *   - cl_head (legacy claim header) — future
 *   - cl_cheques (outbound benefit payments) — future
 *   - bn_entitlement — future
 *   - bn_payment_schedule — future
 *   - bn_payment_exception — future
 * 
 * Tables explicitly NOT used for outbound payments:
 *   cn_payment, cn_payment_header, cn_receipt, cn_refund, cn_return_payment
 */
import { supabase } from '@/integrations/supabase/client';
import { bnPersonAdapter } from './integration/personAdapter';
import { bnContributionAdapter } from './integration/contributionAdapter';
import { bnEmployerAdapter } from './integration/employerAdapter';
import type { PersonSummary, Dependant, ContributionSummary, WageRecord } from './integration/contracts';

const db = supabase as any;

// ─── Re-export adapter types ───────────────────────────────────────
export type { PersonSummary, Dependant, ContributionSummary, WageRecord };

// ─── Person Profile ────────────────────────────────────────────────
export async function getPersonProfile(ssn: string) {
  return bnPersonAdapter.lookupPerson(ssn);
}

export async function getPersonDependants(ssn: string) {
  return bnPersonAdapter.getDependants(ssn);
}

// ─── Claims ────────────────────────────────────────────────────────
// Unified view: merges modern bn_claim with legacy cl_head (BEMA) so a
// single Person 360 stream shows both. Source routing lives in
// unifiedClaimService — pages must NOT query cl_* tables directly.
export interface Person360Claim {
  id: string;
  claim_number: string;
  claim_seq?: number | null;
  benefit_type: string;
  product_name?: string;
  status: string;
  priority: string;
  claim_date: string;
  decision_date?: string;
  assigned_to?: string;
  employer_regno?: string;
  legacy_claim_ref?: string;
  /** 'BN' = modern bn_claim row; 'LEGACY_BEMA' = legacy cl_head row. */
  source: 'BN' | 'LEGACY_BEMA';
  source_badge: 'BN' | 'Legacy (BEMA)';
}

export async function getPersonClaims(ssn: string): Promise<Person360Claim[]> {
  // Lazy import to avoid circular module init.
  const { unifiedClaimService } = await import('@/services/bn/unifiedClaimService');
  const unified = await unifiedClaimService.getUnifiedClaimsBySsn(ssn.trim());

  return unified.map((u) => {
    const isLegacy = u.sourceSystem === 'LEGACY_BEMA';
    // Synthetic id for legacy rows so navigation stays on /bn/claims/:id;
    // Claim 360 resolves "legacy:NUM:SEQ" via unifiedClaimService.
    const id = isLegacy
      ? `legacy:${u.claimNumber}:${u.claimSeq}`
      : (u.claimId ?? `${u.claimNumber}-${u.claimSeq ?? 0}`);

    return {
      id,
      claim_number: u.claimNumber ?? '—',
      claim_seq: u.claimSeq ?? null,
      benefit_type: u.benefitName ?? u.benefitCode ?? 'Unknown',
      product_name: u.benefitName ?? undefined,
      status: u.status ?? (isLegacy ? 'LEGACY' : 'DRAFT'),
      priority: 'NORMAL',
      claim_date: u.claimDate ?? '',
      decision_date: undefined,
      assigned_to: undefined,
      employer_regno: undefined,
      legacy_claim_ref: isLegacy && u.claimNumber
        ? `${u.claimNumber}-${u.claimSeq ?? ''}`
        : undefined,
      source: u.sourceSystem,
      source_badge: u.sourceBadge,
    };
  });
}


// ─── Entitlements (bn_entitlement — when table exists) ─────────────
export interface Person360Entitlement {
  id: string;
  claim_number: string;
  product_code: string;
  entitlement_type: string;
  weekly_rate: number;
  total_amount: number;
  remaining_amount: number;
  effective_from: string;
  effective_to?: string;
  status: string;
  payment_frequency: string;
}

export async function getPersonEntitlements(ssn: string): Promise<Person360Entitlement[]> {
  try {
    const { data, error } = await db
      .from('bn_entitlement')
      .select('*, bn_claim(claim_number)')
      .eq('ssn', ssn.trim())
      .order('effective_from', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((e: any) => ({
      id: e.id,
      claim_number: e.bn_claim?.claim_number || '—',
      product_code: e.product_code,
      entitlement_type: e.entitlement_type,
      weekly_rate: e.weekly_rate ?? 0,
      total_amount: e.total_amount ?? 0,
      remaining_amount: e.remaining_amount ?? 0,
      effective_from: e.effective_from,
      effective_to: e.effective_to,
      status: e.status,
      payment_frequency: e.payment_frequency,
    }));
  } catch {
    // Table may not exist yet
    return [];
  }
}

// ─── Disbursements — cl_cheques (outbound benefit payments) ────────
export interface Person360Disbursement {
  cheque_no: string;
  claim_no: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  period_from?: string;
  period_to?: string;
  status: string;
  batch_no?: string;
}

export async function getPersonDisbursements(ssn: string): Promise<Person360Disbursement[]> {
  try {
    const { data, error } = await db
      .from('cl_cheques')
      .select('*')
      .eq('ssn', ssn.trim())
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      cheque_no: d.cheque_no,
      claim_no: d.claim_no,
      amount: d.amount,
      currency: d.currency || 'XCD',
      payment_date: d.payment_date,
      payment_method: d.payment_method,
      period_from: d.period_from,
      period_to: d.period_to,
      status: d.status,
      batch_no: d.batch_no,
    }));
  } catch {
    // Table may not exist yet — fall back to bn_payment_instruction
    return getPersonPayablesFallback(ssn);
  }
}

// Fallback: bn_payment_instruction (pre-cl_cheques migration)
async function getPersonPayablesFallback(ssn: string): Promise<Person360Disbursement[]> {
  const { data, error } = await db
    .from('bn_payment_instruction')
    .select('*')
    .eq('ssn', ssn.trim())
    .eq('status', 'PAID')
    .order('paid_date', { ascending: false });

  if (error) return [];
  return (data ?? []).map((p: any) => ({
    cheque_no: p.payment_reference || p.id,
    claim_no: p.claim_id || '—',
    amount: p.amount,
    currency: p.currency || 'XCD',
    payment_date: p.paid_date || p.due_date,
    payment_method: p.payment_method || 'EFT',
    status: 'ISSUED',
  }));
}

// ─── Payables Queue (pending payments) ─────────────────────────────
export interface Person360Payable {
  id: string;
  claim_id: string;
  claim_number?: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  payment_method: string;
  frequency: string;
  description?: string;
}

export async function getPersonPayables(ssn: string): Promise<Person360Payable[]> {
  const { data, error } = await db
    .from('bn_payment_instruction')
    .select('*, bn_claim(claim_number)')
    .eq('ssn', ssn.trim())
    .in('status', ['PENDING', 'APPROVED', 'BATCHED', 'HELD'])
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    claim_id: p.claim_id,
    claim_number: p.bn_claim?.claim_number,
    amount: p.amount,
    currency: p.currency || 'XCD',
    due_date: p.due_date,
    status: p.status,
    payment_method: p.payment_method || 'EFT',
    frequency: p.frequency || 'ONE_TIME',
    description: p.description,
  }));
}

// ─── Employers ─────────────────────────────────────────────────────
export interface Person360Employer {
  regNo: string;
  name: string;
  status: string;
  lastContributionPeriod?: string;
  totalWeeks: number;
  totalWages: number;
}

export async function getPersonEmployers(ssn: string): Promise<Person360Employer[]> {
  // Get distinct employers from ip_wages
  const { data, error } = await db
    .from('ip_wages')
    .select('employer_reg_no, wages, weeks, period')
    .eq('ssn', ssn.trim())
    .order('period', { ascending: false });

  if (error) throw error;

  const byEmployer: Record<string, { totalWages: number; totalWeeks: number; lastPeriod: string }> = {};
  for (const row of data ?? []) {
    const key = row.employer_reg_no;
    if (!key) continue;
    if (!byEmployer[key]) byEmployer[key] = { totalWages: 0, totalWeeks: 0, lastPeriod: row.period };
    byEmployer[key].totalWages += row.wages ?? 0;
    byEmployer[key].totalWeeks += row.weeks ?? 0;
  }

  const results: Person360Employer[] = [];
  for (const [regNo, agg] of Object.entries(byEmployer)) {
    const employer = await bnEmployerAdapter.lookupEmployer(regNo).catch(() => null);
    results.push({
      regNo,
      name: employer?.name || regNo,
      status: employer?.status || 'unknown',
      lastContributionPeriod: agg.lastPeriod,
      totalWeeks: agg.totalWeeks,
      totalWages: agg.totalWages,
    });
  }
  return results;
}

// ─── Evidence/Documents ────────────────────────────────────────────
export interface Person360Document {
  id: string;
  claim_number?: string;
  document_type: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export async function getPersonDocuments(ssn: string): Promise<Person360Document[]> {
  // Get claim IDs for this SSN first
  const { data: claims, error: claimErr } = await db
    .from('bn_claim')
    .select('id, claim_number')
    .eq('ssn', ssn.trim());

  if (claimErr || !claims?.length) return [];

  const claimIds = claims.map((c: any) => c.id);
  const claimMap = Object.fromEntries(claims.map((c: any) => [c.id, c.claim_number]));

  const { data, error } = await db
    .from('bn_claim_evidence')
    .select('id, claim_id, document_type_code, file_name, status, entered_at, verified_by, verified_at, notes')
    .in('claim_id', claimIds)
    .order('entered_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    claim_number: claimMap[d.claim_id],
    document_type: d.document_type_code || 'OTHER',
    file_name: d.file_name || 'Unknown',
    status: d.status || 'PENDING',
    uploaded_at: d.entered_at,
    verified_by: d.verified_by,
    verified_at: d.verified_at,
    notes: d.notes,
  }));
}

// ─── Timeline ──────────────────────────────────────────────────────
export interface Person360TimelineEvent {
  id: string;
  claim_number?: string;
  event_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  from_status?: string;
  to_status?: string;
}

export async function getPersonTimeline(ssn: string): Promise<Person360TimelineEvent[]> {
  const { data: claims, error: claimErr } = await db
    .from('bn_claim')
    .select('id, claim_number')
    .eq('ssn', ssn.trim());

  if (claimErr || !claims?.length) return [];

  const claimIds = claims.map((c: any) => c.id);
  const claimMap = Object.fromEntries(claims.map((c: any) => [c.id, c.claim_number]));

  const { data, error } = await db
    .from('bn_claim_event')
    .select('*')
    .in('claim_id', claimIds)
    .order('performed_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map((e: any) => ({
    id: e.id,
    claim_number: claimMap[e.claim_id],
    event_type: e.event_type || 'UNKNOWN',
    description: e.description || e.event_type || '',
    performed_by: e.performed_by || 'System',
    performed_at: e.performed_at,
    from_status: e.from_status,
    to_status: e.to_status,
  }));
}

// ─── Summary Counts ────────────────────────────────────────────────
export interface Person360Summary {
  totalClaims: number;
  activeClaims: number;
  activeEntitlements: number;
  pendingPayables: number;
  totalDisbursed: number;
  totalContributionWeeks: number;
}

export async function getPersonSummary(ssn: string): Promise<Person360Summary> {
  const [claims, entitlements, payables, contributions] = await Promise.all([
    getPersonClaims(ssn),
    getPersonEntitlements(ssn),
    getPersonPayables(ssn),
    bnContributionAdapter.getTotalContributions(ssn),
  ]);

  const activeClaims = claims.filter(c =>
    !['CLOSED', 'DENIED', 'CANCELLED'].includes(c.status)
  );

  const activeEntitlements = entitlements.filter(e => e.status === 'ACTIVE');
  const pendingPayables = payables.length;

  return {
    totalClaims: claims.length,
    activeClaims: activeClaims.length,
    activeEntitlements: activeEntitlements.length,
    pendingPayables,
    totalDisbursed: 0, // Will be populated from cl_cheques when available
    totalContributionWeeks: contributions.weeks,
  };
}
