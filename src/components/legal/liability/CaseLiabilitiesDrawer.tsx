/**
 * EPIC-06A.2 §1 — Child-row drawer for the Recovery Workbench.
 *
 * When a parent matter row is expanded, this drawer shows its child
 * liabilities inline — assessment, outstanding, recovery status,
 * limitation date and links. Live data only.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadLiabilityRollupForCase } from "@/services/legal/lgLiabilityRetrofitService";
import { formatDateForDisplay } from "@/lib/format-config";
import { ExternalLink } from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string | null;
  matterNo?: string | null;
}

export function CaseLiabilitiesDrawer({ open, onOpenChange, caseId, matterNo }: Props) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["liab-drawer", caseId],
    queryFn: () => loadLiabilityRollupForCase(caseId!),
    enabled: open && !!caseId,
  });
  const rows = q.data?.rows ?? [];
  const rollup = q.data?.rollup;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Recoverable Liabilities — {matterNo ?? "Matter"}</SheetTitle>
          <SheetDescription>
            Child liabilities that roll up into this matter. Financial totals sync with the workbench parent row.
          </SheetDescription>
        </SheetHeader>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground mt-6">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded border bg-muted/30 p-4 text-sm text-muted-foreground">
            No liabilities recorded — this matter is still using case-level fallback totals.
            {caseId && (
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => navigate(`/legal/lg/cases/${caseId}?tab=liabilities`)}>
                  Open Liabilities Tab
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {rollup && (
              <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                <StatBox label="Liabilities" value={String(rollup.count)} />
                <StatBox label="Assessed" value={money(rollup.totalAssessed)} />
                <StatBox label="Outstanding" value={money(rollup.totalOutstanding)} accent />
                <StatBox label="Recovery %" value={`${rollup.recoveryPct.toFixed(1)}%`} />
              </div>
            )}

            <div className="mt-4 border rounded divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.liability_type}</span>
                      {r.fund_type && <Badge variant="outline" className="text-[10px]">{r.fund_type}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">{r.recovery_status}</Badge>
                      {r.status !== "ACTIVE" && <Badge className="text-[10px]" variant="destructive">{r.status}</Badge>}
                    </div>
                    <span className="text-muted-foreground">{r.legal_status}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-muted-foreground">
                    <span>Assessed: <span className="text-foreground">{money(r.total_assessed)}</span></span>
                    <span>Paid: <span className="text-foreground">{money(r.paid)}</span></span>
                    <span>Outstanding: <span className="text-foreground font-medium">{money(r.outstanding)}</span></span>
                  </div>
                  {(r.contribution_period_from || r.limitation_date) && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {r.contribution_period_from && <>Period {r.contribution_period_from}{r.contribution_period_to ? ` → ${r.contribution_period_to}` : ""}</>}
                      {r.limitation_date && <> · Limitation {formatDateForDisplay(r.limitation_date)}</>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {caseId && (
              <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate(`/legal/lg/cases/${caseId}?tab=liabilities`)}>
                Open Liabilities Tab <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded border p-2 ${accent ? "bg-primary/5" : "bg-muted/30"}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export default CaseLiabilitiesDrawer;
