/**
 * EPIC-09A Phase 2 — Report filter panel
 * Renders only the filter chips a report definition declares.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { LegalReportFilterKey } from "@/config/legalReportDefinitions";
import type { LgReportFilters } from "@/services/legal/lgReportingService";

interface Props {
  filterKeys: LegalReportFilterKey[];
  value: LgReportFilters;
  onChange: (v: LgReportFilters) => void;
}

const FIELD_MAP: Record<LegalReportFilterKey, Array<{ key: keyof LgReportFilters; label: string; type?: string }>> = {
  dateRange: [
    { key: "dateFrom", label: "From", type: "date" },
    { key: "dateTo", label: "To", type: "date" },
  ],
  employer: [{ key: "employerId", label: "Employer ID" }],
  fund: [{ key: "fundCode", label: "Fund Code" }],
  liabilityType: [{ key: "liabilityType", label: "Liability Type" }],
  period: [{ key: "contributionPeriod", label: "Period" }],
  officer: [{ key: "officerId", label: "Officer ID" }],
  matterType: [{ key: "matterType", label: "Matter Type" }],
  status: [{ key: "status", label: "Status" }],
  priority: [{ key: "priority", label: "Priority" }],
  stage: [{ key: "stage", label: "Stage" }],
  territory: [{ key: "territory", label: "Country" }],
  court: [{ key: "courtId", label: "Court Code" }],
  judge: [{ key: "judgeId", label: "Judge" }],
  counsel: [{ key: "counselId", label: "Counsel ID" }],
  campaign: [{ key: "campaignId", label: "Campaign" }],
};

export function ReportFilters({ filterKeys, value, onChange }: Props) {
  const patch = (p: Partial<LgReportFilters>) => onChange({ ...value, ...p });
  const fields = filterKeys.flatMap((k) => FIELD_MAP[k] ?? []);
  if (!fields.length) return null;
  return (
    <Card className="print:hidden">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          {fields.map((f) => (
            <div key={String(f.key)}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                type={f.type ?? "text"}
                value={(value[f.key] as string) ?? ""}
                onChange={(e) => patch({ [f.key]: e.target.value || undefined } as any)}
                className="h-9"
              />
            </div>
          ))}
          <div>
            <Button variant="outline" size="sm" onClick={() => onChange({})}>Reset</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
