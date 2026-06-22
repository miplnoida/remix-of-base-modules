import { supabase } from "@/integrations/supabase/client";
import { createLgCase, type LgCase, type LgCaseInsert } from "./lgCaseService";
import { createLgParty, type LgPartyInsert } from "./lgPartyService";
import { logLgActivity } from "./lgAuditService";
import { resolveRouting } from "./lgRoutingService";

const sb = supabase as any;

export type LegalCaseSourceMode =
  | "COMPLIANCE_REFERRAL"
  | "MANUAL_EMPLOYER"
  | "MANUAL_MEMBER"
  | "LEGACY"
  | "COURT_FILED"
  | "INTERNAL";

export interface PartyDraft {
  party_role: string;
  party_type: string;
  display_name: string;
  external_ref_id?: string | null;
  contact_info?: Record<string, unknown> | null;
  representative_name?: string | null;
  notes?: string | null;
}

export interface CreateLegalCaseInput {
  // Source & classification
  source_mode: LegalCaseSourceMode;
  country_code?: string;
  case_type_code: string;
  case_category_code?: string | null;
  priority_code: string;
  current_stage_code: string;
  status_code?: string;

  // Core
  opened_date: string;
  summary?: string | null;
  assigned_legal_officer_id?: string | null;

  // Court
  court_name?: string | null;
  court_case_no?: string | null;

  // Money
  claim_amount?: number | null;
  outstanding_amount_snapshot?: number | null;

  // Optional links
  compliance_case_id?: string | null;
  compliance_referral_id?: string | null;
  payment_arrangement_id?: string | null;
  employer_id?: string | null;
  person_id?: string | null;

  // Legacy fields
  legacy_case_no?: string | null;
  legacy_employer_name?: string | null;
  legacy_person_name?: string | null;
  legacy_court_case_no?: string | null;
  legacy_opened_date?: string | null;
  legacy_notes?: string | null;

  // Wizard payload
  parties: PartyDraft[];
  legal_reference_ids?: string[];
  document_ids?: string[];
  default_task?: {
    task_type_code: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
  } | null;

  created_by?: string | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateLegalCase(input: CreateLegalCaseInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.country_code) issues.push({ field: "country_code", message: "Country is required" });
  if (!input.case_type_code) issues.push({ field: "case_type_code", message: "Case type is required" });
  if (!input.priority_code) issues.push({ field: "priority_code", message: "Priority is required" });
  if (!input.current_stage_code) issues.push({ field: "current_stage_code", message: "Starting stage is required" });
  if (!input.opened_date) issues.push({ field: "opened_date", message: "Opened date is required" });
  if (!input.source_mode) issues.push({ field: "source_mode", message: "Source is required" });

  // At least one opposing / respondent party
  const respondentRoles = new Set([
    "RESPONDENT", "DEFENDANT", "EMPLOYER", "INSURED_PERSON",
    "BENEFICIARY", "CLAIMANT", "ESTATE", "OTHER",
  ]);
  const hasRespondent = (input.parties ?? []).some((p) => respondentRoles.has(p.party_role));
  if (!hasRespondent) {
    issues.push({ field: "parties", message: "At least one respondent / opposing party is required" });
  }

  if (input.source_mode === "MANUAL_EMPLOYER") {
    const hasEmployer = input.employer_id || input.legacy_employer_name ||
      (input.parties ?? []).some((p) => p.party_type === "EMPLOYER" && p.display_name?.trim());
    if (!hasEmployer) issues.push({ field: "employer", message: "Employer (or legacy employer name) is required" });
  }

  if (input.source_mode === "MANUAL_MEMBER") {
    const hasPerson = input.person_id || input.legacy_person_name ||
      (input.parties ?? []).some(
        (p) => ["PERSON", "INSURED_PERSON", "BENEFICIARY"].includes(p.party_type) && p.display_name?.trim(),
      );
    if (!hasPerson) issues.push({ field: "person", message: "Member / insured person (or legacy name) is required" });
  }

  if (input.source_mode === "LEGACY" && !input.legacy_case_no && !input.legacy_court_case_no) {
    issues.push({ field: "legacy_case_no", message: "Legacy case number or legacy court case number is required" });
  }

  return issues;
}

/** Build the default SSB complainant party. */
export function buildDefaultComplainant(countryCode = "KN"): PartyDraft {
  const name = countryCode === "KN"
    ? "St. Christopher and Nevis Social Security Board"
    : "Social Security Board";
  return {
    party_role: "COMPLAINANT",
    party_type: "GOVERNMENT_AGENCY",
    display_name: name,
    notes: "Default complainant auto-added on case creation",
  };
}

export interface CreateLegalCaseResult {
  case: LgCase;
  party_count: number;
}

/** Atomic-ish orchestrator: case → parties → stage history → activity → optional task / refs / docs. */
export async function createLegalCaseFull(input: CreateLegalCaseInput): Promise<CreateLegalCaseResult> {
  const issues = validateLegalCase(input);
  if (issues.length) {
    const e: any = new Error(issues[0].message);
    e.issues = issues;
    throw e;
  }

  // 1) Insert case
  const caseInsert: any = {
    country_code: input.country_code ?? "KN",
    case_type_code: input.case_type_code,
    case_category_code: input.case_category_code ?? null,
    status_code: input.status_code ?? "OPEN",
    current_stage_code: input.current_stage_code,
    priority_code: input.priority_code,
    opened_date: input.opened_date,
    summary: input.summary ?? null,
    assigned_legal_officer_id: input.assigned_legal_officer_id ?? null,
    court_name: input.court_name ?? null,
    court_case_no: input.court_case_no ?? null,
    claim_amount: input.claim_amount ?? null,
    outstanding_amount_snapshot: input.outstanding_amount_snapshot ?? null,
    compliance_case_id: input.compliance_case_id ?? null,
    compliance_referral_id: input.compliance_referral_id ?? null,
    payment_arrangement_id: input.payment_arrangement_id ?? null,
    employer_id: input.employer_id ?? null,
    person_id: input.person_id ?? null,
    source_mode: input.source_mode,
    legacy_case_no: input.legacy_case_no ?? null,
    legacy_employer_name: input.legacy_employer_name ?? null,
    legacy_person_name: input.legacy_person_name ?? null,
    legacy_court_case_no: input.legacy_court_case_no ?? null,
    legacy_opened_date: input.legacy_opened_date ?? null,
    legacy_notes: input.legacy_notes ?? null,
    is_legacy: input.source_mode === "LEGACY",
    created_by: input.created_by ?? null,
  };

  const created = await createLgCase(caseInsert as LgCaseInsert);

  // 2) Insert parties
  let partyCount = 0;
  for (const p of input.parties ?? []) {
    if (!p.display_name?.trim()) continue;
    const row: LgPartyInsert = {
      lg_case_id: created.id,
      party_role: p.party_role,
      party_type: p.party_type,
      display_name: p.display_name.trim(),
      external_ref_id: p.external_ref_id ?? null,
      contact_info: p.contact_info ?? null,
      representative_name: p.representative_name ?? null,
      notes: p.notes ?? null,
    };
    try {
      await createLgParty(row);
      partyCount += 1;
    } catch (err) {
      console.warn("[lg-case-create] party insert failed", err, row);
    }
  }

  // 3) Stage history (initial entry)
  try {
    await sb.from("lg_case_stage_history").insert({
      lg_case_id: created.id,
      from_stage_code: null,
      to_stage_code: created.current_stage_code,
      transitioned_by: input.created_by ?? null,
      notes: `Case opened via ${input.source_mode}`,
    });
  } catch (err) {
    console.warn("[lg-case-create] stage history failed", err);
  }

  // 4) Default task (optional)
  if (input.default_task) {
    try {
      await sb.from("lg_case_task").insert({
        lg_case_id: created.id,
        task_type_code: input.default_task.task_type_code,
        title: input.default_task.title,
        description: input.default_task.description ?? null,
        due_date: input.default_task.due_date ?? null,
        status: "OPEN",
        priority_code: input.priority_code,
        assigned_to_user_id: input.assigned_legal_officer_id ?? null,
        created_by: input.created_by ?? null,
      });
    } catch (err) {
      console.warn("[lg-case-create] default task failed", err);
    }
  }

  // 5) Linked legal references
  if (input.legal_reference_ids?.length) {
    for (const refId of input.legal_reference_ids) {
      try {
        await sb.from("core_generated_document_legal_reference").insert({
          generated_document_id: null,
          legal_reference_id: refId,
          context_module: "LEGAL",
          context_entity_id: created.id,
        });
      } catch (err) {
        // table may not accept null doc — fall back silently, link is non-critical here
        console.warn("[lg-case-create] reference link skipped", err);
      }
    }
  }

  // 6) Linked existing documents
  if (input.document_ids?.length) {
    for (const docId of input.document_ids) {
      try {
        await sb.from("lg_document_link").insert({
          lg_case_id: created.id,
          dms_document_id: docId,
          link_type: "EXISTING",
          stage_code: created.current_stage_code,
          created_by: input.created_by ?? null,
        });
      } catch (err) {
        console.warn("[lg-case-create] document link failed", err);
      }
    }
  }

  // 7) Routing: workbasket task + (optional) auto officer assignment.
  // Uses the layered routing service (stage+type → case_type → stage → source → default → fallback).
  let routedWorkbasket: string | null = null;
  let routedOfficerId: string | null = null;
  try {
    const sb = (supabase as any);
    const { data: policy } = await sb
      .from("legal_complainant_settings")
      .select("default_workbasket_code, default_team_code, default_assignment_strategy, auto_assign_on_referral, auto_assign_on_manual_case")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stage = (created.current_stage_code || "").toUpperCase();
    const caseType = (input.case_type_code || "").toUpperCase();

    // Resolve workbasket + team via the routing service
    const routing = await resolveRouting({
      source_code: input.source_mode,
      case_type_code: caseType,
      stage_code: stage,
    });
    routedWorkbasket = routing.workbasket_code;
    let teamCode: string | null = routing.team_code;
    let routedTeamId: string | null = null;

    // Resolve owning team row by code
    let teamRow: any = null;
    if (teamCode) {
      const { data } = await sb.from("lg_team").select("id, team_code").eq("team_code", teamCode).maybeSingle();
      teamRow = data;
      routedTeamId = data?.id ?? null;
    }
    if (!teamRow) {
      // Final escalation if still no team
      routedWorkbasket = "LEGAL_MANAGER_REVIEW";
      const { data } = await sb.from("lg_team").select("id, team_code").eq("team_code", "GENERAL_LEGAL").maybeSingle();
      teamRow = data;
    }


    // Resolve owning team row
    let teamRow: any = null;
    if (routedTeamId) {
      const { data } = await sb.from("lg_team").select("id, team_code").eq("id", routedTeamId).maybeSingle();
      teamRow = data;
    }
    if (!teamRow) {
      // legacy lg_workbasket_role fallback then default_team_code
      const { data: wbRoleFb } = await sb
        .from("lg_workbasket_role")
        .select("owning_team_code")
        .eq("workbasket_code", routedWorkbasket)
        .maybeSingle();
      const fallbackCode = wbRoleFb?.owning_team_code || policy?.default_team_code || "GENERAL_LEGAL";
      const { data } = await sb.from("lg_team").select("id, team_code").eq("team_code", fallbackCode).maybeSingle();
      teamRow = data;
    }
    // Final escalation if still no team: route to LEGAL_MANAGER_REVIEW
    if (!teamRow) {
      routedWorkbasket = "LEGAL_MANAGER_REVIEW";
      const { data } = await sb.from("lg_team").select("id, team_code").eq("team_code", "GENERAL_LEGAL").maybeSingle();
      teamRow = data;
    }
    teamCode = teamRow?.team_code ?? "GENERAL_LEGAL";
    const team = teamRow;

    // Resolve responsible/support roles (informational)
    const { data: wbRole } = await sb
      .from("lg_workbasket_role")
      .select("responsible_role_code, support_role_code")
      .eq("workbasket_code", routedWorkbasket)
      .maybeSingle();

    // Eligible owner pool: active team members with can_own_case = true
    let eligibleOwners: string[] = [];
    let supportMembers: Array<{ user_id: string; role_code: string }> = [];
    if (team?.id) {
      const { data: tm } = await sb
        .from("lg_team_member")
        .select("user_id, role_code, can_own_case, is_active")
        .eq("team_id", team.id)
        .eq("is_active", true);
      eligibleOwners = (tm ?? []).filter((m: any) => m.can_own_case).map((m: any) => m.user_id);
      supportMembers = (tm ?? []).filter((m: any) => !m.can_own_case);
    }


    // Already-picked officer must satisfy can_own_case
    if (input.assigned_legal_officer_id) {
      if (eligibleOwners.length === 0 || eligibleOwners.includes(input.assigned_legal_officer_id)) {
        routedOfficerId = input.assigned_legal_officer_id;
      } else {
        console.warn("[lg-case-create] assigned user lacks can_own_case — routing to workbasket instead");
      }
    }

    const autoFlag = input.source_mode === "COMPLIANCE_REFERRAL"
      ? policy?.auto_assign_on_referral
      : policy?.auto_assign_on_manual_case;
    const strategy = (policy?.default_assignment_strategy || "WORKBASKET_ONLY").toUpperCase();

    if (!routedOfficerId && autoFlag && strategy !== "WORKBASKET_ONLY" && strategy !== "MANUAL_ASSIGNMENT" && eligibleOwners.length) {
      if (strategy === "BY_WORKLOAD") {
        const { data: openCases } = await sb
          .from("lg_case")
          .select("assigned_legal_officer_id")
          .in("assigned_legal_officer_id", eligibleOwners)
          .neq("status_code", "CLOSED");
        const load: Record<string, number> = {};
        eligibleOwners.forEach((u) => { load[u] = 0; });
        (openCases ?? []).forEach((c: any) => {
          if (c.assigned_legal_officer_id) load[c.assigned_legal_officer_id] = (load[c.assigned_legal_officer_id] || 0) + 1;
        });
        routedOfficerId = eligibleOwners.sort((a, b) => (load[a] || 0) - (load[b] || 0))[0];
      } else {
        const { data: last } = await sb
          .from("lg_case_assignment")
          .select("assigned_to_user_id")
          .not("assigned_to_user_id", "is", null)
          .order("assigned_at", { ascending: false })
          .limit(1);
        const lastId = last?.[0]?.assigned_to_user_id || null;
        const idx = lastId ? eligibleOwners.indexOf(lastId) : -1;
        routedOfficerId = eligibleOwners[(idx + 1) % eligibleOwners.length];
      }
    }

    // Persist owner assignment (workbasket always, officer optional)
    await sb.from("lg_case_assignment").insert({
      lg_case_id: created.id,
      assigned_to_user_id: routedOfficerId,
      assigned_team_code: teamCode,
      assignment_role: routedWorkbasket,
      assigned_by: input.created_by ?? null,
      is_current: true,
      reason: routedOfficerId
        ? `Auto-assigned via ${strategy}`
        : (eligibleOwners.length === 0
          ? `No eligible lawyer in ${teamCode} — held in workbasket ${routedWorkbasket}`
          : `Routed to workbasket ${routedWorkbasket}`),
    });

    if (routedOfficerId && routedOfficerId !== input.assigned_legal_officer_id) {
      await sb.from("lg_case").update({ assigned_legal_officer_id: routedOfficerId }).eq("id", created.id);
    }

    // Create a support task if the workbasket defines a support role and we have such staff
    const supportRole = wbRole?.support_role_code;
    if (supportRole && supportMembers.length) {
      const supportUser =
        supportMembers.find((m) => m.role_code === supportRole)?.user_id ?? supportMembers[0].user_id;
      try {
        await sb.from("lg_case_task").insert({
          lg_case_id: created.id,
          task_type_code: "SUPPORT_PREPARATION",
          task_kind: "SUPPORT",
          title:
            input.source_mode === "COMPLIANCE_REFERRAL" ? "Verify referral documents"
            : routedWorkbasket === "LEGAL_HEARING_PREPARATION" ? "Schedule hearing and upload notice"
            : routedWorkbasket === "LEGAL_FEE_POSTING" ? "Compile filing pack"
            : "Prepare case documents",
          description: `Support task created automatically for workbasket ${routedWorkbasket}.`,
          status: "OPEN",
          priority_code: input.priority_code,
          assigned_to_user_id: supportUser,
          created_by: input.created_by ?? null,
        });
      } catch (err) {
        console.warn("[lg-case-create] support task creation failed", err);
      }
    }
  } catch (err) {
    console.warn("[lg-case-create] routing failed (non-fatal)", err);
  }


  // 7) Audit
  await logLgActivity({
    lg_case_id: created.id,
    activity_type: "CASE_CREATED",
    description: `${created.lg_case_no} created via ${input.source_mode} (${partyCount} parties)`,
    payload: {
      source_mode: input.source_mode,
      case_type_code: input.case_type_code,
      case_category_code: input.case_category_code,
      party_count: partyCount,
      legacy: input.source_mode === "LEGACY",
    },
    performed_by: input.created_by ?? null,
  });

  return { case: created, party_count: partyCount };
}
