import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgOrderInsert {
  lg_case_id: string;
  order_no?: string;
  order_type_code: string;
  issued_by_court?: string | null;
  issued_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  ordered_amount?: number | null;
  terms?: string | null;
  status?: string;
  created_by?: string | null;
}

export async function generateLgOrderNo(): Promise<string> {
  const yr = new Date().getFullYear();
  const { data } = await sb
    .from("lg_order")
    .select("order_no")
    .like("order_no", `LO-${yr}-%`)
    .order("order_no", { ascending: false })
    .limit(1);
  const last = data?.[0]?.order_no;
  const next = last ? parseInt(String(last).split("-").pop() || "0", 10) + 1 : 1;
  return `LO-${yr}-${String(next).padStart(6, "0")}`;
}

export async function listLgOrders(lgCaseId: string) {
  const { data, error } = await sb
    .from("lg_order")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("issued_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLgOrder(input: LgOrderInsert) {
  const order_no = input.order_no ?? (await generateLgOrderNo());
  const { data, error } = await sb
    .from("lg_order")
    .insert({ status: "ISSUED", ...input, order_no })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
