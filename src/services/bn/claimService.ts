import { supabase } from '@/integrations/supabase/client';
import type { BnClaim, BnClaimDetail, BnClaimEvent, BnClaimNote, BnClaimEligibility, BnClaimCalculation, BnClaimDocument } from '@/types/bn';

// Cast helper - new bn_ tables not yet in auto-generated types
const db = supabase as any;

// ---- Claim CRUD ----

export async function fetchClaims(filters?: {
  status?: string;
  ssn?: string;
  product_id?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}): Promise<BnClaim[]> {
  let query = db
    .from('bn_claim')
    .select('*, bn_product(benefit_code, benefit_name, category)')
    .order('entered_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.ssn) query = query.eq('ssn', filters.ssn);
  if (filters?.product_id) query = query.eq('product_id', filters.product_id);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BnClaim[];
}

export async function fetchClaimById(id: string): Promise<BnClaim | null> {
  const { data, error } = await db
    .from('bn_claim')
    .select('*, bn_product(benefit_code, benefit_name, category, payment_type)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as BnClaim | null;
}

export async function createClaim(claim: Partial<BnClaim>): Promise<BnClaim> {
  const { data, error } = await db.from('bn_claim').insert(claim).select().single();
  if (error) throw error;
  return data as BnClaim;
}

export async function updateClaim(id: string, updates: Partial<BnClaim>): Promise<BnClaim> {
  const { data, error } = await db.from('bn_claim').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as BnClaim;
}

// ---- Claim Detail ----

export async function fetchClaimDetail(claimId: string): Promise<BnClaimDetail | null> {
  const { data, error } = await db.from('bn_claim_detail').select('*').eq('claim_id', claimId).maybeSingle();
  if (error) throw error;
  return data as BnClaimDetail | null;
}

export async function upsertClaimDetail(detail: Partial<BnClaimDetail>): Promise<BnClaimDetail> {
  const { data, error } = await db.from('bn_claim_detail').upsert(detail, { onConflict: 'claim_id' }).select().single();
  if (error) throw error;
  return data as BnClaimDetail;
}

// ---- Claim Events ----

export async function fetchClaimEvents(claimId: string): Promise<BnClaimEvent[]> {
  const { data, error } = await db.from('bn_claim_event').select('*').eq('claim_id', claimId).order('performed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnClaimEvent[];
}

export async function addClaimEvent(event: Partial<BnClaimEvent>): Promise<BnClaimEvent> {
  const { data, error } = await db.from('bn_claim_event').insert(event).select().single();
  if (error) throw error;
  return data as BnClaimEvent;
}

// ---- Claim Notes ----

export async function fetchClaimNotes(claimId: string): Promise<BnClaimNote[]> {
  const { data, error } = await db.from('bn_claim_note').select('*').eq('claim_id', claimId).order('entered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnClaimNote[];
}

export async function addClaimNote(note: Partial<BnClaimNote>): Promise<BnClaimNote> {
  const { data, error } = await db.from('bn_claim_note').insert(note).select().single();
  if (error) throw error;
  return data as BnClaimNote;
}

// ---- Eligibility ----

export async function fetchClaimEligibility(claimId: string): Promise<BnClaimEligibility[]> {
  const { data, error } = await db.from('bn_claim_eligibility').select('*').eq('claim_id', claimId).order('check_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnClaimEligibility[];
}

export async function saveClaimEligibility(elig: Partial<BnClaimEligibility>): Promise<BnClaimEligibility> {
  const { data, error } = await db.from('bn_claim_eligibility').insert(elig).select().single();
  if (error) throw error;
  return data as BnClaimEligibility;
}

// ---- Calculations ----

export async function fetchClaimCalculations(claimId: string): Promise<BnClaimCalculation[]> {
  const { data, error } = await db.from('bn_claim_calculation').select('*').eq('claim_id', claimId).order('calc_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnClaimCalculation[];
}

export async function saveClaimCalculation(calc: Partial<BnClaimCalculation>): Promise<BnClaimCalculation> {
  const { data, error } = await db.from('bn_claim_calculation').insert(calc).select().single();
  if (error) throw error;
  return data as BnClaimCalculation;
}

// ---- Documents ----

export async function fetchClaimDocuments(claimId: string): Promise<BnClaimDocument[]> {
  const { data, error } = await db.from('bn_claim_document').select('*').eq('claim_id', claimId).order('entered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnClaimDocument[];
}

export async function addClaimDocument(doc: Partial<BnClaimDocument>): Promise<BnClaimDocument> {
  const { data, error } = await db.from('bn_claim_document').insert(doc).select().single();
  if (error) throw error;
  return data as BnClaimDocument;
}

// ---- Contribution Summary (RPC) ----

export async function getContributionSummary(ssn: string, fromDate?: string, toDate?: string) {
  const { data, error } = await db.rpc('bn_get_contribution_summary', {
    p_ssn: ssn,
    p_from_date: fromDate || null,
    p_to_date: toDate || null,
  });
  if (error) throw error;
  return data?.[0] ?? { total_weeks: 0, total_wages: 0, avg_weekly_wages: 0 };
}
