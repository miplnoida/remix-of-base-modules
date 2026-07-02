/**
 * EPIC-06C — Reusable Liability 360 Drawer.
 *
 * Single canonical liability inspection surface used by Recovery Workbench,
 * Order Detail, Appeal, Enforcement, Hearing and Matter Workspace. Replaces
 * duplicate per-module liability views.
 *
 * All data is loaded from existing services — no new DB, no mock data.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getLiability } from "@/services/legal/lgLiabilityService";
import { listAppealsForCase } from "@/services/legal/lgAppealService";
import { listEnforcementForCase } from "@/services/legal/lgEnforcementService";
import type { RecoverableLiability } from "@/types/legal/liability";

const sb = supabase as any;

interface Props {
  liabilityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const money = (v: number | null | undefined) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "XCD" }).format(Number(v || 0));

async function loadDrawerData(id: string) {
  const liab = await getLiability(id);
  if (!liab) return { liab: null, orders: [], appeals: [], enforcement: [], allocations: [], activity: [] };

  const [orders, allocations, activity, appeals, enforcement] = await Promise.all([
    sb.from("lg_order_liability")
      .select("*, lg_order:order_id(id, order_no, order_type_code, status, issued_date, compliance_date, ordered_amount)")
      .eq("liability_id", id)
      .then((r: any) => (r.data ?? []).map((row: any) => row.lg_order).filter(Boolean)),
    sb.from("lg_payment_allocation").select("*").eq("liability_id", id).order("created_at", { ascending: false })
      .then((r: any) => r.data ?? []),
    sb.from("lg_liability_audit").select("*").eq("liability_id", id).order("created_at", { ascending: false }).limit(50)
      .then((r: any) => r.data ?? []),
    liab.lg_case_id ? listAppealsForCase(liab.lg_case_id).catch(() => []) : Promise.resolve([]),
    liab.lg_case_id ? listEnforcementForCase(liab.lg_case_id).catch(() => []) : Promise.resolve([]),
  ]);

  const orderIds = new Set(orders.map((o: any) => o.id));
  const relatedAppeals = (appeals as any[]).filter((a) => orderIds.has(a.order_id));
  const relatedEnforcement = (enforcement as any[]).filter((e) => orderIds.has(e.order_id));

  return { liab, orders, appeals: relatedAppeals, enforcement: relatedEnforcement, allocations, activity };
}

export function Liability360Drawer({ liabilityId, open, onOpenChange }: Props) {
  const q = useQuery({
    queryKey: ["lg-liability-360", liabilityId],
    queryFn: () => loadDrawerData(liabilityId!),
    enabled: !!liabilityId && open,
    staleTime: 30_000,
  });

  const liab = q.data?.liab as RecoverableLiability | null | undefined;

  const recoveryPct = useMemo(() => {
    if (!liab) return 0;
    const total = Number(liab.total_assessed || 0);
    return total > 0 ? Math.min(100, (Number(liab.paid || 0) / total) * 100) : 0;
  }, [liab]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Liability 360°</SheetTitle>
          <SheetDescription>
            {liab
              ? `${liab.liability_type} · ${liab.fund_type ?? "—"} · ${liab.assessment_number ?? liab.id.slice(0, 8)}`
              : "Loading liability…"}
          </SheetDescription>
        </SheetHeader>

        {q.isLoading || !liab ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4 grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Assessed</div><div className="font-semibold">{money(liab.total_assessed)}</div></div>
                <div><div className="text-muted-foreground text-xs">Paid</div><div className="font-semibold">{money(liab.paid)}</div></div>
                <div><div className="text-muted-foreground text-xs">Outstanding</div><div className="font-semibold text-destructive">{money(liab.outstanding)}</div></div>
                <div className="col-span-3">
                  <div className="text-muted-foreground text-xs mb-1">Recovery {recoveryPct.toFixed(1)}%</div>
                  <Progress value={recoveryPct} />
                </div>
                <div className="col-span-3 flex flex-wrap gap-1">
                  <Badge variant="outline">Legal: {liab.legal_status}</Badge>
                  <Badge variant="outline">Recovery: {liab.recovery_status}</Badge>
                  {liab.order_status && <Badge variant="outline">Order: {liab.order_status}</Badge>}
                  {liab.appeal_status && <Badge variant="outline">Appeal: {liab.appeal_status}</Badge>}
                  {liab.enforcement_status && <Badge variant="outline">Enf: {liab.enforcement_status}</Badge>}
                  {liab.arrangement_status && <Badge variant="outline">Arr: {liab.arrangement_status}</Badge>}
                  {liab.risk_level && <Badge variant={liab.risk_level === "CRITICAL" ? "destructive" : "secondary"}>Risk: {liab.risk_level}</Badge>}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="financials">
              <TabsList className="grid grid-cols-6 h-auto">
                <TabsTrigger value="financials">Financials</TabsTrigger>
                <TabsTrigger value="orders">Orders ({q.data?.orders.length ?? 0})</TabsTrigger>
                <TabsTrigger value="appeals">Appeals ({q.data?.appeals.length ?? 0})</TabsTrigger>
                <TabsTrigger value="enforcement">Enf ({q.data?.enforcement.length ?? 0})</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
              </TabsList>

              <TabsContent value="financials" className="text-sm space-y-1">
                <Row label="Principal" value={money(liab.principal)} />
                <Row label="Interest" value={money(liab.interest)} />
                <Row label="Penalty" value={money(liab.penalty)} />
                <Row label="Court Cost" value={money(liab.court_cost)} />
                <Row label="Legal Cost" value={money(liab.legal_cost)} />
                <Row label="Other Cost" value={money(liab.other_cost)} />
                <Row label="Currency" value={`${liab.currency} @ ${liab.exchange_rate ?? 1}`} />
                <Row label="Allocation Rule" value={liab.allocation_rule ?? "—"} />
                <Row label="Limitation" value={liab.limitation_date ?? "—"} />
              </TabsContent>

              <TabsContent value="orders">
                {(q.data?.orders ?? []).length === 0 ? (
                  <Empty label="No orders linked." />
                ) : (
                  <ul className="text-sm divide-y">
                    {(q.data?.orders ?? []).map((o: any) => (
                      <li key={o.id} className="py-2 flex justify-between">
                        <span>{o.order_no ?? o.id.slice(0, 8)} · {o.order_type_code}</span>
                        <Badge variant="outline">{o.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="appeals">
                {(q.data?.appeals ?? []).length === 0 ? (
                  <Empty label="No appeals against linked orders." />
                ) : (
                  <ul className="text-sm divide-y">
                    {(q.data?.appeals ?? []).map((a: any) => (
                      <li key={a.id} className="py-2 flex justify-between">
                        <span>{a.appeal_no ?? a.id.slice(0, 8)}</span>
                        <Badge variant="outline">{a.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="enforcement">
                {(q.data?.enforcement ?? []).length === 0 ? (
                  <Empty label="No enforcement actions." />
                ) : (
                  <ul className="text-sm divide-y">
                    {(q.data?.enforcement ?? []).map((e: any) => (
                      <li key={e.id} className="py-2 flex justify-between">
                        <span>{e.action_type ?? e.id.slice(0, 8)}</span>
                        <Badge variant="outline">{e.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="payments">
                {(q.data?.allocations ?? []).length === 0 ? (
                  <Empty label="No payment allocations." />
                ) : (
                  <ul className="text-sm divide-y">
                    {(q.data?.allocations ?? []).map((p: any) => (
                      <li key={p.id} className="py-2 flex justify-between">
                        <span>{p.component ?? "—"} · {new Date(p.created_at).toLocaleDateString()}</span>
                        <span className="font-medium">{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="audit">
                {(q.data?.activity ?? []).length === 0 ? (
                  <Empty label="No audit entries." />
                ) : (
                  <ul className="text-sm divide-y">
                    {(q.data?.activity ?? []).map((a: any) => (
                      <li key={a.id} className="py-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{a.action}</span>
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{label}</p>;
}

export default Liability360Drawer;
