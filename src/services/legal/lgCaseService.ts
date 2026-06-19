import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LgCase = Database["public"]["Tables"]["lg_case"]["Row"];
export type LgCaseInsert = Database["public"]["Tables"]["lg_case"]["Insert"];
export type LgCaseUpdate = Database["public"]["Tables"]["lg_case"]["Update"];
export type LgNotice = Database["public"]["Tables"]["lg_notice"]["Row"];
export type LgNoticeInsert = Database["public"]["Tables"]["lg_notice"]["Insert"];
export type LgReferenceValue = Database["public"]["Tables"]["lg_reference_value"]["Row"];

export interface LgCaseListFilters {
  search?: string;
  status_code?: string;
  case_type_code?: string;
  priority_code?: string;
  current_stage_code?: string;
}

export async function listLgCases(filters: LgCaseListFilters = {}): Promise<LgCase[]> {
  let q = supabase.from("lg_case").select("*").order("created_at", { ascending: false }).limit(500);
  if (filters.status_code) q = q.eq("status_code", filters.status_code);
  if (filters.case_type_code) q = q.eq("case_type_code", filters.case_type_code);
  if (filters.priority_code) q = q.eq("priority_code", filters.priority_code);
  if (filters.current_stage_code) q = q.eq("current_stage_code", filters.current_stage_code);
  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    q = q.or(`lg_case_no.ilike.${s},summary.ilike.${s},court_case_no.ilike.${s},next_action.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getLgCase(id: string): Promise<LgCase | null> {
  const { data, error } = await supabase.from("lg_case").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function generateLgCaseNo(): Promise<string> {
  const yr = new Date().getFullYear();
  const { data, error } = await supabase
    .from("lg_case")
    .select("lg_case_no")
    .like("lg_case_no", `LG-${yr}-%`)
    .order("lg_case_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.lg_case_no;
  const next = last ? parseInt(last.split("-").pop() || "0", 10) + 1 : 1;
  return `LG-${yr}-${String(next).padStart(6, "0")}`;
}

export async function createLgCase(input: Omit<LgCaseInsert, "lg_case_no"> & { lg_case_no?: string }): Promise<LgCase> {
  const lg_case_no = input.lg_case_no ?? (await generateLgCaseNo());
  const { data, error } = await supabase
    .from("lg_case")
    .insert({ ...input, lg_case_no })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateLgCase(id: string, patch: LgCaseUpdate): Promise<LgCase> {
  const { data, error } = await supabase.from("lg_case").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function listLgReferenceValues(groupCode: string): Promise<LgReferenceValue[]> {
  const { data, error } = await supabase
    .from("lg_reference_value")
    .select("*")
    .eq("group_code", groupCode)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listLgNotices(caseId?: string): Promise<LgNotice[]> {
  let q = supabase.from("lg_notice").select("*").order("created_at", { ascending: false }).limit(500);
  if (caseId) q = q.eq("lg_case_id", caseId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function generateLgNoticeNo(): Promise<string> {
  const yr = new Date().getFullYear();
  const { data, error } = await supabase
    .from("lg_notice")
    .select("notice_no")
    .like("notice_no", `LN-${yr}-%`)
    .order("notice_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.notice_no;
  const next = last ? parseInt(last.split("-").pop() || "0", 10) + 1 : 1;
  return `LN-${yr}-${String(next).padStart(6, "0")}`;
}

export async function createLgNotice(input: Omit<LgNoticeInsert, "notice_no"> & { notice_no?: string }): Promise<LgNotice> {
  const notice_no = input.notice_no ?? (await generateLgNoticeNo());
  const { data, error } = await supabase
    .from("lg_notice")
    .insert({ ...input, notice_no })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
