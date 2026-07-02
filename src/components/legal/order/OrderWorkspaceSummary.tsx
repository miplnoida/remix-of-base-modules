/**
 * EPIC-06C Phase 3 — Executive Judicial Order Workspace summary cards.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const money = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "XCD" }).format(v);

interface Props { orderId: string }

async function loadOrderSummary(orderId: string) {
  const { data: order } = await sb.from("lg_order").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const [liabilities, appeals, enforcement, complianceEvents] = await Promise.all([
    sb.from("lg_order_liability")
      .select("*, lg_recoverable_liability:liability_id(outstanding, total_assessed, paid)")
      .eq("order_id", orderId).then((r: any) => r.data ?? []),
    sb.from("lg_appeal").select("id, status").eq("order_id", orderId).then((r: any) => r.data ?? []),
    sb.from("lg_enforcement_action").select("id, status").eq("order_id", orderId).then((r: any) => r.data ?? []),
    sb.from("lg_order_compliance_event").select("id, event_type").eq("order_id", orderId).then((r: any) => r.data ?? []),
  ]);
  const outstanding = liabilities.reduce((s: number, l: any) => s + Number(l.lg_recoverable_liability?.outstanding || 0), 0);
  const assessed = liabilities.reduce((s: number, l: any) => s + Number(l.lg_recoverable_liability?.total_assessed || 0), 0);
  const paid = liabilities.reduce((s: number, l: any) => s + Number(l.lg_recoverable_liability?.paid || 0), 0);
  const complied = complianceEvents.filter((c: any) => c.event_type === "COMPLIED").length;
  const totalEvents = complianceEvents.length;
  const daysToDeadline = order.compliance_date
    ? Math.ceil((new Date(order.compliance_date).getTime() - Date.now()) / 86_400_000)
    : null;
  const enfInProgress = enforcement.filter((e: any) => ["INITIATED", "IN_PROGRESS"].includes(e.status)).length;
  const activeAppeals = appeals.filter((a: any) => ["FILED", "UNDER_REVIEW"].includes(a.status)).length;
  return {
    order, outstanding, assessed, paid, activeAppeals, enfInProgress,
    daysToDeadline, compliancePct: totalEvents ? (complied / totalEvents) * 100 : 0,
    liabilityCount: liabilities.length,
  };
}

export function OrderWorkspaceSummary({ orderId }: Props) {
  const q = useQuery({
    queryKey: ["lg-order-summary", orderId],
    queryFn: () => loadOrderSummary(orderId),
    staleTime: 30_000,
  });

  if (q.isLoading || !q.data) return <Skeleton className="h-24 w-full" />;
  const s = q.data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Order Status</div>
        <div className="text-base font-semibold">{s.order.status}</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Compliance %</div>
        <div className="text-base font-semibold">{s.compliancePct.toFixed(0)}%</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Days to Deadline</div>
        <div className={`text-base font-semibold ${s.daysToDeadline !== null && s.daysToDeadline < 0 ? "text-destructive" : ""}`}>
          {s.daysToDeadline === null ? "—" : s.daysToDeadline}
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Outstanding</div>
        <div className="text-base font-semibold">{money(s.outstanding)}</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Active Appeals</div>
        <div className="text-base font-semibold">{s.activeAppeals}</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground">Enforcement</div>
        <div className="text-base font-semibold">{s.enfInProgress}</div>
      </CardContent></Card>
    </div>
  );
}

export default OrderWorkspaceSummary;
