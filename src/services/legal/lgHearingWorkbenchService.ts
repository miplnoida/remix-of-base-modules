/**
 * Legal Hearing Workbench Service (EPIC-05)
 *
 * Aggregates lg_hearing rows with parent case, court context, evidence readiness,
 * documents readiness, task count and recovery impact for the enterprise
 * Hearing Workbench and Hearing Workspace.
 *
 * Live Supabase data only – no mocks.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HearingRow = Database["public"]["Tables"]["lg_hearing"]["Row"];

export interface HearingWorkbenchRow extends HearingRow {
  lg_case_no?: string | null;
  case_summary?: string | null;
  assigned_officer?: string | null;
  primary_party_name?: string | null;
  primary_party_type?: string | null; // EMPLOYER | IP
  court_name_display?: string | null;
  venue_name_display?: string | null;
  witness_count?: number;
  evidence_ready?: boolean;
  documents_ready_calc?: boolean;
  order_count?: number;
  task_open_count?: number;
  next_hearing_date_calc?: string | null;
}

export interface HearingWorkbenchFilters {
  from?: string;
  to?: string;
  status?: string;
  outcome?: string;
  courtCode?: string;
  officerCode?: string;
  priority?: string;
  search?: string;
  segment?: string; // today | tomorrow | this_week | this_month | adjourned | awaiting_judgment | awaiting_order | documents_missing | high_value | my_hearings | supervisor
  currentUserCode?: string;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function computeSegmentRange(segment?: string): { from?: string; to?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (segment) {
    case "today":
      return { from: isoDate(today), to: isoDate(today) };
    case "tomorrow": {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return { from: isoDate(t), to: isoDate(t) };
    }
    case "this_week": {
      const end = new Date(today); end.setDate(end.getDate() + 7);
      return { from: isoDate(today), to: isoDate(end) };
    }
    case "this_month": {
      const end = new Date(today); end.setDate(end.getDate() + 30);
      return { from: isoDate(today), to: isoDate(end) };
    }
    default:
      return {};
  }
}

export async function listHearingWorkbench(filters: HearingWorkbenchFilters = {}): Promise<HearingWorkbenchRow[]> {
  const segRange = computeSegmentRange(filters.segment);
  const from = filters.from ?? segRange.from;
  const to = filters.to ?? segRange.to;

  let q = supabase
    .from("lg_hearing")
    .select(
      `*, lg_case:lg_case_id(id, lg_case_no, summary, assigned_legal_officer_id, assigned_team_code, primary_entity_type, primary_entity_id)`,
    )
    .order("hearing_date", { ascending: true, nullsFirst: false })
    .limit(1000);

  if (from) q = q.gte("hearing_date", from);
  if (to) q = q.lte("hearing_date", to);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.outcome) q = q.eq("outcome_code", filters.outcome);
  if (filters.courtCode) q = q.eq("court_code", filters.courtCode);
  if (filters.officerCode) q = q.eq("officer_code", filters.officerCode);
  if (filters.priority) q = q.eq("priority", filters.priority);

  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as any[];

  // Segment post-filters
  if (filters.segment === "adjourned") {
    rows = rows.filter((r) => r.status === "ADJOURNED");
  } else if (filters.segment === "awaiting_judgment") {
    rows = rows.filter((r) => r.outcome_code === "JUDGMENT_RESERVED");
  } else if (filters.segment === "awaiting_order") {
    rows = rows.filter((r) => (r.outcome_code === "ORDER_ISSUED" || r.outcome_code === "JUDGMENT_DELIVERED") && (r.order_status ?? "NONE") !== "RECORDED");
  } else if (filters.segment === "documents_missing") {
    rows = rows.filter((r) => !r.documents_ready);
  } else if (filters.segment === "high_value") {
    rows = rows.filter((r) => Number(r.recovery_impact_amount ?? 0) >= 50000);
  } else if (filters.segment === "my_hearings" && filters.currentUserCode) {
    const uc = filters.currentUserCode;
    rows = rows.filter((r) => r.officer_code === uc || r.lead_counsel_code === uc || r.lg_case?.assigned_legal_officer_id === uc);
  }

  // In-memory search across common fields
  if (filters.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter((r) => {
      const hay = [
        r.hearing_number,
        r.lg_case?.lg_case_no,
        r.court_name,
        r.court_file_number,
        r.judge_name,
        r.magistrate_name,
        r.hearing_type_code,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }

  // Enrich with witness count + task count in parallel
  const ids = rows.map((r) => r.id);
  const [attendeesRes, tasksRes, evidenceRes] = await Promise.all([
    ids.length
      ? supabase.from("lg_hearing_attendee").select("lg_hearing_id, attendee_role").in("lg_hearing_id", ids)
      : Promise.resolve({ data: [] as any[] }) as any,
    ids.length
      ? (supabase.from("lg_case_task") as any).select("source_id, status").in("source_id", ids).eq("source_type", "HEARING_ADJOURNMENT")
      : Promise.resolve({ data: [] as any[] }) as any,
    ids.length
      ? (supabase.from("lg_hearing_evidence") as any).select("lg_hearing_id, submitted, accepted").in("lg_hearing_id", ids)
      : Promise.resolve({ data: [] as any[] }) as any,
  ]);

  const witnessCount: Record<string, number> = {};
  ((attendeesRes as any).data ?? []).forEach((a: any) => {
    if ((a.attendee_role || "").toUpperCase() === "WITNESS") {
      witnessCount[a.lg_hearing_id] = (witnessCount[a.lg_hearing_id] ?? 0) + 1;
    }
  });
  const taskCount: Record<string, number> = {};
  ((tasksRes as any).data ?? []).forEach((t: any) => {
    if (["OPEN", "IN_PROGRESS", "BLOCKED"].includes(t.status ?? "")) {
      taskCount[t.source_id] = (taskCount[t.source_id] ?? 0) + 1;
    }
  });
  const evidenceReady: Record<string, boolean> = {};
  const evidenceGroups: Record<string, any[]> = {};
  ((evidenceRes as any).data ?? []).forEach((e: any) => {
    (evidenceGroups[e.lg_hearing_id] ||= []).push(e);
  });
  Object.entries(evidenceGroups).forEach(([hid, list]) => {
    evidenceReady[hid] = list.length > 0 && list.every((e: any) => e.submitted === true);
  });

  return rows.map((r) => ({
    ...(r as HearingRow),
    lg_case_no: r.lg_case?.lg_case_no ?? null,
    case_summary: r.lg_case?.summary ?? null,
    assigned_officer: r.officer_code ?? r.lg_case?.assigned_legal_officer_id ?? null,
    primary_party_name: r.lg_case?.primary_entity_id ?? null,
    primary_party_type: r.lg_case?.primary_entity_type ?? null,
    court_name_display: r.court_name ?? r.court_code ?? null,
    venue_name_display: r.court_room ?? r.venue_code ?? null,
    witness_count: witnessCount[r.id] ?? 0,
    evidence_ready: evidenceReady[r.id] ?? false,
    documents_ready_calc: !!r.documents_ready,
    order_count: r.outcome_code === "ORDER_ISSUED" || r.outcome_code === "JUDGMENT_DELIVERED" ? 1 : 0,
    task_open_count: taskCount[r.id] ?? 0,
    next_hearing_date_calc: r.next_hearing_date ?? null,
  }));
}

// -------------------- Readiness & Recovery Impact (rule-based) --------------------

export type ReadinessLevel = "READY" | "NEARLY_READY" | "NOT_READY";
export interface ReadinessResult {
  level: ReadinessLevel;
  percent: number;
  missing: string[];
  checks: { code: string; label: string; ok: boolean }[];
}

export function evaluateReadiness(r: HearingWorkbenchRow): ReadinessResult {
  const checks = [
    { code: "MATTER_REVIEWED", label: "Matter reviewed", ok: !!r.lg_case_no },
    { code: "DOCS_COMPLETE", label: "Documents complete", ok: !!r.documents_ready },
    { code: "EVIDENCE_READY", label: "Evidence ready", ok: !!r.evidence_ready || (r.evidence_status ?? "").toUpperCase() === "READY" },
    { code: "WITNESSES_CONFIRMED", label: "Witnesses confirmed", ok: (r.witness_count ?? 0) > 0 },
    { code: "COUNSEL_ASSIGNED", label: "Counsel assigned", ok: !!r.lead_counsel_code },
    { code: "RECOVERY_UPDATED", label: "Recovery figures updated", ok: r.recovery_impact_amount != null },
    { code: "ORDERS_REVIEWED", label: "Orders reviewed", ok: (r.order_status ?? "NONE") !== "PENDING" },
    { code: "TASKS_COMPLETE", label: "Prep tasks complete", ok: (r.task_open_count ?? 0) === 0 },
  ];
  const done = checks.filter((c) => c.ok).length;
  const percent = Math.round((done / checks.length) * 100);
  const level: ReadinessLevel = percent >= 90 ? "READY" : percent >= 60 ? "NEARLY_READY" : "NOT_READY";
  return { level, percent, missing: checks.filter((c) => !c.ok).map((c) => c.label), checks };
}

export type RecoveryImpact = "POSITIVE" | "NEUTRAL" | "DELAYED" | "CRITICAL";
export interface RecoveryImpactResult { impact: RecoveryImpact; reason: string }

export function evaluateRecoveryImpact(r: HearingWorkbenchRow): RecoveryImpactResult {
  const amt = Number(r.recovery_impact_amount ?? 0);
  const adjourned = (r.adjournment_count ?? 0) > 0 || r.status === "ADJOURNED";
  if (r.status === "CANCELLED" || r.status === "NO_SHOW") return { impact: "CRITICAL", reason: "Hearing cancelled / no-show halts recovery." };
  if (r.outcome_code === "JUDGMENT_DELIVERED" || r.outcome_code === "ORDER_ISSUED") return { impact: "POSITIVE", reason: "Judgment or order supports recovery." };
  if (adjourned && amt >= 50000) return { impact: "CRITICAL", reason: "High-value matter adjourned — recovery at risk." };
  if (adjourned) return { impact: "DELAYED", reason: "Adjournment delayed recovery." };
  if (r.outcome_code === "JUDGMENT_RESERVED") return { impact: "DELAYED", reason: "Judgment reserved — recovery pending." };
  return { impact: "NEUTRAL", reason: "No recovery change." };
}

// -------------------- Summary Cards --------------------

export interface HearingWorkbenchSummary {
  today: number;
  thisWeek: number;
  upcoming: number;
  adjourned: number;
  awaitingOutcome: number;
  judgmentReserved: number;
  ordersPending: number;
  cancelled: number;
  upcoming30d: number;
  notReady: number;
  highValue: number;
  recoveryImpactTotal: number;
  avgAdjournmentRate: number; // percent
  officerWorkload: number; // distinct officers today+week
}

export function summarize(rows: HearingWorkbenchRow[]): HearingWorkbenchSummary {
  const today = isoDate(new Date());
  const in7 = isoDate(new Date(Date.now() + 7 * 86400_000));
  const in30 = isoDate(new Date(Date.now() + 30 * 86400_000));
  const upcoming = rows.filter((r) => r.hearing_date && r.hearing_date >= today && r.status === "SCHEDULED");
  const withAdj = rows.filter((r) => (r.adjournment_count ?? 0) > 0).length;
  const notReady = rows.filter((r) => r.hearing_date && r.hearing_date >= today && evaluateReadiness(r).level !== "READY").length;
  const officers = new Set(upcoming.map((r) => r.officer_code).filter(Boolean));

  return {
    today: rows.filter((r) => r.hearing_date === today && r.status === "SCHEDULED").length,
    thisWeek: rows.filter((r) => r.hearing_date && r.hearing_date >= today && r.hearing_date <= in7 && r.status === "SCHEDULED").length,
    upcoming: upcoming.length,
    adjourned: rows.filter((r) => r.status === "ADJOURNED").length,
    awaitingOutcome: rows.filter((r) => r.status === "SCHEDULED" && r.hearing_date && r.hearing_date < today).length,
    judgmentReserved: rows.filter((r) => r.outcome_code === "JUDGMENT_RESERVED").length,
    ordersPending: rows.filter((r) => (r.outcome_code === "ORDER_ISSUED" || r.outcome_code === "JUDGMENT_DELIVERED") && (r.order_status ?? "NONE") !== "RECORDED").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED" || r.status === "NO_SHOW").length,
    upcoming30d: rows.filter((r) => r.hearing_date && r.hearing_date >= today && r.hearing_date <= in30).length,
    notReady,
    highValue: rows.filter((r) => Number(r.recovery_impact_amount ?? 0) >= 50000).length,
    recoveryImpactTotal: rows.reduce((s, r) => s + Number(r.recovery_impact_amount ?? 0), 0),
    avgAdjournmentRate: rows.length ? Math.round((withAdj / rows.length) * 100) : 0,
    officerWorkload: officers.size,
  };
}

// -------------------- Court Sessions --------------------

export interface CourtSession {
  key: string;
  court: string;
  judge: string;
  date: string;
  session: "MORNING" | "AFTERNOON" | "FULL_DAY";
  hearings: HearingWorkbenchRow[];
}

export function groupIntoSessions(rows: HearingWorkbenchRow[]): CourtSession[] {
  const map = new Map<string, CourtSession>();
  for (const r of rows) {
    if (!r.hearing_date) continue;
    const time = r.hearing_time ?? "";
    const hh = parseInt(time.slice(0, 2), 10);
    const session: CourtSession["session"] = isNaN(hh) ? "FULL_DAY" : hh < 12 ? "MORNING" : "AFTERNOON";
    const court = r.court_name_display ?? r.court_code ?? "Unknown Court";
    const judge = r.judge_name || r.magistrate_name || "Unassigned";
    const key = [court, judge, r.hearing_date, session].join("|");
    if (!map.has(key)) map.set(key, { key, court, judge, date: r.hearing_date, session, hearings: [] });
    map.get(key)!.hearings.push(r);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.session.localeCompare(b.session)));
}


// -------------------- Detail loaders (Workspace) --------------------

export async function getHearing(id: string): Promise<HearingWorkbenchRow | null> {
  const { data, error } = await supabase
    .from("lg_hearing")
    .select(`*, lg_case:lg_case_id(id, lg_case_no, summary, assigned_legal_officer_id, assigned_team_code, primary_entity_type, primary_entity_id)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const enriched = await listHearingWorkbench({ from: data.hearing_date ?? undefined, to: data.hearing_date ?? undefined });
  const match = enriched.find((r) => r.id === id);
  return match ?? (data as HearingWorkbenchRow);
}

export async function listAttendees(hearingId: string) {
  const { data, error } = await supabase.from("lg_hearing_attendee").select("*").eq("lg_hearing_id", hearingId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listEvidence(hearingId: string) {
  const { data, error } = await supabase.from("lg_hearing_evidence").select("*").eq("lg_hearing_id", hearingId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listPrepChecklist(hearingId: string) {
  const { data, error } = await supabase.from("lg_hearing_prep_checklist").select("*").eq("lg_hearing_id", hearingId).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listAdjournments(hearingId: string) {
  const { data, error } = await supabase.from("lg_hearing_adjournment").select("*").eq("lg_hearing_id", hearingId).order("adjournment_number");
  if (error) throw error;
  return data ?? [];
}

export async function listCommunications(hearingId: string) {
  const { data, error } = await supabase.from("lg_hearing_communication").select("*").eq("lg_hearing_id", hearingId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listRelatedTasks(hearingId: string) {
  const { data, error } = await (supabase.from("lg_case_task") as any)
    .select("*")
    .eq("source_id", hearingId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

// -------------------- Default Prep Checklist --------------------

export const DEFAULT_PREP_ITEMS: { code: string; label: string; mandatory: boolean }[] = [
  { code: "MATTER_REVIEWED", label: "Matter reviewed", mandatory: true },
  { code: "DOCS_UPLOADED", label: "Documents uploaded", mandatory: true },
  { code: "EVIDENCE_COMPLETE", label: "Evidence complete", mandatory: true },
  { code: "WITNESS_CONFIRMED", label: "Witness confirmed", mandatory: true },
  { code: "NOTICE_SERVED", label: "Notice served", mandatory: true },
  { code: "COUNSEL_ASSIGNED", label: "Counsel assigned", mandatory: true },
  { code: "RECOVERY_FIGURES_UPDATED", label: "Recovery figures updated", mandatory: true },
  { code: "ORDERS_REVIEWED", label: "Orders reviewed", mandatory: false },
];

export async function ensureDefaultChecklist(hearingId: string) {
  const existing = await listPrepChecklist(hearingId);
  if (existing.length > 0) return existing;
  const rows = DEFAULT_PREP_ITEMS.map((i, idx) => ({
    lg_hearing_id: hearingId,
    item_code: i.code,
    item_label: i.label,
    mandatory: i.mandatory,
    sort_order: idx,
    completed: false,
  }));
  const { data, error } = await supabase.from("lg_hearing_prep_checklist").insert(rows).select("*");
  if (error) throw error;
  return data ?? [];
}

// -------------------- Conflict detection --------------------

export interface ConflictWarning {
  type: "OFFICER_DOUBLE_BOOKING" | "COURT_DOUBLE_BOOKING" | "MATTER_DUPLICATE" | "WITNESS_CONFLICT";
  message: string;
}

export async function detectConflicts(h: {
  id?: string;
  lg_case_id?: string | null;
  hearing_date?: string | null;
  hearing_time?: string | null;
  officer_code?: string | null;
  court_code?: string | null;
}): Promise<ConflictWarning[]> {
  const warnings: ConflictWarning[] = [];
  if (!h.hearing_date) return warnings;

  let q: any = supabase.from("lg_hearing").select("id, officer_code, court_code, lg_case_id, hearing_time").eq("hearing_date", h.hearing_date);
  if (h.id) q = q.neq("id", h.id);
  const { data } = await q;
  const rows = (data ?? []) as any[];

  if (h.officer_code && rows.some((r) => r.officer_code === h.officer_code && r.hearing_time === h.hearing_time)) {
    warnings.push({ type: "OFFICER_DOUBLE_BOOKING", message: `Officer ${h.officer_code} already has a hearing at this time.` });
  }
  if (h.court_code && rows.some((r) => r.court_code === h.court_code && r.hearing_time === h.hearing_time)) {
    warnings.push({ type: "COURT_DOUBLE_BOOKING", message: `Court ${h.court_code} already has a hearing at this time.` });
  }
  if (h.lg_case_id && rows.some((r) => r.lg_case_id === h.lg_case_id)) {
    warnings.push({ type: "MATTER_DUPLICATE", message: `Matter already has a hearing scheduled on this date.` });
  }
  return warnings;
}
