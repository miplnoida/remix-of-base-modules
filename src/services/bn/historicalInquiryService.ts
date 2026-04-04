import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ---- Search Filters ----
export interface HistoricalSearchFilters {
  ssn?: string;
  claim_number?: string;
  claimant_name?: string;
  product_code?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  cheque_number?: string;
  payment_method?: string;
  search_type: 'claims' | 'disbursements';
  limit?: number;
  offset?: number;
}

// ---- Result Types ----
export interface HistoricalClaimRecord {
  id: string;
  claim_number: string;
  ssn: string;
  claimant_name: string;
  product_code: string;
  benefit_name: string;
  category: string;
  status: string;
  entered_at: string;
  effective_date: string | null;
  end_date: string | null;
  decision_date: string | null;
  decision_outcome: string | null;
  assigned_to: string | null;
  source_table: 'bn_claim' | 'cl_head';
  legacy_ref: string | null;
}

export interface HistoricalDisbursementRecord {
  id: string;
  cheque_no: string | null;
  claim_number: string;
  ssn: string;
  payee_name: string;
  amount: number;
  payment_method: string;
  payment_date: string | null;
  issue_date: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  bank_code: string | null;
  account_number: string | null;
  source_table: 'cl_cheques' | 'cl_cheques_holding' | 'cl_cheques_survivor';
  legacy_ref: string | null;
  hold_reason?: string | null;
  survivor_id?: string | null;
}

export interface ClaimDetailRecord {
  claim: HistoricalClaimRecord;
  detail: Record<string, any> | null;
  events: Array<{
    id: string;
    action: string;
    performed_by: string;
    performed_at: string;
    narrative: string | null;
  }>;
  disbursements: HistoricalDisbursementRecord[];
}

// ---- Claim Search ----

export async function searchHistoricalClaims(
  filters: HistoricalSearchFilters
): Promise<HistoricalClaimRecord[]> {
  // Search bn_claim (modern orchestration layer)
  let query = db
    .from('bn_claim')
    .select('*, bn_product(benefit_code, benefit_name, category)')
    .order('entered_at', { ascending: false });

  if (filters.ssn) query = query.eq('ssn', filters.ssn);
  if (filters.claim_number) query = query.ilike('claim_number', `%${filters.claim_number}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.product_code) query = query.eq('product_id', filters.product_code);
  if (filters.date_from) query = query.gte('entered_at', filters.date_from);
  if (filters.date_to) query = query.lte('entered_at', filters.date_to);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    claim_number: row.claim_number || '',
    ssn: row.ssn || '',
    claimant_name: row.claimant_name || '',
    product_code: row.bn_product?.benefit_code || '',
    benefit_name: row.bn_product?.benefit_name || '',
    category: row.bn_product?.category || '',
    status: row.status || '',
    entered_at: row.entered_at,
    effective_date: row.effective_date,
    end_date: row.end_date,
    decision_date: row.decision_date,
    decision_outcome: row.decision_outcome,
    assigned_to: row.assigned_to,
    source_table: 'bn_claim' as const,
    legacy_ref: row.legacy_claim_ref || null,
  }));
}

// ---- Disbursement Search ----

export async function searchHistoricalDisbursements(
  filters: HistoricalSearchFilters
): Promise<HistoricalDisbursementRecord[]> {
  const results: HistoricalDisbursementRecord[] = [];

  // 1) cl_cheques — standard issued payments
  const chequeResults = await searchChequeTable('cl_cheques', filters);
  results.push(...chequeResults);

  // 2) cl_cheques_holding — payments on hold
  const holdingResults = await searchChequeTable('cl_cheques_holding', filters);
  results.push(...holdingResults);

  // 3) cl_cheques_survivor — survivor-specific payments
  const survivorResults = await searchChequeTable('cl_cheques_survivor', filters);
  results.push(...survivorResults);

  // Sort combined results by payment_date desc
  results.sort((a, b) => {
    const da = a.payment_date || a.issue_date || '';
    const db2 = b.payment_date || b.issue_date || '';
    return db2.localeCompare(da);
  });

  // Apply limit
  if (filters.limit) {
    return results.slice(0, filters.limit);
  }
  return results;
}

async function searchChequeTable(
  table: 'cl_cheques' | 'cl_cheques_holding' | 'cl_cheques_survivor',
  filters: HistoricalSearchFilters
): Promise<HistoricalDisbursementRecord[]> {
  let query = db.from(table).select('*').order('payment_date', { ascending: false });

  if (filters.ssn) query = query.eq('ssn', filters.ssn);
  if (filters.claim_number) query = query.ilike('claim_number', `%${filters.claim_number}%`);
  if (filters.cheque_number) query = query.ilike('cheque_no', `%${filters.cheque_number}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date_from) query = query.gte('payment_date', filters.date_from);
  if (filters.date_to) query = query.lte('payment_date', filters.date_to);
  if (filters.payment_method) query = query.eq('payment_method', filters.payment_method);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    console.warn(`[HistoricalInquiry] ${table} query failed:`, error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id || row.cheque_no || '',
    cheque_no: row.cheque_no || null,
    claim_number: row.claim_number || '',
    ssn: row.ssn || '',
    payee_name: row.payee_name || '',
    amount: row.amount || 0,
    payment_method: row.payment_method || 'CHQ',
    payment_date: row.payment_date || null,
    issue_date: row.issue_date || null,
    status: row.status || 'ISSUED',
    period_start: row.period_start || null,
    period_end: row.period_end || null,
    bank_code: row.bank_code || null,
    account_number: row.account_number ? maskAccount(row.account_number) : null,
    source_table: table,
    legacy_ref: row.legacy_ref || row.cheque_no || null,
    hold_reason: table === 'cl_cheques_holding' ? row.hold_reason : undefined,
    survivor_id: table === 'cl_cheques_survivor' ? row.survivor_id : undefined,
  }));
}

function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct;
  return '****' + acct.slice(-4);
}

// ---- Claim Detail ----

export async function fetchHistoricalClaimDetail(claimId: string): Promise<ClaimDetailRecord | null> {
  // Fetch claim
  const { data: claim, error: claimErr } = await db
    .from('bn_claim')
    .select('*, bn_product(benefit_code, benefit_name, category, payment_type)')
    .eq('id', claimId)
    .maybeSingle();
  if (claimErr) throw claimErr;
  if (!claim) return null;

  // Fetch detail
  const { data: detail } = await db
    .from('bn_claim_detail')
    .select('*')
    .eq('claim_id', claimId)
    .maybeSingle();

  // Fetch events
  const { data: events } = await db
    .from('bn_claim_event')
    .select('*')
    .eq('claim_id', claimId)
    .order('performed_at', { ascending: false })
    .limit(50);

  // Fetch disbursements linked to this claim
  const claimNumber = claim.claim_number;
  let disbursements: HistoricalDisbursementRecord[] = [];
  if (claimNumber) {
    disbursements = await searchHistoricalDisbursements({
      claim_number: claimNumber,
      search_type: 'disbursements',
      limit: 100,
    });
  }

  return {
    claim: {
      id: claim.id,
      claim_number: claim.claim_number || '',
      ssn: claim.ssn || '',
      claimant_name: claim.claimant_name || '',
      product_code: claim.bn_product?.benefit_code || '',
      benefit_name: claim.bn_product?.benefit_name || '',
      category: claim.bn_product?.category || '',
      status: claim.status || '',
      entered_at: claim.entered_at,
      effective_date: claim.effective_date,
      end_date: claim.end_date,
      decision_date: claim.decision_date,
      decision_outcome: claim.decision_outcome,
      assigned_to: claim.assigned_to,
      source_table: 'bn_claim',
      legacy_ref: claim.legacy_claim_ref || null,
    },
    detail: detail || null,
    events: (events ?? []).map((e: any) => ({
      id: e.id,
      action: e.action || e.event_type || '',
      performed_by: e.performed_by || '',
      performed_at: e.performed_at || '',
      narrative: e.narrative || null,
    })),
    disbursements,
  };
}

// ---- Audit: log inquiry action ----

export async function logInquiryAccess(params: {
  entity_type: 'CLAIM' | 'DISBURSEMENT';
  entity_id: string;
  user_code: string;
  action?: string;
}) {
  await db.from('bn_claim_event').insert({
    claim_id: params.entity_id,
    event_type: 'INQUIRY_ACCESS',
    action: params.action || 'VIEW_HISTORY',
    performed_by: params.user_code,
    performed_at: new Date().toISOString(),
    narrative: `Historical inquiry access: ${params.entity_type} ${params.entity_id}`,
  });
}

// ---- Summary Stats ----

export async function getHistoricalStats(ssn?: string) {
  const filters: HistoricalSearchFilters = { search_type: 'claims', limit: 1000 };
  if (ssn) filters.ssn = ssn;

  const claims = await searchHistoricalClaims(filters);
  const disbFilters: HistoricalSearchFilters = { search_type: 'disbursements', limit: 1000 };
  if (ssn) disbFilters.ssn = ssn;
  const disbursements = await searchHistoricalDisbursements(disbFilters);

  const totalDisbursed = disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);
  const heldCount = disbursements.filter(d => d.source_table === 'cl_cheques_holding').length;
  const survivorCount = disbursements.filter(d => d.source_table === 'cl_cheques_survivor').length;

  return {
    totalClaims: claims.length,
    totalDisbursements: disbursements.length,
    totalDisbursed,
    heldPayments: heldCount,
    survivorPayments: survivorCount,
    closedClaims: claims.filter(c => c.status === 'CLOSED').length,
    activeClaims: claims.filter(c => !['CLOSED', 'DENIED', 'WITHDRAWN'].includes(c.status)).length,
  };
}
