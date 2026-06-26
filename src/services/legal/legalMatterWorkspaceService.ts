/**
 * Legal Matter Workspace service — Phase 1, read-only resolver.
 *
 * Joins legal_referral / lg_case_intake / lg_case / la_advice_request together
 * with assignment, party, SLA, and activity counts to produce a unified
 * `LegalMatterWorkspace` DTO. All other tables stay untouched.
 *
 * No DB schema changes. No mutations. Permissions are computed from a
 * `LegalCapability` argument passed by the caller (so this stays React-free).
 */

import { supabase } from "@/integrations/supabase/client";
import type { LegalCapability } from "@/hooks/legal/useLegalCapability";
import type {
  LegalMatterCategory,
  LegalMatterLifecycleObjectType,
  LegalMatterOverallStatus,
  LegalMatterSlaStatus,
  LegalMatterWorkspace,
  LegalMatterWorkspaceFilters,
  LegalMatterWorkspacePermissions,
  LegalMatterWorkspaceUserContext,
} from "@/types/legalMatterWorkspace";
import { LMW_FALLBACK } from "@/types/legalMatterWorkspace";

const sb = supabase as any;

// ---------- helpers ---------------------------------------------------------

function categoryFor(
  sourceModule: string | null | undefined,
  caseTypeCode: string | null | undefined,
  lifecycle: LegalMatterLifecycleObjectType,
): LegalMatterCategory {
  if (lifecycle === "ADVICE_REQUEST") return "ADVISORY";
  const sm = (sourceModule ?? "").toUpperCase();
  if (sm === "BENEFITS") return "BENEFITS";
  if (sm === "COMPLIANCE") return "COMPLIANCE";
  const ct = (caseTypeCode ?? "").toUpperCase();
  if (ct.includes("CONTRACT")) return "CONTRACT";
  if (ct.includes("ENFORCE") || ct.includes("PROSECUT") || ct.includes("RECOVER")) {
    return "ENFORCEMENT";
  }
  if (sm === "LEGAL") return "INTERNAL";
  return "ENFORCEMENT";
}

function overallStatusFor(
  lifecycle: LegalMatterLifecycleObjectType,
  referralStatus: string | null,
  caseStatus: string | null,
  pendingInfoCount: number,
): LegalMatterOverallStatus {
  if (caseStatus) {
    const cs = caseStatus.toUpperCase();
    if (cs.startsWith("CLOSED") || cs === "CLOSED") return "CLOSED";
    return "CASE_OPEN";
  }
  if (!referralStatus) return "NEW";
  const rs = referralStatus.toUpperCase();
  if (rs === "REJECTED") return "REJECTED";
  if (rs === "CLOSED") return "CLOSED";
  if (rs === "LEGAL_CASE_CREATED") return "CASE_OPEN";
  if (rs === "ACCEPTED") return "ACCEPTED";
  if (rs === "INFO_REQUESTED" || pendingInfoCount > 0) return "WAITING_ON_SOURCE";
  if (rs === "SUBMITTED_TO_LEGAL") return "NEW";
  if (lifecycle === "ADVICE_REQUEST") return "IN_PROGRESS";
  return "WAITING_ON_LEGAL";
}

function slaStatusOf(
  due: string | null,
  rawStatus: string | null,
): { status: LegalMatterSlaStatus; overdueDays: number | null } {
  if (rawStatus === "ESCALATED") {
    return { status: "ESCALATED", overdueDays: dueOverdueDays(due) };
  }
  if (!due) return { status: null, overdueDays: null };
  const overdue = dueOverdueDays(due);
  if (overdue == null) return { status: (rawStatus as LegalMatterSlaStatus) ?? "ON_TIME", overdueDays: null };
  if (overdue > 0) return { status: "OVERDUE", overdueDays: overdue };
  if (overdue >= -2) return { status: "AT_RISK", overdueDays: overdue };
  return { status: "ON_TIME", overdueDays: overdue };
}

function dueOverdueDays(due: string | null): number | null {
  if (!due) return null;
  const diff = Date.now() - new Date(due).getTime();
  return Math.floor(diff / 86_400_000);
}

function buildNavigation(o: {
  lifecycle: LegalMatterLifecycleObjectType;
  referralId: string | null;
  intakeId: string | null;
  caseId: string | null;
  adviceId: string | null;
  sourceModule: string | null;
  sourceRecordId: string | null;
}) {
  const referralUrl = o.referralId ? `/legal/referrals-workbench/${o.referralId}` : null;
  const intakeUrl = o.intakeId ? `/legal/intake/${o.intakeId}` : null;
  const caseUrl = o.caseId ? `/legal/cases/${o.caseId}` : null;
  const adviceUrl = o.adviceId ? `/legal/advice/${o.adviceId}` : null;
  const openUrl = caseUrl ?? intakeUrl ?? adviceUrl ?? referralUrl ?? "/legal/referrals-workbench";

  let sourceUrl: string | null = null;
  if (o.sourceModule && o.sourceRecordId) {
    const sm = o.sourceModule.toUpperCase();
    if (sm === "BENEFITS") sourceUrl = `/benefits/cases/${o.sourceRecordId}`;
    else if (sm === "COMPLIANCE") sourceUrl = `/compliance/cases/${o.sourceRecordId}`;
  }

  return { open_url: openUrl, source_url: sourceUrl, case_url: caseUrl, intake_url: intakeUrl, referral_url: referralUrl };
}

function buildPermissions(
  capability: LegalCapability | null | undefined,
  lifecycle: LegalMatterLifecycleObjectType,
  overall: LegalMatterOverallStatus,
): LegalMatterWorkspacePermissions {
  const cap = capability ?? null;
  const isReadOnly = !!cap?.isReadOnly;
  const isLegal = !!cap?.isLegal;
  const terminal = overall === "CLOSED" || overall === "REJECTED";

  const allowMutate = isLegal && !isReadOnly && !terminal;
  const canAcceptReject = allowMutate && lifecycle === "REFERRAL" && (overall === "NEW" || overall === "WAITING_ON_LEGAL" || overall === "WAITING_ON_SOURCE");
  const canCreateCase = allowMutate && lifecycle !== "CASE" && overall !== "CASE_OPEN" && (cap?.canAcceptReferral ?? false);

  return {
    can_view: isLegal || isReadOnly,
    can_request_info: allowMutate && (cap?.canRequestInfo ?? false) && lifecycle === "REFERRAL",
    can_accept: canAcceptReject && (cap?.canAcceptReferral ?? false),
    can_reject: canAcceptReject && (cap?.canAcceptReferral ?? false),
    can_create_case: canCreateCase,
    can_reassign: allowMutate && (cap?.canReassignCase ?? false),
    can_generate_letter: allowMutate && (cap?.canDraftLetter ?? false),
    can_upload_document: allowMutate && (cap?.canUploadDocument ?? false),
  };
}

// ---------- bulk loaders ----------------------------------------------------

interface AggregateMaps {
  intake: Map<string, any>;
  cases: Map<string, any>;
  assignments: Map<string, any[]>;
  profiles: Map<string, any>;
  teams: Map<string, any>;
  workbaskets: Map<string, any>;
  employers: Map<string, any>;
  insuredPersons: Map<string, any>;
  claims: Map<string, any>;
  openInfoByReferral: Map<string, any>;
  documentCounts: Map<string, number>; // by legal_case_id
  letterCounts: Map<string, number>;
  actionCounts: Map<string, number>;
  taskCounts: Map<string, number>;
  latestActivity: Map<string, any>;
}

async function loadAggregates(referrals: any[]): Promise<AggregateMaps> {
  const intakeIds = uniq(referrals.map((r) => r.lg_intake_id));
  const caseIds = uniq(referrals.map((r) => r.legal_case_id));
  const employerIds = uniq(
    referrals
      .filter((r) => (r.primary_entity_type ?? "").toUpperCase() === "EMPLOYER")
      .map((r) => r.primary_entity_id),
  );
  const ipIds = uniq(
    referrals
      .filter((r) => (r.primary_entity_type ?? "").toUpperCase() === "INSURED_PERSON" || (r.primary_entity_type ?? "").toUpperCase() === "PERSON")
      .map((r) => r.primary_entity_id),
  );
  const claimIds = uniq(
    referrals
      .filter((r) => (r.primary_entity_type ?? "").toUpperCase() === "CLAIM")
      .map((r) => r.primary_entity_id),
  );

  const [
    intakeRows,
    caseRows,
    assignmentRows,
    employerRows,
    ipRows,
    claimRows,
    infoRequestRows,
    docRows,
    actionRows,
    taskRows,
    activityRows,
  ] = await Promise.all([
    intakeIds.length
      ? sb.from("lg_case_intake").select("id,matter_type_code,recommended_case_type_code,recommended_stage_code,recommended_team_code,recommended_workbasket_code,intake_status,created_at").in("id", intakeIds)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_case").select("id,case_type_code,current_stage_code,assigned_legal_officer_id,assigned_team_code,status_code,lg_case_no,created_at").in("id", caseIds)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_case_assignment").select("lg_case_id,assigned_to_user_id,assigned_at,is_current,workbasket_code,team_code").in("lg_case_id", caseIds).order("assigned_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    employerIds.length ? sb.from("au_er_master").select("id,er_no,er_name").in("id", employerIds) : Promise.resolve({ data: [] }),
    ipIds.length ? sb.from("au_ip_master").select("id,ssn,full_name,first_name,last_name").in("id", ipIds) : Promise.resolve({ data: [] }),
    claimIds.length ? sb.from("au_cl_head").select("id,cl_no").in("id", claimIds) : Promise.resolve({ data: [] }),
    referrals.length
      ? sb.from("legal_referral_info_request").select("legal_referral_id,due_date,reminder_at,escalation_at,sla_status,status,updated_at,created_at").eq("status", "PENDING_SOURCE_RESPONSE").in("legal_referral_id", referrals.map((r) => r.id))
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_document_link").select("lg_case_id,document_type_code,created_at").in("lg_case_id", caseIds)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_case_action").select("lg_case_id,status_code,action_type_code").in("lg_case_id", caseIds)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_case_task").select("lg_case_id,status_code").in("lg_case_id", caseIds)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? sb.from("lg_case_activity").select("lg_case_id,activity_type,actor_user_id,created_at").in("lg_case_id", caseIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Profiles + teams + workbaskets — resolve from collected ids.
  const officerIds = new Set<string>();
  for (const c of (caseRows.data ?? []) as any[]) if (c.assigned_legal_officer_id) officerIds.add(c.assigned_legal_officer_id);
  for (const a of (assignmentRows.data ?? []) as any[]) if (a.assigned_to_user_id) officerIds.add(a.assigned_to_user_id);

  const teamCodes = uniq([
    ...referrals.map((r) => r.legal_team_code),
    ...((caseRows.data ?? []) as any[]).map((c) => c.assigned_team_code),
  ]);
  const workbasketCodes = uniq([
    ...referrals.map((r) => r.legal_workbasket_code),
    ...((assignmentRows.data ?? []) as any[]).map((a) => a.workbasket_code),
  ]);

  const [profileRows, teamRows, workbasketRows] = await Promise.all([
    officerIds.size ? sb.from("profiles").select("id,user_code,full_name").in("id", Array.from(officerIds)) : Promise.resolve({ data: [] }),
    teamCodes.length ? sb.from("lg_team").select("team_code,team_name").in("team_code", teamCodes) : Promise.resolve({ data: [] }),
    workbasketCodes.length ? sb.from("lg_team_workbasket").select("workbasket_code,workbasket_name").in("workbasket_code", workbasketCodes) : Promise.resolve({ data: [] }),
  ]);

  const out: AggregateMaps = {
    intake: indexBy(intakeRows.data, "id"),
    cases: indexBy(caseRows.data, "id"),
    assignments: groupBy(assignmentRows.data, "lg_case_id"),
    profiles: indexBy(profileRows.data, "id"),
    teams: indexBy(teamRows.data, "team_code"),
    workbaskets: indexBy(workbasketRows.data, "workbasket_code"),
    employers: indexBy(employerRows.data, "id"),
    insuredPersons: indexBy(ipRows.data, "id"),
    claims: indexBy(claimRows.data, "id"),
    openInfoByReferral: new Map<string, any>(),
    documentCounts: new Map<string, number>(),
    letterCounts: new Map<string, number>(),
    actionCounts: new Map<string, number>(),
    taskCounts: new Map<string, number>(),
    latestActivity: new Map<string, any>(),
  };

  for (const ir of (infoRequestRows.data ?? []) as any[]) {
    const cur = out.openInfoByReferral.get(ir.legal_referral_id);
    if (!cur || (ir.due_date && (!cur.due_date || ir.due_date < cur.due_date))) {
      out.openInfoByReferral.set(ir.legal_referral_id, ir);
    }
  }
  for (const d of (docRows.data ?? []) as any[]) {
    const isLetter = (d.document_type_code ?? "").toUpperCase().includes("LETTER");
    if (isLetter) {
      out.letterCounts.set(d.lg_case_id, (out.letterCounts.get(d.lg_case_id) ?? 0) + 1);
    } else {
      out.documentCounts.set(d.lg_case_id, (out.documentCounts.get(d.lg_case_id) ?? 0) + 1);
    }
  }
  for (const a of (actionRows.data ?? []) as any[]) {
    const sc = (a.status_code ?? "").toUpperCase();
    if (sc && sc !== "COMPLETED" && sc !== "CANCELLED" && sc !== "CLOSED") {
      out.actionCounts.set(a.lg_case_id, (out.actionCounts.get(a.lg_case_id) ?? 0) + 1);
    }
  }
  for (const t of (taskRows.data ?? []) as any[]) {
    const sc = (t.status_code ?? "").toUpperCase();
    if (sc && sc !== "COMPLETED" && sc !== "CANCELLED" && sc !== "CLOSED") {
      out.taskCounts.set(t.lg_case_id, (out.taskCounts.get(t.lg_case_id) ?? 0) + 1);
    }
  }
  for (const a of (activityRows.data ?? []) as any[]) {
    if (!out.latestActivity.has(a.lg_case_id)) {
      out.latestActivity.set(a.lg_case_id, a);
    }
  }

  return out;
}

function uniq<T>(xs: (T | null | undefined)[]): T[] {
  return Array.from(new Set(xs.filter((x): x is T => x != null)));
}
function indexBy(rows: any, key: string): Map<string, any> {
  const m = new Map<string, any>();
  for (const r of (rows ?? []) as any[]) m.set(r[key], r);
  return m;
}
function groupBy(rows: any, key: string): Map<string, any[]> {
  const m = new Map<string, any[]>();
  for (const r of (rows ?? []) as any[]) {
    const arr = m.get(r[key]) ?? [];
    arr.push(r);
    m.set(r[key], arr);
  }
  return m;
}

// ---------- assemblers ------------------------------------------------------

function assembleFromReferral(
  r: any,
  agg: AggregateMaps,
  capability: LegalCapability | null | undefined,
): LegalMatterWorkspace {
  const intake = r.lg_intake_id ? agg.intake.get(r.lg_intake_id) : null;
  const lgCase = r.legal_case_id ? agg.cases.get(r.legal_case_id) : null;
  const assignments = r.legal_case_id ? agg.assignments.get(r.legal_case_id) ?? [] : [];
  const currentAssignment = assignments.find((a: any) => a.is_current) ?? assignments[0] ?? null;
  const officerId = currentAssignment?.assigned_to_user_id ?? lgCase?.assigned_legal_officer_id ?? null;
  const officer = officerId ? agg.profiles.get(officerId) : null;

  const matterTypeCode = lgCase?.case_type_code ?? intake?.matter_type_code ?? intake?.recommended_case_type_code ?? null;
  const caseTypeCode = lgCase?.case_type_code ?? null;
  const stageCode = lgCase?.current_stage_code ?? intake?.recommended_stage_code ?? null;
  const teamCode = lgCase?.assigned_team_code ?? r.legal_team_code ?? intake?.recommended_team_code ?? null;
  const workbasketCode = currentAssignment?.workbasket_code ?? r.legal_workbasket_code ?? intake?.recommended_workbasket_code ?? null;

  const lifecycle: LegalMatterLifecycleObjectType = lgCase ? "CASE" : intake ? "INTAKE" : "REFERRAL";
  const matterId = lgCase?.id ?? intake?.id ?? r.id;
  const matterNo = lgCase?.lg_case_no ?? r.referral_no ?? matterId;

  const pendingInfo = r.pending_info_request_count ?? 0;
  const open = agg.openInfoByReferral.get(r.id);
  const sla = slaStatusOf(open?.due_date ?? null, open?.sla_status ?? null);

  const overall = overallStatusFor(lifecycle, r.status, lgCase?.status_code ?? null, pendingInfo);

  // Party resolution.
  const entityType = (r.primary_entity_type ?? "").toUpperCase();
  let employer = null, ip = null, claim = null;
  if (entityType === "EMPLOYER") employer = agg.employers.get(r.primary_entity_id);
  if (entityType === "INSURED_PERSON" || entityType === "PERSON") ip = agg.insuredPersons.get(r.primary_entity_id);
  if (entityType === "CLAIM") claim = agg.claims.get(r.primary_entity_id);

  const primaryDisplayName =
    employer?.er_name ??
    ip?.full_name ??
    (ip ? [ip.first_name, ip.last_name].filter(Boolean).join(" ") : null) ??
    claim?.cl_no ??
    r.primary_entity_id ??
    LMW_FALLBACK.unknownParty;

  const team = teamCode ? agg.teams.get(teamCode) : null;
  const wb = workbasketCode ? agg.workbaskets.get(workbasketCode) : null;
  const latestActivity = lgCase?.id ? agg.latestActivity.get(lgCase.id) : null;
  const docCount = lgCase?.id ? agg.documentCounts.get(lgCase.id) ?? 0 : 0;
  const letterCount = lgCase?.id ? agg.letterCounts.get(lgCase.id) ?? 0 : 0;
  const taskCount = lgCase?.id ? agg.taskCounts.get(lgCase.id) ?? 0 : 0;
  const actionCount = lgCase?.id ? agg.actionCounts.get(lgCase.id) ?? 0 : 0;

  const navigation = buildNavigation({
    lifecycle,
    referralId: r.id,
    intakeId: r.lg_intake_id ?? null,
    caseId: r.legal_case_id ?? null,
    adviceId: null,
    sourceModule: r.source_module,
    sourceRecordId: r.source_record_id,
  });

  return {
    identity: {
      matter_id: matterId,
      matter_no: matterNo,
      lifecycle_object_type: lifecycle,
      referral_id: r.id,
      intake_id: r.lg_intake_id ?? null,
      legal_case_id: r.legal_case_id ?? null,
      legal_advice_request_id: null,
    },
    classification: {
      matter_type_code: matterTypeCode,
      matter_type_name: matterTypeCode,
      case_type_code: caseTypeCode,
      case_type_name: caseTypeCode,
      category: categoryFor(r.source_module, caseTypeCode, lifecycle),
    },
    source: {
      source_module: r.source_module,
      source_record_type: r.source_record_type ?? null,
      source_record_id: r.source_record_id ?? null,
      source_reference_no: r.source_reference_no ?? null,
      submitted_by: r.submitted_by ?? null,
      submitted_department: r.submitted_team_code ?? r.submitted_workbasket_code ?? null,
      submitted_at: r.created_at ?? null,
    },
    party: {
      primary_entity_type: r.primary_entity_type ?? null,
      primary_entity_id: r.primary_entity_id ?? null,
      primary_display_name: primaryDisplayName,
      employer_id: employer?.id ?? null,
      employer_no: employer?.er_no ?? null,
      employer_name: employer?.er_name ?? null,
      insured_person_id: ip?.id ?? null,
      insured_person_name: ip?.full_name ?? (ip ? [ip.first_name, ip.last_name].filter(Boolean).join(" ") : null),
      claim_id: claim?.id ?? null,
      claim_no: claim?.cl_no ?? null,
    },
    status: {
      referral_status: r.status ?? null,
      intake_status: intake?.intake_status ?? null,
      case_status: lgCase?.status_code ?? null,
      current_stage_code: stageCode,
      current_stage_name: stageCode,
      overall_status: overall,
    },
    assignment: {
      workbasket_code: workbasketCode,
      workbasket_name: wb?.workbasket_name ?? workbasketCode,
      team_code: teamCode,
      team_name: team?.team_name ?? teamCode,
      owner_user_id: officerId,
      owner_name: officer?.full_name ?? null,
      owner_user_code: officer?.user_code ?? null,
      assigned_at: currentAssignment?.assigned_at ?? null,
      reassignment_count: Math.max(0, assignments.length - 1),
    },
    sla: {
      due_date: open?.due_date ?? null,
      sla_status: sla.status,
      overdue_days: sla.overdueDays,
      escalation_status: open?.escalation_at ? "ESCALATED" : null,
    },
    counts: {
      document_count: docCount,
      letter_count: letterCount,
      pending_info_request_count: pendingInfo,
      open_task_count: taskCount,
      open_action_count: actionCount,
      unread_activity_count: 0,
    },
    latest: {
      last_activity_at: latestActivity?.created_at ?? r.last_status_at ?? r.updated_at ?? r.created_at ?? null,
      last_activity_type: latestActivity?.activity_type ?? "STATUS_CHANGE",
      last_activity_by: latestActivity?.actor_user_id ?? null,
      latest_document_at: null,
      latest_letter_at: null,
    },
    navigation,
    permissions: buildPermissions(capability, lifecycle, overall),
  };
}

// ---------- public API ------------------------------------------------------

export interface ListResult {
  items: LegalMatterWorkspace[];
  total: number;
}

export const legalMatterWorkspaceService = {
  async listForWorkbench(
    filters: LegalMatterWorkspaceFilters = {},
    capability: LegalCapability | null = null,
  ): Promise<ListResult> {
    let q = sb.from("legal_referral").select("*").order("last_status_at", { ascending: false }).limit(filters.limit ?? 500);
    if (filters.source_module?.length) q = q.in("source_module", filters.source_module);
    if (filters.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`referral_no.ilike.%${s}%,source_reference_no.ilike.%${s}%,summary.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    const referrals = (data ?? []) as any[];
    const agg = await loadAggregates(referrals);
    const items = referrals.map((r) => assembleFromReferral(r, agg, capability));
    const filtered = applyClientFilters(items, filters);
    return { items: filtered, total: filtered.length };
  },

  async listForUserWorkbasket(
    ctx: LegalMatterWorkspaceUserContext,
    capability: LegalCapability | null = null,
  ): Promise<ListResult> {
    const all = await this.listForWorkbench({ limit: 1000 }, capability);
    const items = all.items.filter((m) => {
      if (ctx.userId && m.assignment.owner_user_id === ctx.userId) return true;
      if (ctx.userCode && m.assignment.owner_user_code === ctx.userCode) return true;
      if (m.assignment.workbasket_code && ctx.workbasketCodes.includes(m.assignment.workbasket_code)) return true;
      if (m.assignment.team_code && ctx.teamCodes.includes(m.assignment.team_code)) return true;
      return false;
    });
    return { items, total: items.length };
  },

  async listForTeamWorkbasket(
    teamCode: string,
    capability: LegalCapability | null = null,
  ): Promise<ListResult> {
    const all = await this.listForWorkbench({ limit: 1000, team_code: teamCode }, capability);
    return all;
  },

  async getByReferralId(referralId: string, capability: LegalCapability | null = null): Promise<LegalMatterWorkspace | null> {
    const { data, error } = await sb.from("legal_referral").select("*").eq("id", referralId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const agg = await loadAggregates([data]);
    return assembleFromReferral(data, agg, capability);
  },

  async getByIntakeId(intakeId: string, capability: LegalCapability | null = null): Promise<LegalMatterWorkspace | null> {
    const { data, error } = await sb.from("legal_referral").select("*").eq("lg_intake_id", intakeId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const agg = await loadAggregates([data]);
    return assembleFromReferral(data, agg, capability);
  },

  async getByCaseId(caseId: string, capability: LegalCapability | null = null): Promise<LegalMatterWorkspace | null> {
    const { data, error } = await sb.from("legal_referral").select("*").eq("legal_case_id", caseId).maybeSingle();
    if (error) throw error;
    if (data) {
      const agg = await loadAggregates([data]);
      return assembleFromReferral(data, agg, capability);
    }
    // Case without a referral — degrade gracefully.
    const { data: c } = await sb.from("lg_case").select("*").eq("id", caseId).maybeSingle();
    if (!c) return null;
    const synthetic = {
      id: c.id,
      referral_no: c.lg_case_no,
      source_module: "LEGAL",
      source_record_type: null,
      source_record_id: null,
      source_reference_no: null,
      primary_entity_type: null,
      primary_entity_id: null,
      submitted_by: null,
      submitted_workbasket_code: null,
      submitted_team_code: null,
      legal_workbasket_code: null,
      legal_team_code: c.assigned_team_code ?? null,
      status: "LEGAL_CASE_CREATED",
      legal_case_id: c.id,
      lg_intake_id: null,
      pending_info_request_count: 0,
      last_status_at: c.updated_at ?? c.created_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
    const agg = await loadAggregates([synthetic]);
    return assembleFromReferral(synthetic, agg, capability);
  },

  async getByAdviceRequestId(requestId: string, capability: LegalCapability | null = null): Promise<LegalMatterWorkspace | null> {
    if (!requestId) return null;
    const { data: req } = await sb.from("la_advice_request").select("*").eq("id", requestId).maybeSingle();
    if (!req) return null;

    const [matterRes, assignRes, requesterRes, ownerRes] = await Promise.all([
      req.matter_id
        ? sb.from("la_matter").select("*").eq("id", req.matter_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from("la_matter_assignment").select("*").eq("matter_id", req.matter_id ?? "00000000-0000-0000-0000-000000000000").order("assigned_at", { ascending: false }),
      req.requested_by_user_code
        ? sb.from("profiles").select("id,user_code,full_name").eq("user_code", req.requested_by_user_code).maybeSingle()
        : Promise.resolve({ data: null }),
      req.assigned_user_code
        ? sb.from("profiles").select("id,user_code,full_name").eq("user_code", req.assigned_user_code).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const matter = matterRes.data as any | null;
    const assignments = (assignRes.data ?? []) as any[];
    const currentAssign = assignments.find((a) => a.is_current) ?? assignments[0] ?? null;
    const requester = requesterRes.data as any | null;
    const owner = ownerRes.data as any | null;

    const [matterTypeRes, workbasketRes] = await Promise.all([
      matter?.matter_type_id
        ? sb.from("la_matter_type").select("code,display_name,category").eq("id", matter.matter_type_id).maybeSingle()
        : Promise.resolve({ data: null }),
      currentAssign?.workbasket_id
        ? sb.from("la_workbasket").select("code,display_name").eq("id", currentAssign.workbasket_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const matterType = matterTypeRes.data as any | null;
    const wb = workbasketRes.data as any | null;

    const matterTypeCode = matterType?.code ?? matter?.category ?? req.urgency ?? "ADVICE";
    const stageCode = (matter?.stage ?? req.status ?? "DRAFT") as string;
    const adviceStatus = (req.status ?? "DRAFT").toUpperCase();

    let overall: LegalMatterOverallStatus = "IN_PROGRESS";
    if (req.advice_issued_at || adviceStatus === "ISSUED" || adviceStatus === "CLOSED") overall = "CLOSED";
    else if (adviceStatus === "DRAFT" || adviceStatus === "NEW") overall = "NEW";
    else if (adviceStatus.includes("WAIT") || adviceStatus.includes("INFO")) overall = "WAITING_ON_SOURCE";

    const requesterName = requester?.full_name ?? req.requested_by_user_code ?? LMW_FALLBACK.unknownParty;
    const navigation = buildNavigation({
      lifecycle: "ADVICE_REQUEST",
      referralId: null,
      intakeId: null,
      caseId: matter?.legal_existing_case_id ?? null,
      adviceId: req.id,
      sourceModule: matter?.source_module ?? "LEGAL",
      sourceRecordId: matter?.source_ref_id ?? null,
    });

    return {
      identity: {
        matter_id: req.id,
        matter_no: matter?.matter_no ?? req.request_no ?? req.id,
        lifecycle_object_type: "ADVICE_REQUEST",
        referral_id: null,
        intake_id: null,
        legal_case_id: matter?.legal_existing_case_id ?? null,
        legal_advice_request_id: req.id,
      },
      classification: {
        matter_type_code: matterTypeCode,
        matter_type_name: matterType?.display_name ?? matterTypeCode,
        case_type_code: null,
        case_type_name: null,
        category: "ADVISORY",
      },
      source: {
        source_module: matter?.source_module ?? "LEGAL",
        source_record_type: "ADVICE_REQUEST",
        source_record_id: matter?.source_ref_id ?? null,
        source_reference_no: matter?.source_ref_no ?? req.request_no ?? null,
        submitted_by: req.requested_by_user_code ?? null,
        submitted_department: req.requesting_dept ?? null,
        submitted_at: req.created_at ?? null,
      },
      party: {
        primary_entity_type: "REQUESTER",
        primary_entity_id: requester?.id ?? null,
        primary_display_name: requesterName,
        employer_id: null,
        employer_no: null,
        employer_name: null,
        insured_person_id: null,
        insured_person_name: null,
        claim_id: null,
        claim_no: null,
      },
      status: {
        referral_status: null,
        intake_status: null,
        case_status: matter?.status ?? null,
        current_stage_code: stageCode,
        current_stage_name: stageCode,
        overall_status: overall,
      },
      assignment: {
        workbasket_code: wb?.code ?? null,
        workbasket_name: wb?.display_name ?? wb?.code ?? null,
        team_code: null,
        team_name: null,
        owner_user_id: owner?.id ?? null,
        owner_name: owner?.full_name ?? req.assigned_user_code ?? null,
        owner_user_code: owner?.user_code ?? req.assigned_user_code ?? null,
        assigned_at: currentAssign?.assigned_at ?? null,
        reassignment_count: Math.max(0, assignments.length - 1),
      },
      sla: {
        due_date: matter?.due_date ?? null,
        sla_status: matter?.due_date ? (dueOverdueDays(matter.due_date) ? "OVERDUE" : "ON_TIME") : null,
        overdue_days: matter?.due_date ? dueOverdueDays(matter.due_date) : null,
        escalation_status: null,
      },
      counts: {
        document_count: 0,
        letter_count: 0,
        pending_info_request_count: 0,
        open_task_count: 0,
        open_action_count: 0,
        unread_activity_count: 0,
      },
      latest: {
        last_activity_at: req.advice_issued_at ?? req.updated_at ?? req.created_at ?? null,
        last_activity_type: req.advice_issued_at ? "ADVICE_ISSUED" : "REQUEST_UPDATED",
        last_activity_by: req.advice_issued_by_user_code ?? req.requested_by_user_code ?? null,
        latest_document_at: null,
        latest_letter_at: null,
      },
      navigation,
      permissions: buildPermissions(capability, "ADVICE_REQUEST", overall),
    };
  },

  async buildTemplateContext(matterId: string) {
    const ws = await this.getByCaseId(matterId).catch(() => null);
    if (!ws) return null;
    const { buildTokenContext } = await import("@/services/legal/lgTemplateService");
    const base = ws.identity.legal_case_id ? await buildTokenContext(ws.identity.legal_case_id).catch(() => null) : null;
    return {
      ...(base ?? {}),
      workspace: ws,
      party: ws.party,
      officer: {
        user_id: ws.assignment.owner_user_id,
        user_code: ws.assignment.owner_user_code,
        name: ws.assignment.owner_name,
      },
    };
  },

  async buildAiContext(matterId: string) {
    const ws =
      (await this.getByCaseId(matterId).catch(() => null)) ??
      (await this.getByReferralId(matterId).catch(() => null));
    if (!ws) return null;
    return {
      matter_no: ws.identity.matter_no,
      lifecycle: ws.identity.lifecycle_object_type,
      matter_type: ws.classification.matter_type_code,
      category: ws.classification.category,
      overall_status: ws.status.overall_status,
      current_stage: ws.status.current_stage_code,
      primary_party: ws.party.primary_display_name,
      owner: ws.assignment.owner_name ?? ws.assignment.owner_user_code,
      sla_due: ws.sla.due_date,
      sla_status: ws.sla.sla_status,
      counts: ws.counts,
    };
  },
};

function applyClientFilters(items: LegalMatterWorkspace[], filters: LegalMatterWorkspaceFilters) {
  return items.filter((m) => {
    if (filters.lifecycle?.length && !filters.lifecycle.includes(m.identity.lifecycle_object_type)) return false;
    if (filters.category?.length && !filters.category.includes(m.classification.category)) return false;
    if (filters.overall_status?.length && !filters.overall_status.includes(m.status.overall_status)) return false;
    if (filters.workbasket_code && m.assignment.workbasket_code !== filters.workbasket_code) return false;
    if (filters.team_code && m.assignment.team_code !== filters.team_code) return false;
    if (filters.owner_user_id && m.assignment.owner_user_id !== filters.owner_user_id) return false;
    return true;
  });
}

// ---------- integrity --------------------------------------------------------

export interface IntegrityIssue {
  code: string;
  matter_id: string;
  matter_no: string;
  message: string;
}

export async function runMatterWorkspaceIntegrity(capability: LegalCapability | null = null): Promise<{
  issues: IntegrityIssue[];
  countsByCode: Record<string, number>;
  total: number;
}> {
  const { items } = await legalMatterWorkspaceService.listForWorkbench({ limit: 1000 }, capability);
  const issues: IntegrityIssue[] = [];
  for (const m of items) {
    const push = (code: string, message: string) =>
      issues.push({ code, matter_id: m.identity.matter_id, matter_no: m.identity.matter_no, message });

    if (!m.classification.matter_type_code) push("MISSING_MATTER_TYPE", "Referral has no matter_type_code.");
    if (m.identity.lifecycle_object_type === "REFERRAL" && !m.identity.intake_id && !m.identity.legal_case_id && m.status.overall_status !== "NEW" && m.status.overall_status !== "REJECTED") {
      push("REFERRAL_WITHOUT_LINK", "Referral has no linked intake or case.");
    }
    if (m.identity.intake_id && !m.identity.referral_id) push("INTAKE_WITHOUT_REFERRAL", "Intake exists without a source referral.");
    if (m.identity.legal_case_id && !m.identity.intake_id && !m.identity.referral_id) push("CASE_WITHOUT_SOURCE", "Case is not linked to a referral or intake.");
    if (m.assignment.owner_user_id && !m.assignment.owner_user_code && !m.assignment.owner_name) push("INVALID_ASSIGNEE", "Assignment points to an unknown user profile.");
    if (m.identity.lifecycle_object_type !== "ADVICE_REQUEST" && m.status.overall_status === "WAITING_ON_SOURCE" && !m.sla.due_date) push("SLA_MISSING", "Pending source request has no SLA due date.");
    if (m.identity.legal_case_id && m.counts.document_count === 0 && m.counts.letter_count === 0 && m.status.overall_status === "CASE_OPEN") {
      push("DOC_COUNT_LOW", "Open case has no documents or letters recorded.");
    }
  }
  const countsByCode: Record<string, number> = {};
  for (const i of issues) countsByCode[i.code] = (countsByCode[i.code] ?? 0) + 1;
  return { issues, countsByCode, total: issues.length };
}
