import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldAlert, Link2, Banknote, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getLgCaseRecoverySummary } from "@/services/legal/lgRecoveryService";
import { useDetectArrangementDefaults } from "@/hooks/legal/useLgFinancials";
import { formatDateForDisplay } from "@/lib/format-config";
import { LgDataGrid, type LgColumnDef } from "@/components/legal/grid";

interface Props {
  lgCaseId: string;
  canEdit: boolean;
  onLinkArrangement?: () => void;
}

function fmt(n: number | null | undefined) {
  return `EC$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LgCaseRecoveryTab({ lgCaseId, canEdit, onLinkArrangement }: Props) {
  const navigate = useNavigate();
  const detect = useDetectArrangementDefaults();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lg_case_recovery", lgCaseId],
    queryFn: () => getLgCaseRecoverySummary(lgCaseId),
    enabled: !!lgCaseId,
  });

  const [triggering, setTriggering] = useState(false);

  const triggerEnforcement = async () => {
    if (!canEdit) { toast.error("You do not have permission to trigger enforcement"); return; }
    try {
      setTriggering(true);
      const r = await detect.mutateAsync(lgCaseId);
      toast.success(r.created > 0 ? `Enforcement task created (${r.created})` : "No new defaults detected");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to trigger enforcement");
    } finally {
      setTriggering(false);
    }
  };

  const missedColumns: LgColumnDef<any>[] = useMemo(() => [
    { key: "number", header: "#", accessor: (r) => r.number },
    { key: "due_date", header: "Due Date", accessor: (r) => r.due_date ? formatDateForDisplay(r.due_date) : "—" },
    { key: "amount", header: "Amount Due", align: "right", accessor: (r) => fmt(r.amount) },
    { key: "overdue_days", header: "Days Overdue", align: "right", accessor: (r) => r.overdue_days ?? "—" },
  ], []);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading recovery data…</div>;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load recovery data</AlertTitle>
        <AlertDescription>{(error as any)?.message ?? "Unknown error"}</AlertDescription>
      </Alert>
    );
  }
  if (!data) return null;

  const b = data.breakdown;
  const inst = data.installments;
  const hasDebt = b.total_debt > 0;

  return (
    <div className="space-y-4">
      {data.breach.in_breach && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Payment arrangement in breach</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{data.breach.reasons.join(" · ")}</span>
            <Button size="sm" variant="secondary" onClick={triggerEnforcement} disabled={triggering || !canEdit}>
              {triggering && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Trigger enforcement task
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Debt composition */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Debt Composition</CardTitle>
              <CardDescription>Aggregated from referral items and posted legal fees for this case.</CardDescription>
            </div>
            {onLinkArrangement && (
              <Button size="sm" variant="outline" onClick={onLinkArrangement} disabled={!canEdit}>
                <Plus className="h-4 w-4 mr-1" /> Link Payment Arrangement
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Principal" value={fmt(b.principal)} />
            <Stat label="Interest" value={fmt(b.interest)} />
            <Stat label="Penalties" value={fmt(b.penalties)} />
            <Stat label="Court Cost" value={fmt(b.court_cost)} />
            <Stat label="Other Legal Fees" value={fmt(b.other_fees)} />
            <Stat label="Total Debt" value={fmt(b.total_debt)} strong />
            <Stat label="Paid" value={fmt(b.total_paid)} tone="success" />
            <Stat label="Outstanding" value={fmt(b.outstanding)} tone="warning" strong />
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="h-4 w-4" /> Recovery</span>
              <span className="font-medium">{b.recovery_pct.toFixed(1)}%</span>
            </div>
            <Progress value={b.recovery_pct} />
            {!hasDebt && <p className="text-xs text-muted-foreground">No debt captured yet for this case.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Installment compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Installment Compliance</CardTitle>
          <CardDescription>Across every linked payment arrangement.</CardDescription>
        </CardHeader>
        <CardContent>
          {inst.total === 0 ? (
            <p className="text-sm text-muted-foreground">No installments scheduled. Link a payment arrangement to start tracking compliance.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Stat label="Installments" value={`${inst.paid}/${inst.total}`} />
                <Stat label="Paid" value={String(inst.paid)} tone="success" />
                <Stat label="Overdue" value={String(inst.overdue)} tone={inst.overdue > 0 ? "warning" : undefined} />
                <Stat label="Missed" value={String(inst.missed.length)} tone={inst.missed.length > 0 ? "danger" : undefined} />
              </div>
              <Progress value={inst.total > 0 ? (inst.paid / inst.total) * 100 : 0} />

              {inst.missed.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Missed / Overdue Installments</h4>
                  <LgDataGrid
                    id="case.recovery.missed"
                    data={inst.missed}
                    columns={missedColumns}
                    getRowId={(r: any) => r.id}
                    emptyMessage="No missed installments."
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Linked arrangements */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Payment Arrangements</CardTitle>
          <CardDescription>Each linked arrangement contributes to the totals above.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.arrangements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrangements linked to this case yet.</p>
          ) : (
            <div className="space-y-2">
              {data.arrangements.map((a) => {
                const s = a.summary;
                const number = s?.arrangement?.arrangement_number ?? a.link.payment_arrangement_id.slice(0, 8);
                return (
                  <div key={a.link.id} className="border rounded p-3 text-sm">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <div className="font-medium">Arrangement {number}
                          <span className="text-xs text-muted-foreground ml-2">({a.link.link_type} · {a.link.source_module})</span>
                        </div>
                        {a.error && <div className="text-xs text-destructive mt-1">{a.error}</div>}
                        {s && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Debt {fmt(s.totals.total_debt)} · Paid {fmt(s.totals.total_paid)} · Outstanding {fmt(s.totals.outstanding)} · Installments {s.totals.installments_paid}/{s.totals.installments_total}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s?.totals.is_defaulted && <Badge variant="destructive">In default</Badge>}
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/legal/payment-recovery?caseId=${lgCaseId}&arrangementId=${a.link.payment_arrangement_id}`)}>
                          <Link2 className="h-4 w-4 mr-1" /> Open
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone, strong }: { label: string; value: string; tone?: "success" | "warning" | "danger"; strong?: boolean }) {
  const toneCls =
    tone === "success" ? "text-green-600 dark:text-green-500" :
    tone === "warning" ? "text-amber-600 dark:text-amber-500" :
    tone === "danger"  ? "text-destructive" : "";
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`${strong ? "text-lg font-semibold" : "text-base font-medium"} ${toneCls}`}>{value}</div>
    </div>
  );
}
