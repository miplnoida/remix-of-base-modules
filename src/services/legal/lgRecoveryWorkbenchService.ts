import { supabase } from "@/integrations/supabase/client";

/**
 * EPIC-02 — Legal Recovery Workbench data service.
 *
 * Bulk-aggregates recovery figures across live tables:
 *   lg_case, lg_case_action, lg_fee_charge, lg_payment_arrangement_link,
 *   lg_hearing, lg_case_task, er_master, ip_master, profiles.
 *
 * No mocks. Missing figures are surfaced as 0 (not fabricated).
 */

const sb = supabase as any;

export interface RecoveryWorkbenchRow {
  id: string;
  matter_no: string;
  source_module: string | null;
  source_reference: string | null;
  party_type: string | null;
  party_ref: string | null;      // Employer No / SSN
  party_name: string | null;
  recovery_type: string | null;  // case_type_code
  principal_due: number;
  interest: number;
  penalty: number;
  court_cost: number;
  legal_cost: number;
  total_recoverable: number;
  total_paid: number;
  outstanding_balance: number;
  recovery_pct: number;
  legal_status: string | null;
  case_stage: string | null;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  team_code: string | null;
  territory: string | null;
  next_action_date: string | null;
  next_hearing_date: string | null;
  arrangement_status: string | null;   // ACTIVE / BREACHED / NONE
  breach_status: string;               // YES / NO
  ageing_days: number;                 // since opened_date
  ageing_bucket: "0-30" | "31-60" | "61-90" | "91-180" | "180+" | "n/a";
  sla_status: string;                  // aggregate over open tasks
  last_activity: string | null;        // most recent updated_at
  // navigation helpers
  employer_id: string | null;
  person_id: string | null;
}

function ageingBucket(days: number): RecoveryWorkbenchRow["ageing_bucket"] {
  if (days < 0 || !Number.isFinite(days)) return "n/a";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 180) return "91-180";
  return "180+";
}

function daysBetween(from: string | null | undefined, to: Date): number {
  if (!from) return -1;
  const f = new Date(from);
  if (Number.isNaN(f.getTime())) return -1;
  return Math.floor((to.getTime() - f.getTime()) / 86_400_000);
}

const COURT_COST_RE = /COURT_COST|COURT_FEE/i;
const LEGAL_COST_RE = /LEGAL_COST|LEGAL_FEE|ATTORNEY|SOLICITOR/i;

export async function listRecoveryWorkbenchRows(): Promise<RecoveryWorkbenchRow[]> {
  // 1) Cases — the anchor
  const { data: cases = [], error } = await sb
    .from("lg_case")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  if (!cases.length) return [];

  const caseIds: string[] = cases.map((c: any) => c.id);
  const employerIds = Array.from(new Set(cases.map((c: any) => c.employer_id).filter(Boolean)));
  const personIds = Array.from(new Set(cases.map((c: any) => c.person_id).filter(Boolean)));
  const officerIds = Array.from(new Set(cases.map((c: any) => c.assigned_legal_officer_id).filter(Boolean)));

  // 2) Bulk parallel fetch of all supporting tables
  const [actionsRes, feesRes, arrLinksRes, hearingsRes, tasksRes, employersRes, personsRes, profilesRes] = await Promise.all([
    sb.from("lg_case_action")
      .select("case_id, principal_amount, interest_amount, penalty_amount, cost_amount, total_amount, amount_paid, outstanding_amount, status, updated_at")
      .in("case_id", caseIds),
    sb.from("lg_fee_charge")
      .select("lg_case_id, fee_head_code, amount, net_amount, waived_amount, status, posting_status, updated_at, created_at")
      .in("lg_case_id", caseIds),
    sb.from("lg_payment_arrangement_link")
      .select("lg_case_id, active, arranged_amount, paid_amount, outstanding_amount, link_type, updated_at")
      .in("lg_case_id", caseIds),
    sb.from("lg_hearing")
      .select("lg_case_id, hearing_date, scheduled_at, next_hearing_date, status")
      .in("lg_case_id", caseIds),
    sb.from("lg_case_task")
      .select("lg_case_id, sla_status, status, due_date, updated_at")
      .in("lg_case_id", caseIds),
    employerIds.length
      ? sb.from("er_master").select("id, regno, name, trade_name").in("id", employerIds)
      : Promise.resolve({ data: [] }),
    personIds.length
      ? sb.from("ip_master").select("id, ssn, firstname, surname, middle_name").in("id", personIds)
      : Promise.resolve({ data: [] }),
    officerIds.length
      ? sb.from("profiles").select("id, user_code, full_name").in("id", officerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actions = (actionsRes.data ?? []) as any[];
  const fees = (feesRes.data ?? []) as any[];
  const arrLinks = (arrLinksRes.data ?? []) as any[];
  const hearings = (hearingsRes.data ?? []) as any[];
  const tasks = (tasksRes.data ?? []) as any[];
  const employers = (employersRes.data ?? []) as any[];
  const persons = (personsRes.data ?? []) as any[];
  const profiles = (profilesRes.data ?? []) as any[];

  const employerById = new Map(employers.map((e) => [e.id, e]));
  const personById = new Map(persons.map((p) => [p.id, p]));
  const officerById = new Map(profiles.map((p) => [p.id, p]));

  // Group by case id
  const byCase = <T,>(arr: T[], key: keyof T) => {
    const m = new Map<string, T[]>();
    for (const r of arr) {
      const k = (r as any)[key] as string;
      if (!k) continue;
      const list = m.get(k);
      if (list) list.push(r);
      else m.set(k, [r]);
    }
    return m;
  };

  const actionsByCase = byCase(actions, "case_id");
  const feesByCase = byCase(fees, "lg_case_id");
  const arrByCase = byCase(arrLinks, "lg_case_id");
  const hearingsByCase = byCase(hearings, "lg_case_id");
  const tasksByCase = byCase(tasks, "lg_case_id");

  const now = new Date();

  const rows: RecoveryWorkbenchRow[] = cases.map((c: any) => {
    const a = actionsByCase.get(c.id) ?? [];
    const f = feesByCase.get(c.id) ?? [];
    const links = arrByCase.get(c.id) ?? [];
    const hs = hearingsByCase.get(c.id) ?? [];
    const ts = tasksByCase.get(c.id) ?? [];

    // Action-derived debt (arrears actions carry these fields; benefit-overpayment actions may not)
    const principal = a.reduce((s, r) => s + Number(r.principal_amount ?? 0), 0);
    const interest = a.reduce((s, r) => s + Number(r.interest_amount ?? 0), 0);
    const penalty = a.reduce((s, r) => s + Number(r.penalty_amount ?? 0), 0);
    const actionCourtCost = a.reduce((s, r) => s + Number(r.cost_amount ?? 0), 0);
    const actionPaid = a.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
    const actionTotal = a.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

    // Fee charge split (posted charges only)
    const postedFees = f.filter((x) => String(x.posting_status ?? "").toUpperCase() === "POSTED" || !x.posting_status);
    const feeCourt = postedFees
      .filter((x) => COURT_COST_RE.test(String(x.fee_head_code ?? "")))
      .reduce((s, x) => s + Number(x.net_amount ?? x.amount ?? 0), 0);
    const feeLegal = postedFees
      .filter((x) => LEGAL_COST_RE.test(String(x.fee_head_code ?? "")))
      .reduce((s, x) => s + Number(x.net_amount ?? x.amount ?? 0), 0);
    const feeOther = postedFees
      .filter((x) => !COURT_COST_RE.test(String(x.fee_head_code ?? "")) && !LEGAL_COST_RE.test(String(x.fee_head_code ?? "")))
      .reduce((s, x) => s + Number(x.net_amount ?? x.amount ?? 0), 0);

    const court_cost = actionCourtCost + feeCourt;
    const legal_cost = feeLegal;

    // Fall back to lg_case.claim_amount if no action rows exist
    const principalEff = principal || (a.length === 0 ? Number(c.claim_amount ?? 0) : 0);

    const total_recoverable = principalEff + interest + penalty + court_cost + legal_cost + feeOther;

    // Paid: sum from arrangement links (most reliable) plus action.amount_paid when arrangements not linked
    const arrPaid = links.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0);
    const total_paid = arrPaid > 0 ? arrPaid : actionPaid;

    const derivedOutstanding = Math.max(0, total_recoverable - total_paid);
    // Prefer live snapshot if service already has one, else derive.
    const snapOutstanding = Number(c.outstanding_amount_snapshot ?? c.total_outstanding ?? 0);
    const outstanding_balance = derivedOutstanding > 0
      ? derivedOutstanding
      : (snapOutstanding > 0 ? snapOutstanding : Math.max(0, actionTotal - actionPaid));

    const recovery_pct = total_recoverable > 0
      ? Math.min(100, (total_paid / total_recoverable) * 100)
      : 0;

    // Arrangement + breach status
    const activeArr = links.find((r) => r.active) ?? links[0];
    const arrangement_status = activeArr
      ? (Number(activeArr.outstanding_amount ?? 0) > 0 ? "ACTIVE" : "COMPLETED")
      : "NONE";
    const anyOverdueInstallment = links.some((r) => Number(r.outstanding_amount ?? 0) > 0 && r.active === false);
    const breach_status = anyOverdueInstallment ? "YES" : "NO";

    // Hearings
    const nextHearing = hs
      .map((h) => h.next_hearing_date ?? h.hearing_date ?? h.scheduled_at ?? null)
      .filter(Boolean)
      .sort()
      .find((d: string) => new Date(d) >= now) ?? c.next_hearing_date ?? null;

    // SLA — worst open task status wins
    const openTasks = ts.filter((t) => !["CLOSED", "DONE", "COMPLETED", "CANCELLED"].includes(String(t.status ?? "").toUpperCase()));
    const slaRank: Record<string, number> = { OVERDUE: 3, AT_RISK: 2, ON_TIME: 1 };
    let sla_status = openTasks.length === 0 ? "NONE" : "ON_TIME";
    for (const t of openTasks) {
      const s = String(t.sla_status ?? "").toUpperCase();
      if ((slaRank[s] ?? 0) > (slaRank[sla_status] ?? 0)) sla_status = s;
    }

    // Party ref/name
    const emp = c.employer_id ? employerById.get(c.employer_id) : null;
    const ip = c.person_id ? personById.get(c.person_id) : null;
    let party_type: string | null = c.primary_entity_type ?? (emp ? "EMPLOYER" : ip ? "INSURED_PERSON" : null);
    let party_ref: string | null = emp?.regno ?? c.employer_account_no ?? ip?.ssn ?? null;
    let party_name: string | null =
      emp?.trade_name ?? emp?.name ?? c.legacy_employer_name ??
      (ip ? [ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(" ") : null) ??
      c.legacy_person_name ?? c.legacy_primary_entity_name ?? null;

    const officer = c.assigned_legal_officer_id ? officerById.get(c.assigned_legal_officer_id) : null;

    // Ageing
    const openedRef = c.opened_date ?? c.created_at ?? null;
    const ageing_days = daysBetween(openedRef, now);

    // Last activity: max updated_at across case + supporting rows
    const lastActivity = [
      c.updated_at,
      ...a.map((r) => r.updated_at),
      ...f.map((r) => r.updated_at ?? r.created_at),
      ...links.map((r) => r.updated_at),
      ...ts.map((r) => r.updated_at),
    ]
      .filter(Boolean)
      .sort()
      .pop() ?? null;

    return {
      id: c.id,
      matter_no: c.lg_case_no,
      source_module: c.source_module ?? null,
      source_reference: c.court_case_no ?? c.legacy_case_no ?? c.source_record_id ?? null,
      party_type,
      party_ref,
      party_name,
      recovery_type: c.case_type_code ?? null,
      principal_due: principalEff,
      interest,
      penalty,
      court_cost,
      legal_cost,
      total_recoverable,
      total_paid,
      outstanding_balance,
      recovery_pct,
      legal_status: c.status_code ?? null,
      case_stage: c.current_stage_code ?? null,
      assigned_officer_id: c.assigned_legal_officer_id ?? null,
      assigned_officer_name: officer?.full_name ?? null,
      team_code: c.assigned_team_code ?? null,
      territory: c.country_code ?? null,
      next_action_date: c.next_action_due_date ?? null,
      next_hearing_date: nextHearing ?? null,
      arrangement_status,
      breach_status,
      ageing_days,
      ageing_bucket: ageingBucket(ageing_days),
      sla_status,
      last_activity: lastActivity,
      employer_id: c.employer_id ?? null,
      person_id: c.person_id ?? null,
    };
  });

  return rows;
}
