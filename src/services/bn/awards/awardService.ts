/**
 * BN Award Service — Pensioner Register data access.
 * Reads bn_award and related servicing tables. No mock data.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AwardFilters {
  benefitCode?: string;
  status?: string;
  awardType?: string;
  lifeCert?: 'DUE' | 'OVERDUE' | 'ANY';
  medicalReviewDue?: boolean;
  survivorsOnly?: boolean;
  paymentHold?: boolean;
  search?: string; // ssn or name
}

export interface AwardListRow {
  id: string;
  award_number: string | null;
  ssn: string | null;
  claimant_name: string | null;
  benefit_code: string | null;
  award_type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  base_amount: number | null;
  frequency: string | null;
  next_review_date: string | null;
  life_certificate_status: string | null;
  last_payment_date: string | null;
  next_payment_date: string | null;
  overpayment_balance: number | null;
}

const SURVIVOR_CODES = ['SURVIVORS', 'SB', 'SURV'];

export async function fetchAwards(filters: AwardFilters = {}): Promise<AwardListRow[]> {
  let q = supabase
    .from('bn_award')
    .select('id, award_number, ssn, benefit_code, award_type, status, start_date, end_date, base_amount, frequency, next_review_date')
    .order('start_date', { ascending: false })
    .range(0, 999);

  if (filters.benefitCode) q = q.eq('benefit_code', filters.benefitCode);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.awardType) q = q.eq('award_type', filters.awardType);
  if (filters.survivorsOnly) q = q.in('benefit_code', SURVIVOR_CODES);
  if (filters.search) {
    const term = filters.search.trim();
    if (term) q = q.or(`ssn.ilike.%${term}%,award_number.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];

  const ssns = Array.from(new Set(rows.map(r => r.ssn).filter(Boolean)));
  const awardIds = rows.map(r => r.id);

  const [names, lifeCerts, payments, overpayments] = await Promise.all([
    ssns.length
      ? supabase.from('ip_master').select('ssn, firstname, surname').in('ssn', ssns)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('bn_life_certificate')
      .select('bn_award_id, status, due_date')
      .in('bn_award_id', awardIds),
    supabase
      .from('bn_payment_schedule')
      .select('bn_award_id, last_run_date, next_run_date')
      .in('bn_award_id', awardIds),
    supabase
      .from('bn_overpayment')
      .select('bn_award_id, outstanding_amount')
      .in('bn_award_id', awardIds),
  ]);

  const nameMap = new Map<string, string>();
  for (const r of (names.data ?? []) as any[]) {
    nameMap.set(r.ssn, [r.firstname, r.surname].filter(Boolean).join(' '));
  }
  const lcMap = new Map<string, { status: string; due_date: string }>();
  for (const r of (lifeCerts.data ?? []) as any[]) {
    const prev = lcMap.get(r.bn_award_id);
    if (!prev || (r.due_date && r.due_date > prev.due_date)) lcMap.set(r.bn_award_id, r);
  }
  const payMap = new Map<string, any>();
  for (const r of (payments.data ?? []) as any[]) payMap.set(r.bn_award_id, r);
  const opMap = new Map<string, number>();
  for (const r of (overpayments.data ?? []) as any[]) {
    opMap.set(r.bn_award_id, (opMap.get(r.bn_award_id) ?? 0) + Number(r.outstanding_amount ?? 0));
  }

  let result: AwardListRow[] = rows.map(r => ({
    id: r.id,
    award_number: r.award_number,
    ssn: r.ssn,
    claimant_name: nameMap.get(r.ssn) ?? null,
    benefit_code: r.benefit_code,
    award_type: r.award_type,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    base_amount: r.base_amount,
    frequency: r.frequency,
    next_review_date: r.next_review_date,
    life_certificate_status: lcMap.get(r.id)?.status ?? null,
    last_payment_date: payMap.get(r.id)?.last_run_date ?? null,
    next_payment_date: payMap.get(r.id)?.next_run_date ?? null,
    overpayment_balance: opMap.get(r.id) ?? 0,
  }));

  if (filters.lifeCert === 'OVERDUE') {
    const today = new Date().toISOString().slice(0, 10);
    result = result.filter(r => {
      const lc = lcMap.get(r.id);
      return lc?.due_date && lc.due_date < today && lc.status !== 'VERIFIED';
    });
  } else if (filters.lifeCert === 'DUE') {
    result = result.filter(r => r.life_certificate_status && r.life_certificate_status !== 'VERIFIED');
  }
  if (filters.medicalReviewDue) {
    const today = new Date().toISOString().slice(0, 10);
    result = result.filter(r => r.next_review_date && r.next_review_date <= today);
  }
  if (filters.paymentHold) {
    result = result.filter(r => ['SUSPENDED', 'HOLD', 'PAYMENT_HOLD'].includes(r.status ?? ''));
  }
  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    if (term && !/^\d/.test(term)) {
      result = result.filter(r => (r.claimant_name ?? '').toLowerCase().includes(term));
    }
  }
  return result;
}

export interface AwardDetail {
  award: any;
  beneficiaries: any[];
  rateHistory: any[];
  statusEvents: any[];
  suspensions: any[];
  lifeCertificates: any[];
  medicalReviews: any[];
  overpayments: any[];
  schedules: any[];
  payments: any[];
  communications: any[];
  claim: any | null;
  product: any | null;
  productVersion: any | null;
  pensioner: any | null;
}

export async function fetchAwardDetail(id: string): Promise<AwardDetail> {
  const { data: award, error } = await supabase.from('bn_award').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!award) throw new Error('Award not found');

  const run = async (p: any): Promise<any> => { const r = await p; return r; };

  const beneficiaries = await run(supabase.from('bn_award_beneficiary').select('*').eq('bn_award_id', id).order('start_date', { ascending: false }));
  const rateHistory = await run(supabase.from('bn_award_rate_history').select('*').eq('bn_award_id', id).order('effective_from', { ascending: false }));
  const statusEvents = await run(supabase.from('bn_award_status_event').select('*').eq('bn_award_id', id).order('event_date', { ascending: false }));
  const suspensions = await run(supabase.from('bn_award_suspension_event').select('*').eq('bn_award_id', id).order('entered_at', { ascending: false }));
  const lifeCerts = await run(supabase.from('bn_life_certificate').select('*').eq('bn_award_id', id).order('due_date', { ascending: false }));
  const medicalReviews = await run(supabase.from('bn_medical_review_schedule').select('*').eq('bn_award_id', id).order('scheduled_date', { ascending: false }));
  const overpayments = await run(supabase.from('bn_overpayment').select('*').eq('bn_award_id', id).order('entered_at', { ascending: false }));
  const schedules = await run(supabase.from('bn_payment_schedule').select('*').eq('bn_award_id', id));
  const payments = await run((supabase.from('bn_payment_instruction') as any).select('*').eq('bn_award_id', id).order('scheduled_date', { ascending: false }).range(0, 199));
  const communications = await run((supabase.from('bn_communication_log') as any).select('*').eq('bn_award_id', id).order('created_at', { ascending: false }).range(0, 199));
  const claim = (award as any).bn_claim_id
    ? await run(supabase.from('bn_claim').select('*').eq('id', (award as any).bn_claim_id).maybeSingle())
    : { data: null };
  const pensioner = (award as any).ssn
    ? await run(supabase.from('ip_master').select('ssn, first_name, last_name, dob, sex, address1, address2, mobile_no, email_id').eq('ssn', (award as any).ssn).maybeSingle())
    : { data: null };
  const product = (award as any).bn_product_id
    ? await run(supabase.from('bn_product').select('*').eq('id', (award as any).bn_product_id).maybeSingle())
    : { data: null };

  let productVersion: any = null;
  if (claim?.data?.bn_product_version_id) {
    const { data: pv } = await supabase.from('bn_product_version').select('*').eq('id', claim.data.bn_product_version_id).maybeSingle();
    productVersion = pv;
  }

  return {
    award,
    beneficiaries: beneficiaries.data ?? [],
    rateHistory: rateHistory.data ?? [],
    statusEvents: statusEvents.data ?? [],
    suspensions: suspensions.data ?? [],
    lifeCertificates: lifeCerts.data ?? [],
    medicalReviews: medicalReviews.data ?? [],
    overpayments: overpayments.data ?? [],
    schedules: schedules.data ?? [],
    payments: payments.data ?? [],
    communications: communications.data ?? [],
    claim: claim.data ?? null,
    pensioner: pensioner.data ?? null,
    product: product.data ?? null,
    productVersion,
  };
}

export async function fetchAwardAdjustments(): Promise<any[]> {
  const { data, error } = await supabase
    .from('bn_award_rate_history')
    .select('*, bn_award:bn_award_id(award_number, ssn, benefit_code)')
    .order('effective_from', { ascending: false })
    .range(0, 499);
  if (error) throw error;
  return data ?? [];
}
