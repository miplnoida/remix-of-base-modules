/**
 * EPIC-07 Phase 5 — Legal Recovery Context Panel
 * Rendered inside the Recovery Assignment Workspace. Deterministically
 * resolves the primary legal case for the assignment and surfaces current
 * judgment / consent / settlement / enforcement / filing state plus
 * next-action guidance from the post-judgment engines.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Scale } from "lucide-react";
import { useAssignmentLegalContext } from "@/hooks/legal/useAssignmentLegalContext";
import { formatCurrency } from "@/utils/formatCurrency";

interface Props { assignmentId: string; }

function healthTone(level?: string): "default" | "secondary" | "destructive" | "outline" {
  if (!level) return "outline";
  if (["HIGH_RISK", "CONSENT_BREACHED", "SETTLEMENT_BREACHED", "COMPLIANCE_OVERDUE"].includes(level)) return "destructive";
  if (["COMPLIANCE_DUE", "ENFORCEMENT_DELAYED", "AWAITING_COURT", "AWAITING_COUNSEL"].includes(level)) return "secondary";
  return "outline";
}

export function LegalRecoveryContextPanel({ assignmentId }: Props) {
  const { data, isLoading } = useAssignmentLegalContext(assignmentId);

  if (isLoading) {
    return <Card><CardContent className="py-4 text-sm text-muted-foreground">Resolving legal context…</CardContent></Card>;
  }
  if (!data || !data.snapshot || !data.case_id) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4" /> Legal Recovery Context</CardTitle></CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          No linked liability has an associated legal case. Link a liability under a case to enable post-judgment context.
        </CardContent>
      </Card>
    );
  }

  const s = data.snapshot;
  const activeCompliance = s.compliances.find((c) => c.compliance_status !== "COMPLIED" && c.compliance_status !== "CLOSED");
  const activeConsent = s.consentOrders.find((co) => ["ACTIVE", "BREACHED", "IN_ARREARS"].includes(String(co.order.status)));
  const activeSettlement = s.settlements.find((x) => !["EXECUTED", "COMPLETED", "CLOSED", "REJECTED", "CANCELLED"].includes(String(x.status)));
  const nextFiling = s.filings
    .filter((f) => f.deadline && !["ACCEPTED", "REJECTED", "CLOSED"].includes(String(f.status)))
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
  const nextInstallment = s.consentOrders
    .flatMap((co) => co.installments)
    .filter((i) => String(i.status) === "PENDING" || String(i.status) === "SCHEDULED")
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4" /> Legal Recovery Context
            <Badge variant={healthTone(s.health.level)}>{s.health.level.replace(/_/g, " ")}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.linked_case_count > 1 && (
              <span className="text-[10px] text-muted-foreground">Primary of {data.linked_case_count} cases</span>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to={`/legal/lg/post-judgment/${data.case_id}`} className="gap-1">
                Open Post-Judgment <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          <Cell label="Case" value={data.case_no ?? data.case_id.slice(0, 8)} />
          <Cell label="Judgment Compliance" value={activeCompliance ? activeCompliance.compliance_status.replace(/_/g, " ") : "None"} />
          <Cell label="Consent Order" value={activeConsent ? activeConsent.order.status : "None"} />
          <Cell label="Settlement" value={activeSettlement ? String(activeSettlement.status) : "None"} />
          <Cell label="Enforcement" value={`${s.enforcementActive} active`} />
          <Cell label="Court Filings Open" value={s.filings.filter((f) => !["ACCEPTED", "REJECTED", "CLOSED"].includes(String(f.status))).length} />
          <Cell label="External Counsel" value={s.engagements.filter((e) => e.engagement.status === "ACTIVE").length} />
          <Cell label="Legal Costs" value={formatCurrency(s.costs.reduce((a, c) => a + Number(c.amount ?? 0), 0))} />
          <Cell label="Outstanding" value={formatCurrency(s.health.outstanding)} />
          <Cell label="Breaches" value={s.health.breachCount} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <NextItem label="Next Court Action" value={nextFiling ? `${nextFiling.filing_type} · ${nextFiling.deadline}` : "—"} />
          <NextItem label="Next Compliance Review" value={activeCompliance?.compliance_due_date ?? "—"} />
          <NextItem
            label="Next Legal Action"
            value={
              s.nextAction?.code
                ? `${s.nextAction.label}${s.nextAction.due_in_days != null ? ` · ${s.nextAction.due_in_days}d` : ""}`
                : nextInstallment
                ? `Installment due ${nextInstallment.due_date}`
                : "—"
            }
          />
        </div>
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

function NextItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border p-2 bg-muted/30">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}
