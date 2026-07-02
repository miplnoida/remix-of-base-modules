import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IntakeRow } from "@/services/legal/lgIntakeQualificationService";

const num = (n?: number | null) =>
  n == null ? "Unknown" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n?: number | null) => n == null ? "Unknown" : `${Number(n).toFixed(1)}%`;

export function FinancialExposureCard({ intake, highValueThreshold = 10_000 }: { intake: IntakeRow; highValueThreshold?: number }) {
  const exposure = intake.financial_exposure ?? intake.exposure_amount;
  const outstanding = intake.financial_outstanding;
  const isHigh = Number(exposure ?? outstanding ?? 0) >= highValueThreshold;

  const rows: [string, string][] = [
    ["Principal", num(intake.financial_principal)],
    ["Interest", num(intake.financial_interest)],
    ["Penalty", num(intake.financial_penalty)],
    ["Court Cost", num(intake.financial_court_cost)],
    ["Legal Cost", num(intake.financial_legal_cost)],
    ["Estimated Recovery", num(intake.financial_estimated_recovery)],
    ["Recovery %", pct(intake.financial_estimated_pct)],
    ["Previous Recoveries", num(intake.financial_previous_recovery)],
    ["Outstanding", num(outstanding)],
    ["Total Exposure", num(exposure)],
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Financial Exposure</span>
          {isHigh && <Badge variant="destructive">High Value</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b py-0.5">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium tabular-nums">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
