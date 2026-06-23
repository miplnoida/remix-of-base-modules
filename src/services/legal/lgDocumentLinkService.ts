import { supabase } from "@/integrations/supabase/client";

export interface LgDocumentLink {
  id: string;
  lg_case_id: string;
  document_category_code: string;
  document_type_code: string | null;
  document_source: string;
  document_ref_id: string | null;
  document_ref_no: string | null;
  title: string | null;
  notes: string | null;
  linked_stage_code: string | null;
  hearing_id: string | null;
  order_id: string | null;
  settlement_id: string | null;
  notice_id: string | null;
  fee_charge_id: string | null;
  version_no: number;
  court_filed: boolean;
  filed_date: string | null;
  confidential: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  linked_by: string | null;
  linked_at: string;
}

export type LgDocumentLinkInsert = Omit<LgDocumentLink, "id" | "uploaded_at" | "linked_at" | "version_no"> & {
  version_no?: number;
};

const TABLE = "lg_document_link" as const;

export async function listLgDocumentLinks(caseId: string): Promise<LgDocumentLink[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("lg_case_id", caseId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LgDocumentLink[];
}

export async function createLgDocumentLink(input: LgDocumentLinkInsert): Promise<LgDocumentLink> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as LgDocumentLink;
}

export async function deleteLgDocumentLink(id: string): Promise<void> {
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
