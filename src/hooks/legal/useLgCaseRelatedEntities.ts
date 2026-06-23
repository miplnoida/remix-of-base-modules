import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgRelatedEntity {
  id: string;
  label: string;
}

export interface LgRelatedEntities {
  hearings: LgRelatedEntity[];
  orders: LgRelatedEntity[];
  notices: LgRelatedEntity[];
  settlements: LgRelatedEntity[];
  feeCharges: LgRelatedEntity[];
}

/**
 * Loads small option lists for the document-link entity selectors
 * (hearing / order / notice / settlement / fee charge) scoped to one case.
 */
export function useLgCaseRelatedEntities(lgCaseId: string | undefined) {
  return useQuery<LgRelatedEntities>({
    queryKey: ["lg_case_related_entities", lgCaseId],
    enabled: !!lgCaseId,
    staleTime: 60_000,
    queryFn: async () => {
      const id = lgCaseId as string;

      const [hearings, orders, notices, settlements, feeCharges] = await Promise.all([
        sb.from("lg_hearing")
          .select("id, hearing_date, scheduled_at, court_name, hearing_type_code, status")
          .eq("lg_case_id", id)
          .order("hearing_date", { ascending: false })
          .limit(100),
        sb.from("lg_order")
          .select("id, order_no, order_type_code, issued_date, status")
          .eq("lg_case_id", id)
          .order("issued_date", { ascending: false })
          .limit(100),
        sb.from("lg_notice")
          .select("id, notice_no, notice_type_code, issued_date, status")
          .eq("lg_case_id", id)
          .order("issued_date", { ascending: false })
          .limit(100),
        sb.from("lg_settlement")
          .select("id, status, created_at, agreed_amount, currency_code")
          .eq("lg_case_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
        sb.from("lg_fee_charge")
          .select("id, fee_head_code, amount, currency_code, charge_date, status")
          .eq("lg_case_id", id)
          .order("charge_date", { ascending: false })
          .limit(100),
      ]);

      const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");

      return {
        hearings: ((hearings.data ?? []) as any[]).map((h) => ({
          id: h.id,
          label: `${h.hearing_type_code || "Hearing"} · ${fmtDate(h.hearing_date || h.scheduled_at)} · ${h.court_name || ""}`.trim(),
        })),
        orders: ((orders.data ?? []) as any[]).map((o) => ({
          id: o.id,
          label: `${o.order_no || o.order_type_code || "Order"} · ${fmtDate(o.issued_date)}`,
        })),
        notices: ((notices.data ?? []) as any[]).map((n) => ({
          id: n.id,
          label: `${n.notice_no || n.notice_type_code || "Notice"} · ${fmtDate(n.issued_date)}`,
        })),
        settlements: ((settlements.data ?? []) as any[]).map((s) => ({
          id: s.id,
          label: `Settlement · ${s.agreed_amount ?? "—"} ${s.currency_code ?? ""} · ${s.status ?? ""}`.trim(),
        })),
        feeCharges: ((feeCharges.data ?? []) as any[]).map((f) => ({
          id: f.id,
          label: `${f.fee_head_code || "Fee"} · ${f.amount ?? "—"} ${f.currency_code ?? ""} · ${fmtDate(f.charge_date)}`,
        })),
      };
    },
  });
}
