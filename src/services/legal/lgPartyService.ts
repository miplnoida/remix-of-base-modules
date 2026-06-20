import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgPartyInsert {
  lg_case_id: string;
  party_role: string;
  party_type: string;
  display_name: string;
  external_ref_id?: string | null;
  contact_info?: Record<string, unknown> | null;
  representative_name?: string | null;
  notes?: string | null;
}

export async function listLgParties(lgCaseId: string) {
  const { data, error } = await sb
    .from("lg_case_party")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createLgParty(input: LgPartyInsert) {
  const { data, error } = await sb.from("lg_case_party").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteLgParty(id: string) {
  const { error } = await sb.from("lg_case_party").delete().eq("id", id);
  if (error) throw error;
}

/** Assign / re-assign the legal officer using lg_case_assignment + denormalised lg_case.assigned_legal_officer_id. */
export async function assignLegalOfficer(input: {
  lg_case_id: string;
  assigned_to_user_id: string;
  assigned_team_code?: string | null;
  reason?: string | null;
  assigned_by?: string | null;
}) {
  // Close previous active assignment(s)
  await sb
    .from("lg_case_assignment")
    .update({ is_current: false, unassigned_at: new Date().toISOString() })
    .eq("lg_case_id", input.lg_case_id)
    .eq("is_current", true);

  const { data, error } = await sb
    .from("lg_case_assignment")
    .insert({
      lg_case_id: input.lg_case_id,
      assigned_to_user_id: input.assigned_to_user_id,
      assigned_team_code: input.assigned_team_code ?? null,
      assignment_role: "PRIMARY",
      assigned_by: input.assigned_by ?? null,
      reason: input.reason ?? null,
      is_current: true,
    })
    .select("*")
    .single();
  if (error) throw error;

  await sb
    .from("lg_case")
    .update({
      assigned_legal_officer_id: input.assigned_to_user_id,
      assigned_team_code: input.assigned_team_code ?? null,
    })
    .eq("id", input.lg_case_id);

  return data;
}
