// Cross-case registry queries over lg_* tables.
// Used by legacy "global" Legal screens (Court Orders, Enforcement, Payment Plans, Evidence).
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgOrderRow {
  id: string;
  order_no: string;
  lg_case_id: string;
  order_type_code: string;
  issued_by_court: string | null;
  issued_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  ordered_amount: number | null;
  status: string;
  terms: string | null;
  lg_case?: { lg_case_no: string; summary: string | null; status_code: string } | null;
}

export async function listAllLgOrders(filter?: { type?: string; status?: string }) {
  let q = sb
    .from("lg_order")
    .select("*, lg_case:lg_case_id (lg_case_no, summary, status_code)")
    .order("issued_date", { ascending: false })
    .limit(500);
  if (filter?.type) q = q.eq("order_type_code", filter.type);
  if (filter?.status) q = q.eq("status", filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LgOrderRow[];
}

export interface LgSettlementRow {
  id: string;
  lg_case_id: string;
  proposed_amount: number | null;
  agreed_amount: number | null;
  currency_code: string | null;
  status: string;
  payment_arrangement_id: string | null;
  proposed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  lg_case?: { lg_case_no: string; summary: string | null } | null;
}
export async function listAllLgSettlements() {
  const { data, error } = await sb
    .from("lg_settlement")
    .select("*, lg_case:lg_case_id (lg_case_no, summary)")
    .order("proposed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as LgSettlementRow[];
}

export interface LgArrangementLinkRow {
  id: string;
  lg_case_id: string;
  payment_arrangement_id: string;
  link_type: string;
  link_reason: string | null;
  source_module: string;
  linked_at: string;
  default_monitoring_required: boolean;
  lg_case?: { lg_case_no: string; summary: string | null; status_code: string } | null;
}
export async function listAllLgArrangementLinks() {
  const { data, error } = await sb
    .from("lg_payment_arrangement_link")
    .select("*, lg_case:lg_case_id (lg_case_no, summary, status_code)")
    .order("linked_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as LgArrangementLinkRow[];
}

export interface LgDocumentLinkRow {
  id: string;
  lg_case_id: string;
  document_category_code: string;
  document_source: string;
  document_ref_no: string | null;
  title: string | null;
  filed_date: string | null;
  uploaded_at: string;
  court_filed: boolean;
  confidential: boolean;
  notes: string | null;
  lg_case?: { lg_case_no: string; summary: string | null } | null;
}
export async function listAllLgDocumentLinks(filter?: { category?: string; search?: string }) {
  let q = sb
    .from("lg_document_link")
    .select("*, lg_case:lg_case_id (lg_case_no, summary)")
    .order("uploaded_at", { ascending: false })
    .limit(500);
  if (filter?.category) q = q.eq("document_category_code", filter.category);
  if (filter?.search) q = q.or(`title.ilike.%${filter.search}%,document_ref_no.ilike.%${filter.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LgDocumentLinkRow[];
}
