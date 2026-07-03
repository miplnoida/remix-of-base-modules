import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Activity, TrendingUp, ShieldAlert } from "lucide-react";
import type { PostJudgmentSnapshot } from "@/services/legal/postJudgment/postJudgmentSnapshotService";
import { formatCurrency } from "@/utils/formatCurrency";

const healthVariant = (level: string): "default" | "destructive" | "secondary" | "outline" => {
  if (["HIGH_RISK", "CONSENT_BREACHED", "SETTLEMENT_BREACHED", "COMPLIANCE_OVERDUE"].includes(level))
    return "destructive";
  if (["COMPLIANCE_DUE", "ENFORCEMENT_DELAYED", "AWAITING_COURT", "AWAITING_COUNSEL"].includes(level))
    return "secondary";
  if (level === "COMPLETED") return "outline";
  return "default";
};

export function PostJudgmentOverviewTab({ snap }: { snap: PostJudgmentSnapshot }) {
  const { health, nextAction } = snap;

  const stats = [
    { label: "Judgments", value: snap.compliances.length },
    { label: "Consent Orders", value: snap.consentOrders.length },
    { label: "Settlements", value: snap.settlements.length },
    { label: "Active Enforcement", value: snap.enforcementActive },
    { label: "Court Filings", value: snap.filings.length },
    { label: "Counsel Engagements", value: snap.engagements.length },
    { label: "Legal Cost Items", value: snap.costs.length },
    { label: "Outstanding", value: formatCurrency(health.outstanding) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recovery Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={healthVariant(health.level)}>{health.level.replace(/_/g, " ")}</Badge>
              <span className="text-sm text-muted-foreground">{health.score}/100</span>
            </div>
            <Progress value={health.score} />
            {health.reasons.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 pt-1">
                {health.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Next Legal Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-semibold">{nextAction.label}</div>
            <div className="text-xs text-muted-foreground">{nextAction.reason}</div>
            {nextAction.due_in_days !== null && (
              <Badge variant="outline">Due in {nextAction.due_in_days}d</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Risk Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Breaches: <strong>{health.breachCount}</strong></div>
            <div>Overdue: <strong>{health.overdueCount}</strong></div>
            <div>At Risk: <strong>{health.atRiskCount}</strong></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Portfolio Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded border p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {health.reasons.length === 0 && snap.compliances.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          No post-judgment activity recorded yet.
        </div>
      )}
    </div>
  );
}
