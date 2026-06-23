import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

const LEGAL_ROLE_NAMES = [
  "LEGAL_ADMIN", "LEGAL_MANAGER", "LEGAL_OFFICER", "SENIOR_LEGAL_OFFICER",
  "LEGAL_SUPPORT_STAFF", "LEGAL_CLERK", "LEGAL_READ_ONLY",
];

const REQUIRED_WORKBASKETS = [
  "LEGAL_INTAKE_REVIEW", "LEGAL_REFERRAL_REVIEW", "LEGAL_CASE_ASSIGNMENT",
  "LEGAL_COURT_FILING", "LEGAL_HEARING_PREPARATION", "LEGAL_SETTLEMENT_REVIEW",
  "LEGAL_FEE_POSTING", "LEGAL_ENFORCEMENT", "LEGAL_JUDGMENT", "LEGAL_MANAGER_REVIEW",
];

const REQUIRED_STAGES = [
  "REFERRAL_RECEIVED", "LEGAL_REVIEW", "DEMAND_NOTICE", "COURT_FILING",
  "HEARING", "SETTLEMENT_NEGOTIATION", "JUDGMENT", "ENFORCEMENT", "FEES_AND_WAIVERS",
];

export type SetupStatus = "ok" | "warn" | "fail";

export interface SetupArea {
  key: string;
  area: string;
  status: SetupStatus;
  detail: string;
  missing: string[];
  action: { label: string; to: string };
}

export interface LegalSetupValidation {
  areas: SetupArea[];
  ready: boolean;
  legalUserCount: number;
  assignedUserCount: number;
}

async function load(): Promise<LegalSetupValidation> {
  const [
    { data: profile },
    { data: teamRows },
    { data: roleRows },
    { data: policyRows },
    { data: sourceRows },
    { data: stageRows },
    { data: workflowPolicyRows },
    { data: roleMappingRows },
  ] = await Promise.all([
    sb.from("lg_department_profile").select("*").limit(1).maybeSingle(),
    sb.from("lg_team").select("id, team_code, is_active, is_default"),
    sb.from("user_roles").select("user_id, role").in("role", LEGAL_ROLE_NAMES),
    sb.from("lg_routing_policy").select("*").eq("country_code", "SKN").maybeSingle(),
    sb.from("lg_routing_source_map").select("source_code, workbasket_code, is_active").eq("country_code", "SKN"),
    sb.from("lg_routing_stage_override").select("stage_code, workbasket_code, is_active").eq("country_code", "SKN"),
    sb.from("lg_workflow_policy").select("action_code, action_label, approver_role_type, approval_required, is_active"),
    sb.from("lg_role_type_mapping").select("role_type, is_active"),
  ]);


  const generalTeam = (teamRows ?? []).find((t: any) => t.team_code === "GENERAL_LEGAL");
  let memberRows: any[] = [];
  let wbRows: any[] = [];
  if (generalTeam?.id) {
    const [m, w] = await Promise.all([
      sb.from("lg_team_member").select("user_id, can_own_case, is_active").eq("team_id", generalTeam.id),
      sb.from("lg_team_workbasket").select("workbasket_code, is_active").eq("team_id", generalTeam.id),
    ]);
    memberRows = m.data ?? [];
    wbRows = w.data ?? [];
  }

  const legalUserIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
  const assignedIds = new Set(memberRows.map((m: any) => m.user_id));
  const unassigned = legalUserIds.filter((id) => !assignedIds.has(id));
  const hasOwner = memberRows.some((m: any) => m.is_active && m.can_own_case);

  const mappedWbs = new Set(wbRows.filter((w: any) => w.is_active).map((w: any) => w.workbasket_code));
  const missingWb = REQUIRED_WORKBASKETS.filter((c) => !mappedWbs.has(c));

  const profileMissing: string[] = [];
  if (!profile?.institution_name) profileMissing.push("Institution");
  if (!profile?.department_name) profileMissing.push("Department");
  if (!profile?.country_code) profileMissing.push("Country");
  if (!profile?.email) profileMissing.push("Email");

  const policyMissing: string[] = [];
  if (!policyRows?.default_team_code) policyMissing.push("Default team");
  if (!policyRows?.default_workbasket_code) policyMissing.push("Default workbasket");
  if (!policyRows?.default_strategy_code) policyMissing.push("Assignment strategy");
  if (!policyRows?.escalation_workbasket_code) policyMissing.push("Escalation target");

  const sourceCodes = new Set((sourceRows ?? []).filter((r: any) => r.is_active && r.workbasket_code).map((r: any) => r.source_code));
  const expectedSources = ["COMPLIANCE_REFERRAL", "MANUAL_EMPLOYER", "MANUAL_IP", "LEGACY"];
  const missingSources = expectedSources.filter((c) => !sourceCodes.has(c));

  const stageCodes = new Set((stageRows ?? []).filter((r: any) => r.is_active && r.workbasket_code).map((r: any) => r.stage_code));
  const missingStages = REQUIRED_STAGES.filter((c) => !stageCodes.has(c));

  const areas: SetupArea[] = [
    {
      key: "profile", area: "Department Profile",
      status: profileMissing.length === 0 ? "ok" : "fail",
      detail: profileMissing.length === 0
        ? `${profile?.institution_name} — ${profile?.department_name}`
        : "Required identity fields missing",
      missing: profileMissing,
      action: { label: "Edit Department Profile", to: "/legal/admin/profile" },
    },
    {
      key: "team", area: "General Legal Team",
      status: generalTeam?.is_active && generalTeam?.is_default ? "ok" : (generalTeam ? "warn" : "fail"),
      detail: generalTeam
        ? `GENERAL_LEGAL · ${generalTeam.is_active ? "active" : "inactive"}${generalTeam.is_default ? " · default" : ""}`
        : "GENERAL_LEGAL team not created",
      missing: generalTeam ? (generalTeam.is_default ? [] : ["Mark as default"]) : ["Create GENERAL_LEGAL team"],
      action: { label: "Open Teams & Staff", to: "/legal/admin/teams" },
    },
    {
      key: "members", area: "Team Members",
      status: legalUserIds.length === 0
        ? "fail"
        : unassigned.length === 0 ? "ok" : "warn",
      detail: `${assignedIds.size} of ${legalUserIds.length} legal users assigned to GENERAL_LEGAL`,
      missing: unassigned.length ? [`${unassigned.length} unassigned legal user(s)`] : [],
      action: { label: "Review Members", to: "/legal/admin/teams" },
    },
    {
      key: "owner", area: "Case Ownership",
      status: hasOwner ? "ok" : "fail",
      detail: hasOwner ? "At least one active case owner" : "No member can own cases",
      missing: hasOwner ? [] : ["Enable 'Own Case' on a member"],
      action: { label: "Open Team Members", to: "/legal/admin/teams" },
    },
    {
      key: "workbaskets", area: "Workbasket Mapping",
      status: missingWb.length === 0 ? "ok" : missingWb.length <= 2 ? "warn" : "fail",
      detail: `${mappedWbs.size} of ${REQUIRED_WORKBASKETS.length} required workbaskets mapped`,
      missing: missingWb,
      action: { label: "Assign Workbaskets", to: "/legal/admin/teams" },
    },
    {
      key: "routing", area: "Routing Policy",
      status: policyMissing.length === 0 ? "ok" : "fail",
      detail: policyRows
        ? `Strategy: ${policyRows.default_strategy_code ?? "—"}, escalate after ${policyRows.escalate_unassigned_after_days ?? 0}d`
        : "Routing policy not configured",
      missing: policyMissing,
      action: { label: "Open Routing & Assignment", to: "/legal/admin/routing" },
    },
    {
      key: "source", area: "Case Source Routing",
      status: missingSources.length === 0 ? "ok" : missingSources.length <= 2 ? "warn" : "fail",
      detail: `${sourceCodes.size} of ${expectedSources.length} sources mapped`,
      missing: missingSources,
      action: { label: "Configure Source Routing", to: "/legal/admin/routing" },
    },
    {
      key: "stage", area: "Stage Routing",
      status: missingStages.length === 0 ? "ok" : missingStages.length <= 2 ? "warn" : "fail",
      detail: `${stageCodes.size} of ${REQUIRED_STAGES.length} stages mapped`,
      missing: missingStages,
      action: { label: "Configure Stage Routing", to: "/legal/admin/routing" },
    },
  ];

  // ---- Separation-of-concerns checks (Routing vs Workflow & Stage Rules) ----
  const activeRoleTypes = new Set(
    (roleMappingRows ?? []).filter((r: any) => r.is_active).map((r: any) => r.role_type)
  );
  const routedStageCodes = new Set(
    (stageRows ?? []).filter((r: any) => r.is_active && r.workbasket_code).map((r: any) => r.stage_code)
  );
  const workflowActions = (workflowPolicyRows ?? []).filter((p: any) => p.is_active);
  // Stage codes that have at least one workflow policy action covering them.
  // Policies are action-based, not stage-keyed, so any active policy is treated
  // as global coverage; if there are none, every routed stage is unconfigured.
  const stagesWithoutWorkflow = workflowActions.length === 0
    ? Array.from(routedStageCodes)
    : [];
  const orphanApprovals = workflowActions
    .filter((p: any) => p.approval_required && p.approver_role_type && !activeRoleTypes.has(p.approver_role_type))
    .map((p: any) => `${p.action_label} → ${p.approver_role_type}`);

  areas.push({
    key: "workflow_coverage", area: "Workflow coverage for routed stages",
    status: stagesWithoutWorkflow.length === 0 ? "ok" : "warn",
    detail: stagesWithoutWorkflow.length === 0
      ? "All routed stages have workflow policies configured"
      : "Some routed stages have no workflow actions defined",
    missing: stagesWithoutWorkflow.map((s) => `${s} — no workflow action`),
    action: { label: "Open Workflow & Stage Rules", to: "/legal/admin/policy" },
  });

  areas.push({
    key: "approval_role_validity", area: "Approval role validity",
    status: orphanApprovals.length === 0 ? "ok" : "fail",
    detail: orphanApprovals.length === 0
      ? "No approval policy references an inactive role"
      : `${orphanApprovals.length} approval policy(s) reference an inactive Legal role-type`,
    missing: orphanApprovals,
    action: { label: "Fix Role Mapping", to: "/legal/admin/policy" },
  });

  // ---- SSB Legal Review: Court setup checks ----
  const [
    { data: courtRows },
    { data: divisionRows },
    { data: venueRows },
    { data: officerRows },
    { data: proceedingRows },
    { data: palRows },
    { data: templateRows },
  ] = await Promise.all([
    sb.from("lg_court").select("court_code, court_type, active"),
    sb.from("lg_court_division").select("court_code, active"),
    sb.from("lg_court_venue").select("court_code, active"),
    sb.from("lg_court_officer").select("court_code, officer_type, active"),
    sb.from("lg_court_proceeding").select("id, court_code, court_reference_no, status"),
    sb.from("lg_payment_arrangement_link").select("id, source_module, source_reference_no, active"),
    sb.from("legal_templates").select("name, is_active"),
  ]);

  const activeCourts = (courtRows ?? []).filter((c: any) => c.active);
  const venuesByCourt = new Set((venueRows ?? []).filter((v: any) => v.active).map((v: any) => v.court_code));
  const officersByCourt = new Set((officerRows ?? []).filter((o: any) => o.active).map((o: any) => o.court_code));
  const courtsWithoutVenue = activeCourts.filter((c: any) => !venuesByCourt.has(c.court_code)).map((c: any) => c.court_code);
  const courtsWithoutOfficer = activeCourts
    .filter((c: any) => c.court_type !== "OTHER" && !officersByCourt.has(c.court_code))
    .map((c: any) => c.court_code);

  areas.push({
    key: "courts", area: "Court Master Setup",
    status: activeCourts.length === 0 ? "fail" : "ok",
    detail: `${activeCourts.length} active court(s), ${(divisionRows ?? []).length} division(s)`,
    missing: activeCourts.length === 0 ? ["No courts configured"] : [],
    action: { label: "Open Court Configuration", to: "/legal/admin/courts" },
  });

  areas.push({
    key: "court_venues", area: "Court Venues",
    status: courtsWithoutVenue.length === 0 ? "ok" : "warn",
    detail: courtsWithoutVenue.length === 0
      ? "Every active court has at least one venue"
      : `${courtsWithoutVenue.length} active court(s) without a venue`,
    missing: courtsWithoutVenue,
    action: { label: "Configure Venues", to: "/legal/admin/courts" },
  });

  areas.push({
    key: "court_officers", area: "Judges / Magistrates",
    status: courtsWithoutOfficer.length === 0 ? "ok" : "warn",
    detail: courtsWithoutOfficer.length === 0
      ? "Every active court has at least one officer"
      : `${courtsWithoutOfficer.length} active court(s) without a magistrate/judge`,
    missing: courtsWithoutOfficer,
    action: { label: "Configure Officers", to: "/legal/admin/courts" },
  });

  const filedWithoutRef = (proceedingRows ?? []).filter((p: any) =>
    p.status && !["DRAFT", "PENDING"].includes(String(p.status).toUpperCase()) && !p.court_reference_no
  );
  areas.push({
    key: "proceeding_refs", area: "Court Reference Numbers",
    status: filedWithoutRef.length === 0 ? "ok" : "fail",
    detail: filedWithoutRef.length === 0
      ? "All filed proceedings have a court reference number"
      : `${filedWithoutRef.length} filed proceeding(s) missing court reference`,
    missing: filedWithoutRef.map((p: any) => `Proceeding ${p.id}`),
    action: { label: "Open Cases", to: "/legal/cases" },
  });

  const palMissingRef = (palRows ?? []).filter((p: any) => p.active && p.source_module && !p.source_reference_no);
  areas.push({
    key: "pal_source_ref", area: "Payment Arrangement Links",
    status: palMissingRef.length === 0 ? "ok" : "warn",
    detail: palMissingRef.length === 0
      ? "All payment arrangement links carry a source reference"
      : `${palMissingRef.length} link(s) missing source_reference_no`,
    missing: palMissingRef.map((p: any) => `Link ${p.id}`),
    action: { label: "Review Payment Plans", to: "/legal/admin/policy" },
  });

  const REQUIRED_TEMPLATES = [
    "Demand Letter","Final Demand Letter","Agreement / Payment Arrangement Letter","Adjournment Letter",
    "Judgment Letter","Summons to Appear","Judgment Summons","Writ of Execution","Warrant / Commitment",
    "Court Order Recording Notice","Settlement Confirmation","Payment Default Notice","Enforcement Notice",
    "Case Closure Letter","Request for Information from Source Department",
  ];
  const templateNames = new Set((templateRows ?? []).filter((t: any) => t.is_active !== false).map((t: any) => t.name));
  const missingTemplates = REQUIRED_TEMPLATES.filter((t) => !templateNames.has(t));
  areas.push({
    key: "templates", area: "Legal Templates",
    status: missingTemplates.length === 0 ? "ok" : missingTemplates.length <= 3 ? "warn" : "fail",
    detail: `${REQUIRED_TEMPLATES.length - missingTemplates.length} of ${REQUIRED_TEMPLATES.length} required templates present`,
    missing: missingTemplates,
    action: { label: "Open Templates", to: "/legal/admin/templates" },
  });

  const ready = areas.every((a) => a.status === "ok");
  return { areas, ready, legalUserCount: legalUserIds.length, assignedUserCount: assignedIds.size };
}

export function useLegalSetupValidation() {
  return useQuery({
    queryKey: ["legal_setup_validation"],
    queryFn: load,
    staleTime: 15_000,
  });
}
