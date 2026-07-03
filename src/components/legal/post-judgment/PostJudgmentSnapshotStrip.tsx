/**
 * EPIC-07 Phase 5 — Post-Judgment Snapshot Strip
 * Compact read-only summary rendered inside the Matter Workspace header.
 * Consumes usePostJudgmentSnapshot — no business logic here.
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import { usePostJudgmentSnapshot } from "@/hooks/legal/usePostJudgmentSnapshot";
import { formatCurrency } from "@/utils/formatCurrency";

interface Props { caseId: string; }

function healthTone(level: string): "default" | "secondary" | "destructive" | "outline" {
  if (level === "HIGH_RISK" || level === "CONSENT_BREACHED" || level === "SETTLEMENT_BREACHED" || level === "COMPLIANCE_OVERDUE") return "destructive";
  if (level === "COMPLIANCE_DUE" || level === "ENFORCEMENT_DELAYED" || level === "AWAITING_COURT" || level === "AWAITING_COUNSEL") return "secondary";
  return "outline";
}

export function PostJudgmentSnapshotStrip({ caseId }: Props) {
  const { data, isLoading } = usePostJudgmentSnapshot(caseId);

  if (isLoading) {
    return (
      <Card><CardContent className="py-3 text-xs text-muted-foreground">Loading post-judgment snapshot…</CardContent></Card>
    );
  }
  if (!data) return null;

  const s = data;
  const activeCompliance = s.compliances.find((c) => c.compliance_status !== "COMPLIED" && c.compliance_status !== "CLOSED");
  const activeConsent = s.consentOrders.find((co) => ["ACTIVE", "BREACHED", "IN_ARREARS"].includes(String(co.order.status)));
  const activeSettlement = s.settlements.find((x) => !["EXECUTED", "COMPLETED", "CLOSED", "REJECTED", "CANCELLED"].includes(String(x.status)));
  const openFilings = s.filings.filter((f) => !["ACCEPTED", "REJECTED", "CLOSED"].includes(String(f.status))).length;
  const activeCounsel = s.engagements.filter((e) => e.engagement.status === "ACTIVE").length;
  const totalCosts = s.costs.reduce((a, c) => a + Number(c.amount ?? 0), 0);
  const recoveredCosts = s.costs.reduce((a, c) => a + Number(c.recovered_amount ?? 0), 0);
  const recoveryPct = totalCosts > 0 ? Math.round((recoveredCosts / totalCosts) * 100) : 0;

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Post-Judgment Recovery</span>
            <Badge variant={healthTone(s.health.level)}>{s.health.level.replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">Score {s.health.score}/100</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={`/legal/lg/post-judgment/${caseId}`} className="gap-1">
              Open Workspace <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          <Cell label="Judgment" value={activeCompliance ? activeCompliance.compliance_status.replace(/_/g, " ") : "None"} />
          <Cell label="Consent Order" value={activeConsent ? activeConsent.order.status : "None"} />
          <Cell label="Settlement" value={activeSettlement ? String(activeSettlement.status) : "None"} />
          <Cell label="Enforcement" value={`${s.enforcementActive} active`} />
          <Cell label="Filings Open" value={openFilings} />
          <Cell label="Counsel Active" value={activeCounsel} />
          <Cell label="Legal Costs" value={formatCurrency(totalCosts)} />
          <Cell label="Costs Recovered" value={`${recoveryPct}%`} />
        </div>

        {s.nextAction?.code && (
          <div className="flex items-center gap-2 text-xs pt-1 border-t">
            {s.health.level === "HIGH_RISK" ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium">Next legal action:</span>
            <span>{s.nextAction.label}</span>
            {s.nextAction.due_in_days != null && (
              <span className="text-muted-foreground">· due in {s.nextAction.due_in_days}d</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
