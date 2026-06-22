import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LgMemberFunction = "LAWYER" | "SUPPORT" | "CLERK" | "MANAGER" | "ADMIN";

export interface LgTeam {
  id: string;
  team_code: string;
  team_name: string;
  country_code: string;
  manager_user_id: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface LgTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_code: string | null;          // snapshot only (read-only, derived from user_roles)
  member_function: LgMemberFunction;
  can_own_case: boolean;
  can_prepare_documents: boolean;
  can_schedule_hearing: boolean;
  can_post_fee: boolean;
  can_generate_notice: boolean;
  can_approve: boolean;
  is_primary: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export interface LgWorkbasketRole {
  id: string;
  workbasket_code: string;
  owning_team_code: string | null;
  responsible_role_code: string | null;
  support_role_code: string | null;
  description: string | null;
  is_active: boolean;
}

/* ---------------- teams ---------------- */

export async function listTeams(): Promise<LgTeam[]> {
  const { data, error } = await sb
    .from("lg_team")
    .select("*")
    .order("is_default", { ascending: false })
    .order("team_name");
  if (error) throw error;
  return data ?? [];
}

export async function createTeam(row: {
  team_code: string;
  team_name: string;
  country_code?: string;
  manager_user_id?: string | null;
  description?: string | null;
}): Promise<LgTeam> {
  const payload = {
    team_code: row.team_code.toUpperCase().trim(),
    team_name: row.team_name.trim(),
    country_code: (row.country_code || "SKN").toUpperCase(),
    manager_user_id: row.manager_user_id ?? null,
    description: row.description ?? null,
    is_active: true,
    is_default: false,
  };
  const { data, error } = await sb.from("lg_team").insert(payload).select().maybeSingle();
  if (error) throw error;
  return data as LgTeam;
}

export async function updateTeam(id: string, patch: Partial<LgTeam>) {
  const { error } = await sb.from("lg_team").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setTeamActive(id: string, is_active: boolean) {
  return updateTeam(id, { is_active });
}

/* ---------------- members ---------------- */

export async function listTeamMembers(teamId?: string): Promise<LgTeamMember[]> {
  let q = sb.from("lg_team_member").select("*").order("created_at", { ascending: true });
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Add a member to a team. Roles are NOT assigned here — they live in user_roles.
 * If `role_snapshot` is provided it's stored as a read-only label only.
 */
export async function addTeamMember(row: {
  team_id: string;
  user_id: string;
  member_function: LgMemberFunction;
  role_snapshot?: string | null;
  capabilities?: Partial<ReturnType<typeof capabilityDefaults>>;
  is_primary?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}): Promise<LgTeamMember> {
  const caps = { ...capabilityDefaults(row.member_function), ...(row.capabilities ?? {}) };
  const payload = {
    team_id: row.team_id,
    user_id: row.user_id,
    role_code: row.role_snapshot ?? null,
    member_function: row.member_function,
    ...caps,
    is_primary: !!row.is_primary,
    is_active: true,
    effective_from: row.effective_from ?? null,
    effective_to: row.effective_to ?? null,
  };
  const { data, error } = await sb
    .from("lg_team_member")
    .upsert(payload, { onConflict: "team_id,user_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as LgTeamMember;
}

export async function updateTeamMember(id: string, patch: Partial<LgTeamMember>) {
  const { error } = await sb.from("lg_team_member").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTeamMember(id: string) {
  const { error } = await sb.from("lg_team_member").delete().eq("id", id);
  if (error) throw error;
}

/** Mark one member as primary; clears the flag from any other member of the same team. */
export async function setPrimaryMember(teamId: string, memberId: string) {
  const a = await sb.from("lg_team_member").update({ is_primary: false }).eq("team_id", teamId).neq("id", memberId);
  if (a.error) throw a.error;
  const b = await sb.from("lg_team_member").update({ is_primary: true }).eq("id", memberId);
  if (b.error) throw b.error;
}

/* ---------------- workbasket roles ---------------- */

export async function listWorkbasketRoles(): Promise<LgWorkbasketRole[]> {
  const { data, error } = await sb.from("lg_workbasket_role").select("*").order("workbasket_code");
  if (error) throw error;
  return data ?? [];
}

/* ---------------- team workbasket assignments ---------------- */

export type LgResponsibilityType = "OWNER" | "SUPPORT" | "REVIEW" | "APPROVAL";

export interface LgTeamWorkbasket {
  id: string;
  team_id: string;
  workbasket_code: string;
  responsibility_type: LgResponsibilityType;
  can_receive_new_cases: boolean;
  can_auto_assign: boolean;
  default_for_stage: string | null;
  default_for_case_type: string | null;
  escalation_target: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTeamWorkbaskets(teamId?: string): Promise<LgTeamWorkbasket[]> {
  let q = sb.from("lg_team_workbasket").select("*").order("workbasket_code");
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listAllTeamWorkbaskets(): Promise<LgTeamWorkbasket[]> {
  const { data, error } = await sb.from("lg_team_workbasket").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertTeamWorkbasket(row: {
  id?: string;
  team_id: string;
  workbasket_code: string;
  responsibility_type: LgResponsibilityType;
  can_receive_new_cases?: boolean;
  can_auto_assign?: boolean;
  default_for_stage?: string | null;
  default_for_case_type?: string | null;
  escalation_target?: boolean;
  is_active?: boolean;
  user_code?: string | null;
}): Promise<LgTeamWorkbasket> {
  const payload: any = {
    team_id: row.team_id,
    workbasket_code: row.workbasket_code,
    responsibility_type: row.responsibility_type,
    can_receive_new_cases: row.can_receive_new_cases ?? true,
    can_auto_assign: row.can_auto_assign ?? false,
    default_for_stage: row.default_for_stage ?? null,
    default_for_case_type: row.default_for_case_type ?? null,
    escalation_target: row.escalation_target ?? false,
    is_active: row.is_active ?? true,
    updated_by: row.user_code ?? null,
  };
  if (row.id) {
    const { data, error } = await sb.from("lg_team_workbasket").update(payload).eq("id", row.id).select().maybeSingle();
    if (error) throw error;
    return data as LgTeamWorkbasket;
  }
  payload.created_by = row.user_code ?? null;
  const { data, error } = await sb.from("lg_team_workbasket").insert(payload).select().maybeSingle();
  if (error) throw error;
  return data as LgTeamWorkbasket;
}

export async function deleteTeamWorkbasket(id: string) {
  const { error } = await sb.from("lg_team_workbasket").delete().eq("id", id);
  if (error) throw error;
}

export async function setTeamWorkbasketActive(id: string, is_active: boolean) {
  const { error } = await sb.from("lg_team_workbasket").update({ is_active }).eq("id", id);
  if (error) throw error;
}

/* ---------------- capability defaults from function ---------------- */

export function capabilityDefaults(fn: LgMemberFunction) {
  switch (fn) {
    case "LAWYER":
      return { can_own_case: true,  can_prepare_documents: true, can_schedule_hearing: true,  can_post_fee: true,  can_generate_notice: true,  can_approve: false };
    case "MANAGER":
      return { can_own_case: true,  can_prepare_documents: true, can_schedule_hearing: true,  can_post_fee: true,  can_generate_notice: true,  can_approve: true  };
    case "CLERK":
      return { can_own_case: false, can_prepare_documents: true, can_schedule_hearing: true,  can_post_fee: false, can_generate_notice: true,  can_approve: false };
    case "SUPPORT":
      return { can_own_case: false, can_prepare_documents: true, can_schedule_hearing: false, can_post_fee: false, can_generate_notice: true,  can_approve: false };
    case "ADMIN":
      return { can_own_case: false, can_prepare_documents: true, can_schedule_hearing: false, can_post_fee: false, can_generate_notice: false, can_approve: true  };
  }
}

/**
 * Suggest a member function and capabilities from the user's existing system roles.
 * This is a one-time suggestion at the moment of adding the member.
 */
export function suggestFromRoles(roles: string[]): { fn: LgMemberFunction; caps: ReturnType<typeof capabilityDefaults> } {
  const has = (r: string) => roles.includes(r);
  if (has("LEGAL_MANAGER"))             return { fn: "MANAGER", caps: capabilityDefaults("MANAGER") };
  if (has("SENIOR_LEGAL_OFFICER"))      return { fn: "LAWYER",  caps: { ...capabilityDefaults("LAWYER"), can_approve: true } };
  if (has("LEGAL_OFFICER") || has("LegalOfficer")) return { fn: "LAWYER", caps: capabilityDefaults("LAWYER") };
  if (has("LEGAL_ADMIN"))               return { fn: "ADMIN",   caps: capabilityDefaults("ADMIN") };
  if (has("LEGAL_READ_ONLY"))           return { fn: "SUPPORT", caps: { ...capabilityDefaults("SUPPORT"), can_prepare_documents: false, can_generate_notice: false } };
  return { fn: "SUPPORT", caps: capabilityDefaults("SUPPORT") };
}
