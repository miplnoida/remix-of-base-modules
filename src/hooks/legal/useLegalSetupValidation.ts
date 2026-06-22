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
  ] = await Promise.all([
    sb.from("lg_department_profile").select("*").limit(1).maybeSingle(),
    sb.from("lg_team").select("id, team_code, is_active, is_default"),
    sb.from("user_roles").select("user_id, role").in("role", LEGAL_ROLE_NAMES),
    sb.from("lg_routing_policy").select("*").eq("country_code", "SKN").maybeSingle(),
    sb.from("lg_routing_source_map").select("source_code, workbasket_code, is_active").eq("country_code", "SKN"),
    sb.from("lg_routing_stage_override").select("stage_code, workbasket_code, is_active").eq("country_code", "SKN"),
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
