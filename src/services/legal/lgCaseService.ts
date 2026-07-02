import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LgCase = Database["public"]["Tables"]["lg_case"]["Row"];
export type LgCaseInsert = Database["public"]["Tables"]["lg_case"]["Insert"];
export type LgCaseUpdate = Database["public"]["Tables"]["lg_case"]["Update"];
export type LgNotice = Database["public"]["Tables"]["lg_notice"]["Row"];
export type LgNoticeInsert = Database["public"]["Tables"]["lg_notice"]["Insert"];

/** Legal reference values are stored centrally in core_reference_value (module_code='LEGAL'). */
export interface LgReferenceValue {
  id: string;
  group_code: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  status: string;
}

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
  const { generateNumber } = await import("@/services/core/coreNumberingService");
  const r = await generateNumber({ moduleCode: "LEGAL", entityType: "LEGAL_CASE", countryCode: "SKN" });
  return r.generatedNumber;
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
  const db = supabase as any;
  const { data: g } = await db
    .from("core_reference_group")
    .select("id")
    .eq("group_code", groupCode)
    .in("module_code", ["LEGAL", "COMMON"])
    .maybeSingle();
  if (!g) return [];
  const { data, error } = await db
    .from("core_reference_value")
    .select("id, value_code, value_label, sort_order, is_active, status")
    .eq("group_id", g.id)
    .eq("status", "ACTIVE")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    group_code: groupCode,
    code: r.value_code,
    label: r.value_label,
    sort_order: r.sort_order,
    is_active: r.is_active,
    status: r.status,
  }));
}

export async function listLgNotices(caseId?: string): Promise<LgNotice[]> {
  let q = supabase.from("lg_notice").select("*").order("created_at", { ascending: false }).limit(500);
  if (caseId) q = q.eq("lg_case_id", caseId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function generateLgNoticeNo(): Promise<string> {
  const { generateNumber } = await import("@/services/core/coreNumberingService");
  const r = await generateNumber({ moduleCode: "LEGAL", entityType: "LEGAL_NOTICE", countryCode: "SKN" });
  return r.generatedNumber;
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

/**
 * Legal Notice lifecycle:
 *   DRAFT → PENDING_APPROVAL → APPROVED → SENT → (ACKNOWLEDGED)
 *   any → CANCELLED
 * Every status change is written to `lg_case_activity` via `logLgActivity`
 * by the calling hook.
 */
export const LG_NOTICE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACKNOWLEDGED",
  "CANCELLED",
] as const;
export type LgNoticeStatus = (typeof LG_NOTICE_STATUSES)[number];

export async function updateLgNotice(id: string, patch: Partial<LgNotice>): Promise<LgNotice> {
  const { data, error } = await supabase.from("lg_notice").update(patch as any).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function submitLgNoticeForApproval(id: string, userCode: string | null): Promise<LgNotice> {
  return updateLgNotice(id, { status: "PENDING_APPROVAL", updated_at: new Date().toISOString() } as any);
}

export async function approveLgNotice(id: string, userCode: string | null): Promise<LgNotice> {
  return updateLgNotice(id, {
    status: "APPROVED",
    generated_by: userCode,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any);
}

export async function dispatchLgNotice(
  id: string,
  opts: { channel: string; userCode: string | null },
): Promise<LgNotice> {
  const now = new Date().toISOString();
  return updateLgNotice(id, {
    status: "SENT",
    delivery_channel: opts.channel,
    delivery_status: "SENT",
    sent_at: now,
    sent_by: opts.userCode,
    updated_at: now,
  } as any);
}

export async function cancelLgNotice(id: string): Promise<LgNotice> {
  return updateLgNotice(id, { status: "CANCELLED", updated_at: new Date().toISOString() } as any);
}

