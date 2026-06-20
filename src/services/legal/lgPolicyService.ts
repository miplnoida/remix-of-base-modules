import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export async function updateDepartmentProfile(id: string, patch: Record<string, any>, userCode?: string) {
  const { error } = await sb
    .from("lg_department_profile")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: userCode ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function upsertRoleMapping(row: any) {
  const { error } = await sb.from("lg_role_type_mapping").upsert(row);
  if (error) throw error;
}

export async function deleteRoleMapping(id: string) {
  const { error } = await sb.from("lg_role_type_mapping").delete().eq("id", id);
  if (error) throw error;
}

export async function updateWorkflowPolicy(id: string, patch: Record<string, any>, userCode?: string) {
  const { error } = await sb
    .from("lg_workflow_policy")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: userCode ?? null })
    .eq("id", id);
  if (error) throw error;
}
