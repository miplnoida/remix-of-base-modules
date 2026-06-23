import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BENEFIT_ACTION_LABEL,
  LIABILITY_HEAD_LABEL,
  type BenefitActionType,
  type LgCaseAction,
  type LiabilityHeadCode,
} from "@/services/legal/lgCaseActionService";

const sb = supabase as any;

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  action: LgCaseAction | null;
  onClose: () => void;
}

export const ChildActionDrawer: React.FC<Props> = ({ action, onClose }) => {
  const open = !!action;
  const id = action?.id;

  const proceedings = useQuery({
    queryKey: ["lg_proc_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_court_proceeding").select("*").eq("case_action_id", id).order("filing_date", { ascending: false });
      return data ?? [];
    },
  });
  const hearings = useQuery({
    queryKey: ["lg_hearings_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_hearing").select("*").eq("case_action_id", id).order("hearing_date", { ascending: false });
      return data ?? [];
    },
  });
  const orders = useQuery({
    queryKey: ["lg_orders_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_order").select("*").eq("case_action_id", id).order("issued_date", { ascending: false });
      return data ?? [];
    },
  });
  const fees = useQuery({
    queryKey: ["lg_fees_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_fee_charge").select("*").eq("case_action_id", id);
      return data ?? [];
    },
  });
  const docs = useQuery({
    queryKey: ["lg_docs_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_document_link").select("*").eq("case_action_id", id);
      return data ?? [];
    },
  });
  const arrangements = useQuery({
    queryKey: ["lg_arr_for_action", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from("lg_case_action_arrangement").select("*").eq("action_id", id);
      return data ?? [];
    },
  });

  const a = action;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {a && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <Badge variant={a.status === "CLOSED" || a.status === "WITHDRAWN" ? "secondary" : "default"}>{a.status}</Badge>
                <span>
                  {a.action_kind === "LIABILITY"
                    ? LIABILITY_HEAD_LABEL[a.liability_head_code as LiabilityHeadCode] ?? a.liability_head_code
                    : BENEFIT_ACTION_LABEL[a.benefit_action_type as BenefitActionType] ?? a.benefit_action_type}
                </span>
                {a.action_no && <span className="text-sm text-muted-foreground">{a.action_no}</span>}
              </SheetTitle>
              <SheetDescription>
                {a.period_from ? `${a.period_from}${a.period_to && a.period_to !== a.period_from ? ` → ${a.period_to}` : ""}` : "No period set"} · Stage: {a.stage}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {a.action_kind === "LIABILITY" && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Liability Breakdown</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <Stat label="Principal" v={fmt(a.principal_amount)} />
                    <Stat label="Penalty" v={fmt(a.penalty_amount)} />
                    <Stat label="Cost" v={fmt(a.cost_amount)} />
                    <Stat label="Total" v={fmt(a.total_amount)} />
                    <Stat label="Paid" v={fmt(a.amount_paid)} />
                    <Stat label="Outstanding" v={fmt(a.outstanding_amount)} bold />
                  </CardContent>
                </Card>
              )}

              {(a.suit_no || a.judgment_summons_no || a.writ_no || a.warrant_no) && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Court References</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-xs">
                    {a.suit_no && <Stat label="Suit #" v={a.suit_no} />}
                    {a.judgment_summons_no && <Stat label="Judgment Summons #" v={a.judgment_summons_no} />}
                    {a.writ_no && <Stat label="Writ #" v={a.writ_no} />}
                    {a.warrant_no && <Stat label="Warrant #" v={a.warrant_no} />}
                  </CardContent>
                </Card>
              )}

              <LinkedList title="Court Proceedings" q={proceedings} render={(p: any) =>
                <div className="text-xs"><span className="font-mono">{p.court_reference_no}</span> · {p.proceeding_type} · {p.status} · filed {p.filing_date ?? "—"}</div>
              } />
              <LinkedList title="Hearings" q={hearings} render={(h: any) =>
                <div className="text-xs">{h.hearing_date}{h.hearing_time ? ` ${h.hearing_time}` : ""} · {h.hearing_type_code} · {h.outcome_code || h.status || "Pending"}</div>
              } />
              <LinkedList title="Orders / Judgments" q={orders} render={(o: any) =>
                <div className="text-xs">{o.order_no} · {o.order_type_code} · {o.status} · {o.issued_date ?? "—"}</div>
              } />
              <LinkedList title="Fees" q={fees} render={(f: any) =>
                <div className="text-xs">{f.fee_head_code ?? "Fee"} · {fmt(f.amount)} · {f.status ?? ""}</div>
              } />
              <LinkedList title="Linked Documents" q={docs} render={(d: any) =>
                <div className="text-xs">{d.document_name ?? d.document_id?.slice(0, 8)} · {d.link_type ?? ""}</div>
              } />
              <LinkedList title="Linked Payment Arrangements" q={arrangements} render={(l: any) =>
                <div className="text-xs">Arrangement {String(l.payment_arrangement_id).slice(0, 8)} · allocated {fmt(l.allocated_amount)}</div>
              } />

              {a.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm whitespace-pre-wrap">{a.notes}</div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

function Stat({ label, v, bold }: { label: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className="border rounded p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={bold ? "font-semibold" : ""}>{v}</div>
    </div>
  );
}

function LinkedList({ title, q, render }: { title: string; q: any; render: (r: any) => React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="text-xs text-muted-foreground">None linked.</div>
        ) : (
          <div className="space-y-1">
            {(q.data as any[]).map((r, i) => (
              <div key={r.id ?? i} className="border rounded p-2">{render(r)}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ChildActionDrawer;
