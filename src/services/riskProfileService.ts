/**
 * Risk Profile Service
 *
 * Read-only views over the existing `ce_risk_profiles` / `ce_risk_score_history`
 * / `ce_risk_config` tables and CRUD over `ce_employer_watchlist`.
 * Never writes to risk_profiles directly (recalculation is owned by the
 * existing `fn_ce_calculate_employer_risk` RPC); only allows audited
 * manual band override and watchlist management.
 */
import { supabase } from '@/integrations/supabase/client';

export interface RiskProfileRow {
  id: string;
  employer_id: string;
  employer_name: string | null;
  total_score: number;
  risk_band: string;
  override_band: string | null;
  override_reason: string | null;
  override_by: string | null;
  arrears_score: number;
  violation_score: number;
  filing_score: number;
  legal_history_score: number;
  payment_behavior_score: number;
  last_calculated_at: string | null;
  zone_id: string | null;
  scoring_version: string | null;
}

export interface RiskFactor {
  factor_code: string;
  factor_name: string;
  category: string;
  weight: number;
  max_score: number;
  is_enabled: boolean;
  description: string | null;
}

export interface RiskHistoryRow {
  id: string;
  risk_profile_id: string;
  previous_score: number | null;
  new_score: number | null;
  previous_band: string | null;
  new_band: string | null;
  calculation_details: any;
  calculated_at: string;
  calculated_by: string | null;
}

export interface WatchlistEntry {
  id: string;
  employer_id: string;
  employer_name: string | null;
  reason: string;
  source: 'SYSTEM' | 'MANUAL';
  status: 'ACTIVE' | 'EXPIRED' | 'REMOVED';
  start_date: string;
  end_date: string | null;
  added_by: string | null;
  removed_by: string | null;
  removed_at: string | null;
  removal_notes: string | null;
  notes: string | null;
  created_at: string;
}

// ── Register & lists ────────────────────────────────────────────
export async function listRiskRegister(opts?: {
  band?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: RiskProfileRow[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  let q: any = supabase
    .from('ce_risk_profiles')
    .select(
      'id, employer_id, employer_name, total_score, risk_band, override_band, override_reason, override_by, arrears_score, violation_score, filing_score, legal_history_score, payment_behavior_score, last_calculated_at, zone_id, scoring_version',
      { count: 'exact' },
    );
  if (opts?.band && opts.band !== 'ALL') q = q.eq('risk_band', opts.band);
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`employer_id.ilike.%${s}%,employer_name.ilike.%${s}%`);
  }
  q = q.order('total_score', { ascending: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data || []) as RiskProfileRow[], total: count || 0 };
}

export async function listHighRiskEmployers(limit = 200): Promise<RiskProfileRow[]> {
  // Include rows where either the calculated risk_band OR the manual override_band
  // is HIGH/CRITICAL. Manual overrides must appear on this page even when the
  // underlying calculated band is lower.
  const bands = ['HIGH', 'CRITICAL', 'High', 'Critical'];
  const bandList = bands.map((b) => `"${b}"`).join(',');
  const { data, error } = await (supabase.from('ce_risk_profiles') as any)
    .select('id, employer_id, employer_name, total_score, risk_band, override_band, last_calculated_at, zone_id')
    .or(`risk_band.in.(${bandList}),override_band.in.(${bandList})`)
    .order('total_score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as RiskProfileRow[];
}

export interface RepeatDefaulterRow {
  employer_id: string;
  employer_name: string | null;
  missed_filings_12m: number;
  total_filings_12m: number;
  last_filing_period: string | null;
  total_outstanding: number;
  risk_band: string | null;
  total_score: number | null;
}

export async function listRepeatDefaulters(minMissed = 3, limit = 200): Promise<RepeatDefaulterRow[]> {
  // Filing view
  const { data: filings, error: fe } = await (supabase.from('ce_v_employer_filing_status') as any)
    .select('regno, employer_name, missed_filings_12m, total_filings_12m, last_filing_period')
    .gte('missed_filings_12m', minMissed)
    .order('missed_filings_12m', { ascending: false })
    .limit(limit);
  if (fe) throw fe;
  const ids = (filings || []).map((f: any) => f.regno);
  if (!ids.length) return [];

  const [{ data: arrears }, { data: profiles }] = await Promise.all([
    (supabase.from('ce_v_employer_arrears_summary') as any).select('regno, total_outstanding').in('regno', ids),
    (supabase.from('ce_risk_profiles') as any).select('employer_id, risk_band, total_score').in('employer_id', ids),
  ]);
  const am = new Map((arrears || []).map((a: any) => [a.regno, Number(a.total_outstanding || 0)]));
  const pm = new Map((profiles || []).map((p: any) => [p.employer_id, p]));

  return (filings || []).map((f: any) => {
    const p: any = pm.get(f.regno) || {};
    return {
      employer_id: f.regno,
      employer_name: f.employer_name,
      missed_filings_12m: Number(f.missed_filings_12m || 0),
      total_filings_12m: Number(f.total_filings_12m || 0),
      last_filing_period: f.last_filing_period,
      total_outstanding: Number(am.get(f.regno) || 0),
      risk_band: p.risk_band || null,
      total_score: p.total_score != null ? Number(p.total_score) : null,
    };
  });
}

// ── Score detail ────────────────────────────────────────────────
export async function getRiskProfile(employerId: string): Promise<RiskProfileRow | null> {
  const { data, error } = await (supabase.from('ce_risk_profiles') as any)
    .select('*')
    .eq('employer_id', employerId)
    .maybeSingle();
  if (error) throw error;
  return (data as RiskProfileRow) || null;
}

export async function listFactors(): Promise<RiskFactor[]> {
  const { data, error } = await (supabase.from('ce_risk_config') as any)
    .select('factor_code, factor_name, category, weight, max_score, is_enabled, description')
    .order('category', { ascending: true })
    .order('weight', { ascending: false });
  if (error) throw error;
  return (data || []) as RiskFactor[];
}

export async function getLatestHistory(profileId: string): Promise<RiskHistoryRow | null> {
  const { data, error } = await (supabase.from('ce_risk_score_history') as any)
    .select('*')
    .eq('risk_profile_id', profileId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as RiskHistoryRow) || null;
}

export async function applyManualOverride(
  profileId: string,
  band: string | null,
  reason: string,
  userCode: string,
): Promise<void> {
  const { data: prev, error: pErr } = await (supabase.from('ce_risk_profiles') as any)
    .select('total_score, risk_band, override_band')
    .eq('id', profileId)
    .single();
  if (pErr) throw pErr;
  const { error } = await (supabase.from('ce_risk_profiles') as any)
    .update({
      override_band: band,
      override_reason: reason,
      override_by: userCode,
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);
  if (error) throw error;
  // Audit via history
  await (supabase.from('ce_risk_score_history') as any).insert({
    risk_profile_id: profileId,
    previous_score: prev?.total_score ?? null,
    new_score: prev?.total_score ?? null,
    previous_band: prev?.override_band || prev?.risk_band || null,
    new_band: band || prev?.risk_band || null,
    calculation_details: { type: 'MANUAL_OVERRIDE', reason, by: userCode },
    calculated_by: userCode,
  });
}

// ── Watchlist ───────────────────────────────────────────────────
export async function listWatchlist(status: string = 'ACTIVE'): Promise<WatchlistEntry[]> {
  let q: any = (supabase.from('ce_employer_watchlist' as never) as any).select('*');
  if (status !== 'ALL') q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data || []) as WatchlistEntry[];
}

export async function addToWatchlist(entry: {
  employer_id: string;
  employer_name?: string | null;
  reason: string;
  source?: 'SYSTEM' | 'MANUAL';
  start_date?: string;
  end_date?: string | null;
  notes?: string | null;
}, userCode: string): Promise<void> {
  const { error } = await (supabase.from('ce_employer_watchlist' as never) as any).insert({
    employer_id: entry.employer_id,
    employer_name: entry.employer_name || null,
    reason: entry.reason,
    source: entry.source || 'MANUAL',
    start_date: entry.start_date || new Date().toISOString().slice(0, 10),
    end_date: entry.end_date || null,
    notes: entry.notes || null,
    added_by: userCode,
  });
  if (error) throw error;
}

export async function removeFromWatchlist(id: string, notes: string, userCode: string): Promise<void> {
  const { error } = await (supabase.from('ce_employer_watchlist' as never) as any)
    .update({
      status: 'REMOVED',
      removed_by: userCode,
      removed_at: new Date().toISOString(),
      removal_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
