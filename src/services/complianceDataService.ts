import { supabase } from "@/integrations/supabase/client";

// ============================================
// CASES
// ============================================
export async function fetchComplianceCases(filters?: {
  status?: string;
  caseType?: string;
  search?: string;
}) {
  let query = supabase
    .from("ce_cases")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters?.caseType && filters.caseType !== "ALL") {
    query = query.eq("case_type", filters.caseType);
  }
  if (filters?.search) {
    query = query.or(
      `case_number.ilike.%${filters.search}%,employer_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCaseById(id: string) {
  const { data, error } = await supabase
    .from("ce_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCasesByEmployer(employerId: string, excludeCaseId?: string) {
  let query = supabase
    .from("ce_cases")
    .select("*")
    .eq("employer_id", employerId)
    .eq("is_deleted", false);
  if (excludeCaseId) query = query.neq("id", excludeCaseId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================
// CASE HISTORY
// ============================================
export async function fetchCaseHistory(caseId: string) {
  const { data, error } = await supabase
    .from("ce_case_history")
    .select("*")
    .eq("case_id", caseId)
    .order("performed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ============================================
// NOTICES
// ============================================
export async function fetchNotices(filters?: { search?: string; caseId?: string }) {
  let query = supabase
    .from("ce_notices")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.caseId) {
    query = query.eq("case_id", filters.caseId);
  }
  if (filters?.search) {
    query = query.or(
      `employer_name.ilike.%${filters.search}%,notice_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================
// PAYMENT ARRANGEMENTS
// ============================================
export async function fetchPaymentArrangements(filters?: { status?: string }) {
  let query = supabase
    .from("ce_payment_arrangements")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchInstallments(arrangementId: string) {
  const { data, error } = await supabase
    .from("ce_installments")
    .select("*")
    .eq("arrangement_id", arrangementId)
    .order("installment_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ============================================
// WEEKLY PLANS & INSPECTORS
// ============================================
export async function fetchInspectors() {
  const { data, error } = await supabase
    .from("ce_inspectors")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchWeeklyPlans(filters?: { inspectorId?: string }) {
  let query = supabase
    .from("ce_weekly_plans")
    .select("*, ce_weekly_plan_items(*)")
    .order("week_start_date", { ascending: false });

  if (filters?.inspectorId && filters.inspectorId !== "ALL") {
    query = query.eq("inspector_id", filters.inspectorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================
// FIELD ACTIVITIES
// ============================================
export async function fetchFieldActivities(filters?: { status?: string; search?: string }) {
  let query = supabase
    .from("ce_field_activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `employer_name.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================
// EMPLOYER STATEMENTS (from financial ledger)
// ============================================
export async function fetchEmployerStatementSummaries() {
  const { data, error } = await supabase
    .from("ce_employer_financial_ledger")
    .select("employer_id, employer_name, fund_type, debit_amount, credit_amount, posted_at")
    .eq("status", "POSTED")
    .order("posted_at", { ascending: true });
  if (error) throw error;

  // Group by employer
  const employerMap = new Map<string, any>();
  (data ?? []).forEach((row) => {
    if (!employerMap.has(row.employer_id)) {
      employerMap.set(row.employer_id, {
        id: row.employer_id,
        employerId: row.employer_id,
        employerName: row.employer_name,
        asOfDate: new Date().toISOString().split("T")[0],
        totalDue: 0,
        totalPaid: 0,
        penalties: 0,
        outstanding: 0,
        complianceStatus: "compliant" as const,
      });
    }
    const emp = employerMap.get(row.employer_id)!;
    emp.totalDue += Number(row.debit_amount) || 0;
    emp.totalPaid += Number(row.credit_amount) || 0;
  });

  return Array.from(employerMap.values()).map((e) => ({
    ...e,
    outstanding: e.totalDue - e.totalPaid,
    complianceStatus: e.totalDue - e.totalPaid > 0 ? "non_compliant" : "compliant",
  }));
}

export async function fetchEmployerStatementTransactions(employerId: string) {
  const { data, error } = await supabase
    .from("ce_employer_financial_ledger")
    .select("*")
    .eq("employer_id", employerId)
    .eq("status", "POSTED")
    .order("posted_at", { ascending: true });
  if (error) throw error;

  // Group by fund_type into statement sections
  const transactions = data ?? [];
  const grouped: Record<string, any[]> = {};
  
  transactions.forEach((txn) => {
    const fund = txn.fund_type as string;
    if (!grouped[fund]) grouped[fund] = [];
    grouped[fund].push({
      date: txn.posted_at?.split("T")[0] ?? "",
      period: txn.period,
      description: txn.description,
      transactionType: Number(txn.debit_amount) > 0 ? "DEBIT" : "CREDIT",
      amount: Number(txn.debit_amount) > 0 ? Number(txn.debit_amount) : Number(txn.credit_amount),
    });
  });

  const employerName = transactions[0]?.employer_name ?? employerId;

  return {
    employerId,
    employerName,
    statementPeriodFrom: transactions[0]?.posted_at?.split("T")[0] ?? "",
    statementPeriodTo: transactions[transactions.length - 1]?.posted_at?.split("T")[0] ?? "",
    generatedDate: new Date().toISOString().split("T")[0],
    ssc: grouped["SS"] ?? [],
    ssf: grouped["SS_PENALTY"] ?? [],
    lvc: grouped["LEVY"] ?? [],
    lvf: grouped["LEVY_PENALTY"] ?? [],
    pec: grouped["EI"] ?? [],
    pef: grouped["EI_PENALTY"] ?? [],
  };
}

// ============================================
// VIOLATIONS (ce_violations)
// ============================================

export interface ViolationFilters {
  status?: string;
  priority?: string;
  search?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}

export interface ViolationPage {
  rows: any[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function buildViolationFilterConditions(filters: ViolationFilters) {
  const searchValue = filters.search?.trim();
  const hasActiveFilter = (filters.status && filters.status !== 'ALL') ||
    (filters.priority && filters.priority !== 'ALL') ||
    searchValue;
  const targetMonth = filters.month || (!hasActiveFilter
    ? new Date().toISOString().slice(0, 7)
    : undefined);
  return { searchValue, targetMonth };
}

async function resolveEmployerSearch(searchValue: string): Promise<string[]> {
  const [masterResult, locationResult] = await Promise.all([
    supabase
      .from('er_master')
      .select('regno')
      .or(`regno.ilike.%${searchValue}%,name.ilike.%${searchValue}%`)
      .limit(50),
    supabase
      .from('er_locations')
      .select('regno')
      .ilike('trade_name', `%${searchValue}%`)
      .limit(50),
  ]);
  const ids = new Set<string>();
  masterResult.data?.forEach((r: any) => r.regno && ids.add(r.regno));
  locationResult.data?.forEach((r: any) => r.regno && ids.add(r.regno));
  return Array.from(ids);
}

function applyViolationFilters(
  query: any,
  filters: ViolationFilters,
  searchValue: string | undefined,
  targetMonth: string | undefined,
  employerIds: string[],
) {
  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "ALL") {
    query = query.eq("priority", filters.priority);
  }
  if (searchValue) {
    const escaped = searchValue.replace(/,/g, ' ');
    const orParts = [
      `violation_number.ilike.%${escaped}%`,
      `employer_id.ilike.%${escaped}%`,
      `employer_name.ilike.%${escaped}%`,
      `summary.ilike.%${escaped}%`,
    ];
    if (employerIds.length > 0) {
      orParts.push(`employer_id.in.(${employerIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }
  if (targetMonth) {
    const startDate = `${targetMonth}-01`;
    const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const endDate = nextMonth.toISOString().slice(0, 10);
    query = query.gte("created_at", startDate).lt("created_at", endDate);
  }
  return query;
}

export async function fetchViolationsPaginated(filters: ViolationFilters = {}): Promise<ViolationPage> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const { searchValue, targetMonth } = buildViolationFilterConditions(filters);
  const employerIds = searchValue ? await resolveEmployerSearch(searchValue) : [];

  let countQuery = supabase
    .from("ce_violations")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);

  let dataQuery = supabase
    .from("ce_violations")
    .select("id, violation_number, employer_id, employer_name, status, priority, period_from, total_amount, assigned_to_name, discovered_date, created_at, ce_violation_types(code, name, category), ce_zones(zone_code), ce_assignment_queues(queue_code)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  countQuery = applyViolationFilters(countQuery, filters, searchValue, targetMonth, employerIds);
  dataQuery = applyViolationFilters(dataQuery, filters, searchValue, targetMonth, employerIds);

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  if (countResult.error) throw countResult.error;
  if (dataResult.error) throw dataResult.error;

  return {
    rows: dataResult.data ?? [],
    totalCount: countResult.count ?? 0,
    page,
    pageSize,
  };
}

export async function fetchViolationSummaryCounts(filters: ViolationFilters = {}): Promise<Record<string, number>> {
  const { searchValue, targetMonth } = buildViolationFilterConditions(filters);
  const employerIds = searchValue ? await resolveEmployerSearch(searchValue) : [];

  let query = supabase
    .from("ce_violations")
    .select("status")
    .eq("is_deleted", false);

  query = applyViolationFilters(query, filters, searchValue, targetMonth, employerIds);

  const { data, error } = await query.limit(10000);
  if (error) throw error;

  const counts: Record<string, number> = { total: 0, OPEN: 0, UNDER_REVIEW: 0, ESCALATED: 0 };
  (data ?? []).forEach((row: any) => {
    counts.total++;
    if (row.status in counts) counts[row.status]++;
  });
  return counts;
}

export async function fetchViolations(filters?: ViolationFilters) {
  const result = await fetchViolationsPaginated({ ...filters, page: 1, pageSize: 1000 });
  return result.rows;
}

export async function fetchViolationById(id: string) {
  const { data, error } = await supabase
    .from("ce_violations")
    .select("*, ce_violation_types(code, name, category), ce_zones(zone_code, zone_name), ce_assignment_queues(queue_code, queue_name, queue_type)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
  const hasActiveFilter = (filters?.status && filters.status !== 'ALL') ||
    (filters?.priority && filters.priority !== 'ALL') ||
    searchValue;

  const targetMonth = filters?.month || (!hasActiveFilter
    ? new Date().toISOString().slice(0, 7)
    : undefined);

  const matchedEmployerIds = new Set<string>();

  if (searchValue) {
    const [masterResult, locationResult] = await Promise.all([
      supabase
        .from('er_master')
        .select('regno, name')
        .or(`regno.ilike.%${searchValue}%,name.ilike.%${searchValue}%`)
        .limit(100),
      supabase
        .from('er_locations')
        .select('regno, trade_name')
        .ilike('trade_name', `%${searchValue}%`)
        .limit(100),
    ]);

    if (masterResult.error) throw masterResult.error;
    if (locationResult.error) throw locationResult.error;

    masterResult.data?.forEach((row: any) => row.regno && matchedEmployerIds.add(row.regno));
    locationResult.data?.forEach((row: any) => row.regno && matchedEmployerIds.add(row.regno));
  }

  const allRows: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from("ce_violations")
      .select("*, ce_violation_types(code, name, category), ce_zones(zone_code, zone_name), ce_assignment_queues(queue_code, queue_name, queue_type)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.priority && filters.priority !== "ALL") {
      query = query.eq("priority", filters.priority);
    }
    if (searchValue) {
      const escaped = searchValue.replace(/,/g, ' ');
      const employerIds = Array.from(matchedEmployerIds).filter(Boolean);
      const orParts = [
        `violation_number.ilike.%${escaped}%`,
        `employer_id.ilike.%${escaped}%`,
        `employer_name.ilike.%${escaped}%`,
        `summary.ilike.%${escaped}%`,
      ];

      if (employerIds.length > 0) {
        orParts.push(`employer_id.in.(${employerIds.join(',')})`);
      }

      query = query.or(orParts.join(','));
    }
    if (targetMonth) {
      const startDate = `${targetMonth}-01`;
      const nextMonth = new Date(`${targetMonth}-01T00:00:00Z`);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      const endDate = nextMonth.toISOString().slice(0, 10);
      query = query.gte("created_at", startDate).lt("created_at", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

export async function fetchViolationById(id: string) {
  const { data, error } = await supabase
    .from("ce_violations")
    .select("*, ce_violation_types(code, name, category), ce_zones(zone_code, zone_name), ce_assignment_queues(queue_code, queue_name, queue_type)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
