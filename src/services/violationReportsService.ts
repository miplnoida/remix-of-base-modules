import { supabase } from '@/integrations/supabase/client';

export interface ViolationReportRow {
  id: string;
  violation_number: string | null;
  employer_id: string | null;
  employer_name: string | null;
  territory: string | null;
  status: string | null;
  priority: string | null;
  severity: string | null;
  fund_type: string | null;
  total_amount: number | null;
  principal_amount: number | null;
  penalty_amount: number | null;
  interest_amount: number | null;
  discovered_date: string | null;
  resolved_at: string | null;
  created_at: string | null;
  violation_type_id: string | null;
  violation_type_code: string | null;
  violation_type_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  assigned_to_name: string | null;
}

const SELECT =
  '*, ce_violation_types(code, name), ce_zones(zone_name)';

/**
 * Fetch violations for reporting. Pulls up to 5000 rows in chunks to avoid the
 * 1k Supabase default limit. Honest empty array when no rows.
 */
export async function fetchViolationReportRows(): Promise<ViolationReportRow[]> {
  const pageSize = 1000;
  const rows: ViolationReportRow[] = [];
  for (let from = 0; from < 5000; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await (supabase as any)
      .from('ce_violations')
      .select(SELECT)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    const chunk = (data || []).map((r: any) => ({
      id: r.id,
      violation_number: r.violation_number,
      employer_id: r.employer_id,
      employer_name: r.employer_name,
      territory: r.territory,
      status: r.status,
      priority: r.priority,
      severity: r.severity,
      fund_type: r.fund_type,
      total_amount: r.total_amount != null ? Number(r.total_amount) : null,
      principal_amount: r.principal_amount != null ? Number(r.principal_amount) : null,
      penalty_amount: r.penalty_amount != null ? Number(r.penalty_amount) : null,
      interest_amount: r.interest_amount != null ? Number(r.interest_amount) : null,
      discovered_date: r.discovered_date,
      resolved_at: r.resolved_at,
      created_at: r.created_at,
      violation_type_id: r.violation_type_id,
      violation_type_code: r.ce_violation_types?.code ?? null,
      violation_type_name: r.ce_violation_types?.name ?? r.ce_violation_types?.code ?? null,
      zone_id: r.zone_id,
      zone_name: r.ce_zones?.zone_name ?? null,
      assigned_to_name: r.assigned_to_name,
    }));
    rows.push(...chunk);
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
