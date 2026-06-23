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
  const { generateNumber } = await import("@/services/core/coreNumberingService");
  const r = await generateNumber({ moduleCode: "LEGAL", entityType: "ORDER", countryCode: "SKN" });
  return r.generatedNumber;
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
  // Fire-and-forget: auto-apply fees mapped to JUDGMENT_RECORDED when a judgment-style order is recorded
  try {
    const judgmentLike = String(input.order_type_code || "").toUpperCase().includes("JUDGMENT");
    if (judgmentLike) {
      const { autoApplyForEvent } = await import("@/services/legal/lgFeeEngineService");
      autoApplyForEvent(input.lg_case_id, "JUDGMENT_RECORDED", input.created_by ?? null).catch(() => {});
    }
  } catch { /* non-blocking */ }
  return data;
}
