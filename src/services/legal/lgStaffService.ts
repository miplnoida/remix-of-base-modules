import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgStaff {
  id: string;
  user_id: string;
  user_code: string | null;
  full_name: string;
  email: string | null;
  role_code: string | null;
  team_id: string | null;
  office_code: string | null;
  is_active: boolean;
  availability: "available" | "leave" | "inactive";
  max_active_cases: number;
  max_high_priority_cases: number;
  skills: string[];
  notes: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export type LgStaffInsert = Omit<LgStaff, "id" | "created_at" | "updated_at"> & {
  created_by?: string | null;
  updated_by?: string | null;
};
export type LgStaffUpdate = Partial<LgStaffInsert>;

export const SKILL_OPTIONS = [
  "immigration",
  "litigation",
  "compliance",
  "appeals",
  "investigations",
  "fee_reviews",
] as const;

export async function listStaff(): Promise<LgStaff[]> {
  const { data, error } = await sb
    .from("lg_staff")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LgStaff[];
}

export async function createStaff(row: LgStaffInsert): Promise<LgStaff> {
  const { data, error } = await sb.from("lg_staff").insert(row).select().single();
  if (error) throw error;
  return data as LgStaff;
}

export async function updateStaff(id: string, patch: LgStaffUpdate): Promise<LgStaff> {
  const { data, error } = await sb.from("lg_staff").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as LgStaff;
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await sb.from("lg_staff").delete().eq("id", id);
  if (error) throw error;
}
