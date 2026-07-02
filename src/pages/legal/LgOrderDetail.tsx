import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/common/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import { LG_ORDER_STATUS_LABEL, LG_ORDER_COMPLIANCE_LABEL, allowedNextLgOrderStatuses } from "@/services/legal/lgOrderStateMachine";
import { LG_ORDER_TYPES } from "@/types/legal/judicial";
import { OrderComplianceTab } from "@/components/legal/order/OrderComplianceTab";
import { OrderAppealsTab } from "@/components/legal/order/OrderAppealsTab";
import { OrderEnforcementTab } from "@/components/legal/order/OrderEnforcementTab";
import { OrderLinkedLiabilitiesTab } from "@/components/legal/order/OrderLinkedLiabilitiesTab";
import { changeLgOrderStatus } from "@/services/legal/lgOrderService";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

export default function LgOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [tab, setTab] = useState("overview");

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["lg_order_detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from("lg_order")
        .select("*, lg_case:lg_case_id(id, lg_case_no, summary), lg_hearing:hearing_id(id, hearing_date, hearing_type_code)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <PageShell title="Order"><div className="p-6">Loading…</div></PageShell>;
  if (!order) return <PageShell title="Order"><div className="p-6">Order not found</div></PageShell>;

  const typeLabel = LG_ORDER_TYPES.find(t => t.code === order.order_type_code)?.label ?? order.order_type_code;
  const nextStatuses = allowedNextLgOrderStatuses(order.status);

  const doChangeStatus = async (to: string) => {
    try {
      await changeLgOrderStatus(order.id, to as any, { userCode });
      toast.success(`Status updated to ${LG_ORDER_STATUS_LABEL[to as keyof typeof LG_ORDER_STATUS_LABEL] ?? to}`);
      qc.invalidateQueries({ queryKey: ["lg_order_detail", id] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change status");
    }
  };

  return (
    <PageShell
      title={`${order.order_no} — ${typeLabel}`}
      subtitle={order.lg_case?.lg_case_no ? `Matter ${order.lg_case.lg_case_no}` : undefined}
    >
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/legal/lg/orders")}><ArrowLeft className="h-4 w-4 mr-1" />Back to Orders</Button>
        <Link to={`/legal/lg/cases/${order.lg_case_id}`} className="text-sm text-primary flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open Matter</Link>
        <div className="flex-1" />
        <Badge variant={order.status === "BREACHED" ? "destructive" : "outline"}>{LG_ORDER_STATUS_LABEL[order.status as keyof typeof LG_ORDER_STATUS_LABEL] ?? order.status}</Badge>
        {nextStatuses.length > 0 && access.can("editOrder") && (
          <div className="flex gap-1">
            {nextStatuses.slice(0, 4).map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => doChangeStatus(s)}>
                → {LG_ORDER_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="liabilities">Linked Liabilities</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="appeals">Appeals</TabsTrigger>
          <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Field label="Order No" value={order.order_no} />
              <Field label="Type" value={typeLabel} />
              <Field label="Court" value={order.issued_by_court} />
              <Field label="Court File No" value={order.court_file_no} />
              <Field label="Judge / Magistrate" value={order.judge_name} />
              <Field label="Order Date" value={order.issued_date && formatDateForDisplay(order.issued_date)} />
              <Field label="Effective Date" value={order.effective_date && formatDateForDisplay(order.effective_date)} />
              <Field label="Compliance Due" value={order.compliance_date && formatDateForDisplay(order.compliance_date)} />
              <Field label="Appeal Deadline" value={order.appeal_deadline && formatDateForDisplay(order.appeal_deadline)} />
              <Field label="Amount Ordered" value={order.ordered_amount != null ? `EC$${Number(order.ordered_amount).toLocaleString()}` : "—"} />
              <Field label="Costs Awarded" value={order.costs_awarded != null ? `EC$${Number(order.costs_awarded).toLocaleString()}` : "—"} />
              <Field label="Interest" value={order.interest_awarded != null ? `EC$${Number(order.interest_awarded).toLocaleString()}` : "—"} />
              <Field label="Penalty" value={order.penalty_awarded != null ? `EC$${Number(order.penalty_awarded).toLocaleString()}` : "—"} />
              <Field label="Compliance Status" value={LG_ORDER_COMPLIANCE_LABEL[(order.compliance_status ?? "NOT_STARTED") as keyof typeof LG_ORDER_COMPLIANCE_LABEL]} />
              <Field label="Appeal Status" value={order.appeal_status && order.appeal_status !== "NONE" ? order.appeal_status : "—"} />
              <Field label="Enforcement Status" value={order.enforcement_status && order.enforcement_status !== "NONE" ? order.enforcement_status : "—"} />
              <Field label="Hearing" value={order.lg_hearing?.hearing_date ? formatDateForDisplay(order.lg_hearing.hearing_date) : "—"} />
              <Field label="Enforcement Ref" value={order.enforcement_ref} />
            </CardContent>
            {order.terms && (
              <CardContent className="pt-0 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Terms</div>
                <div className="whitespace-pre-wrap">{order.terms}</div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="liabilities" className="mt-4">
          <OrderLinkedLiabilitiesTab orderId={order.id} caseId={order.lg_case_id} />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          <OrderComplianceTab orderId={order.id} caseId={order.lg_case_id} />
        </TabsContent>
        <TabsContent value="appeals" className="mt-4">
          <OrderAppealsTab orderId={order.id} caseId={order.lg_case_id} />
        </TabsContent>
        <TabsContent value="enforcement" className="mt-4">
          <OrderEnforcementTab orderId={order.id} caseId={order.lg_case_id} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <OrderTimeline orderId={order.id} caseId={order.lg_case_id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function OrderTimeline({ orderId, caseId }: { orderId: string; caseId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["lg_order_timeline", orderId],
    queryFn: async () => {
      const { data } = await sb.from("lg_case_activity")
        .select("*").eq("lg_case_id", caseId)
        .or(`payload->>order_id.eq.${orderId},activity_type.like.ORDER_%`)
        .order("performed_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  return (
    <Card>
      <CardContent className="pt-4 space-y-2 text-sm">
        {data.length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
        {data.map((a: any) => (
          <div key={a.id} className="border-l-2 border-primary/40 pl-3 py-1">
            <div className="text-xs text-muted-foreground">{formatDateForDisplay(a.performed_at)} · {a.activity_type}</div>
            <div>{a.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
