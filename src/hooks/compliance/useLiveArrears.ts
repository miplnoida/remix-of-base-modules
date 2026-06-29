import { supabase } from '@/integrations/supabase/client';

/**
 * Live arrears loader — replaces the seed snapshot table
 * `ce_arrears_report_entries` with real data from
 * `ce_v_employer_arrears_summary`, joined with zone resolution
 * via `ce_violations.zone_id` → `ce_zones.zone_name` and
 * last-payment dates from `cn_payment` / `cn_payment_header`.
 */
export interface LiveArrearsRow {
  id: string;
  employer_id: string;
  regno: string;
  employer_name: string;
  zone: string;
  total_arrears: number;
  current_penalty: number;
  total_outstanding: number;
  last_payment_date: string | null;
  aging_category: string;
  trend: string;
}

async function loadAllPaged<T = any>(
  table: string,
  select = '*',
  filters?: (q: any) => any,
): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 200000; from += pageSize) {
    let q: any = (supabase as any).from(table).select(select).range(from, from + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...((data as T[]) || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

function bucketAging(lastPayment: string | null): string {
  if (!lastPayment) return '90+ days';
  const days = Math.floor((Date.now() - new Date(lastPayment).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return '0-30 days';
  if (days <= 60) return '30-60 days';
  if (days <= 90) return '60-90 days';
  return '90+ days';
}

export async function loadLiveArrears(): Promise<LiveArrearsRow[]> {
  // 1. Pull all employers with arrears from the live view
  const arrearsRows = await loadAllPaged<any>(
    'ce_v_employer_arrears_summary',
    'regno,employer_name,current_arrears,current_penalty,total_outstanding,has_arrears',
    (q) => q.eq('has_arrears', true),
  );

  // 2. Resolve zone per regno via ce_violations + ce_zones
  const zones = await loadAllPaged<any>('ce_zones', 'id,zone_name');
  const zoneById = new Map<string, string>(zones.map((z: any) => [z.id, z.zone_name]));

  const violations = await loadAllPaged<any>(
    'ce_violations',
    'employer_id,zone_id,updated_at',
    (q) => q.not('zone_id', 'is', null),
  );
  // Most recent zone assignment per employer wins
  violations.sort((a: any, b: any) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const zoneByRegno = new Map<string, string>();
  for (const v of violations) {
    if (!zoneByRegno.has(v.employer_id) && v.zone_id) {
      const zn = zoneById.get(v.zone_id);
      if (zn) zoneByRegno.set(v.employer_id, zn);
    }
  }

  // 3. Resolve last-payment date per regno
  const headers = await loadAllPaged<any>('cn_payment_header', 'payment_id,payer_id,date_received');
  const headerById = new Map<string, any>(headers.map((h: any) => [h.payment_id, h]));
  const payments = await loadAllPaged<any>('cn_payment', 'payment_id,payment_date');
  const lastPaymentByRegno = new Map<string, string>();
  for (const p of payments) {
    const h = headerById.get(p.payment_id);
    if (!h?.payer_id) continue;
    const d = p.payment_date || h.date_received;
    if (!d) continue;
    const prev = lastPaymentByRegno.get(h.payer_id);
    if (!prev || d > prev) lastPaymentByRegno.set(h.payer_id, d);
  }

  // 4. Shape the rows
  return arrearsRows.map((r: any) => {
    const last = lastPaymentByRegno.get(r.regno) || null;
    return {
      id: r.regno,
      employer_id: r.regno,
      regno: r.regno,
      employer_name: r.employer_name || r.regno,
      zone: zoneByRegno.get(r.regno) || 'Unassigned',
      total_arrears: Number(r.current_arrears || 0),
      current_penalty: Number(r.current_penalty || 0),
      total_outstanding: Number(r.total_outstanding || 0),
      last_payment_date: last,
      aging_category: bucketAging(last),
      trend: '—',
    };
  });
}
