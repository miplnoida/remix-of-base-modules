import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IntakeRow } from "@/services/legal/lgIntakeQualificationService";
import type { Recommendation, ReadinessScore } from "@/services/legal/lgIntakeDecisionService";
import { formatDateForDisplay } from "@/lib/format-config";

const num = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface Props {
  intake: IntakeRow;
  referralNo?: string | null;
  recommendation: Recommendation;
  readiness: ReadinessScore;
  mandatoryTotal: number;
  mandatoryComplete: number;
  openInfoCount: number;
  previousLegalCount?: number;
  activeRecoveryCount?: number;
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-medium truncate">{value ?? "—"}</div>
    </div>
  );
}

export function IntakeDecisionSummaryPanel(p: Props) {
  const exposure = p.intake.financial_exposure ?? p.intake.exposure_amount;
  return (
    <Card className="sticky top-0 z-20 mb-4 border-primary/30">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Item label="Referral" value={p.referralNo ?? p.intake.source_reference_no} />
          <Item label="Party" value={p.intake.legacy_primary_entity_name ?? p.intake.primary_entity_id} />
          <Item label="Source" value={p.intake.source_module} />
          <Item label="Financial Exposure" value={num(exposure)} />
          <Item label="Recovery Type" value={p.intake.recovery_type} />
          <Item label="Priority" value={p.intake.priority_code} />
          <Item label="Urgency" value={p.intake.urgency} />
          <Item label="Risk" value={p.intake.risk_level} />
          <Item label="Intake Status" value={<Badge variant="outline" className="text-[10px]">{p.intake.qualification_status}</Badge>} />
          <Item label="Qualification" value={p.intake.qualification_result ?? "—"} />
          <Item label="Recommended" value={<Badge className="text-[10px]">{p.recommendation.label}</Badge>} />
          <Item label="Checklist" value={`${p.mandatoryComplete}/${p.mandatoryTotal}`} />
          <Item label="Info Open" value={p.openInfoCount} />
          <Item label="Prior Legal" value={p.previousLegalCount ?? 0} />
          <Item label="Active Recovery" value={p.activeRecoveryCount ?? 0} />
          <Item label="Supervisor" value={p.intake.supervisor_required ? (p.intake.supervisor_status ?? "PENDING") : "N/A"} />
          <Item label="Est. Recovery" value={num(p.intake.financial_estimated_recovery)} />
          <Item label="Est. Recovery %" value={p.intake.financial_estimated_pct == null ? "—" : `${p.intake.financial_estimated_pct}%`} />
          <Item label="Readiness" value={`${p.readiness.score}%`} />
          <Item label="Received" value={formatDateForDisplay(p.intake.submitted_at)} />
        </div>
      </CardContent>
    </Card>
  );
}
