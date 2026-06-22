import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LgMemberFunction = "LAWYER" | "SUPPORT" | "CLERK" | "MANAGER" | "ADMIN";

export interface LgTeam {
  id: string;
  team_code: string;
  team_name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface LgTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_code: string;
  member_function: LgMemberFunction;
  can_own_case: boolean;
  can_prepare_documents: boolean;
  can_schedule_hearing: boolean;
  can_post_fee: boolean;
  can_generate_notice: boolean;
  can_approve: boolean;
  is_active: boolean;
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

export async function listTeams(): Promise<LgTeam[]> {
  const { data, error } = await sb.from("lg_team").select("*").order("is_default", { ascending: false }).order("team_name");
  if (error) throw error;
  return data ?? [];
}

export async function listTeamMembers(teamId?: string): Promise<LgTeamMember[]> {
  let q = sb.from("lg_team_member").select("*").order("created_at", { ascending: true });
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertTeamMember(row: Partial<LgTeamMember> & { team_id: string; user_id: string; role_code: string }) {
  // capability defaults derived from function if not provided
  const fn = row.member_function ?? "LAWYER";
  const defaults = capabilityDefaults(fn);
  const payload = { ...defaults, ...row, member_function: fn };
  const { data, error } = await sb.from("lg_team_member").upsert(payload, { onConflict: "team_id,user_id" }).select().maybeSingle();
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

export async function listWorkbasketRoles(): Promise<LgWorkbasketRole[]> {
  const { data, error } = await sb.from("lg_workbasket_role").select("*").order("workbasket_code");
  if (error) throw error;
  return data ?? [];
}

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
