/**
 * EPIC-09B — Report filter panel with master-picker support (Part 9)
 * Free-text inputs are replaced with Select components fed by live master tables.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LegalReportFilterKey } from "@/config/legalReportDefinitions";
import {
  type LgReportFilters,
  listOfficers, listCourts, listCounsel, listMatterTypes,
  listEmployers, listFunds, listLiabilityTypes, listContributionPeriods,
} from "@/services/legal/lgReportingService";

type FieldSpec =
  | { kind: "date"; key: keyof LgReportFilters; label: string }
  | { kind: "text"; key: keyof LgReportFilters; label: string; placeholder?: string }
  | { kind: "picker"; key: keyof LgReportFilters; label: string; loader: () => Promise<{ id: string; label: string }[]>; qKey: string }
  | { kind: "select"; key: keyof LgReportFilters; label: string; options: { id: string; label: string }[] };

const STATUS_OPTIONS = [
  { id: "OPEN", label: "Open" }, { id: "CLOSED", label: "Closed" }, { id: "CANCELLED", label: "Cancelled" },
  { id: "IN_PROGRESS", label: "In Progress" }, { id: "PENDING", label: "Pending" }, { id: "BREACHED", label: "Breached" },
];
const PRIORITY_OPTIONS = [
  { id: "LOW", label: "Low" }, { id: "NORMAL", label: "Normal" }, { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" }, { id: "CRITICAL", label: "Critical" },
];
const STAGE_OPTIONS = [
  { id: "INTAKE", label: "Intake" }, { id: "PRE_JUDGMENT", label: "Pre-Judgment" },
  { id: "JUDGMENT", label: "Judgment" }, { id: "POST_JUDGMENT", label: "Post-Judgment" },
  { id: "APPEAL", label: "Appeal" }, { id: "ENFORCEMENT", label: "Enforcement" },
  { id: "SETTLEMENT", label: "Settlement" }, { id: "CLOSED", label: "Closed" },
];

const FIELDS: Record<LegalReportFilterKey, FieldSpec[]> = {
  dateRange: [
    { kind: "date", key: "dateFrom", label: "From" },
    { kind: "date", key: "dateTo", label: "To" },
  ],
  employer: [{ kind: "picker", key: "employerId", label: "Employer", loader: listEmployers, qKey: "picker-employer" }],
  fund: [{ kind: "picker", key: "fundCode", label: "Fund", loader: listFunds, qKey: "picker-fund" }],
  liabilityType: [{ kind: "picker", key: "liabilityType", label: "Liability Type", loader: listLiabilityTypes, qKey: "picker-liab" }],
  period: [{ kind: "picker", key: "contributionPeriod", label: "Period", loader: listContributionPeriods, qKey: "picker-period" }],
  officer: [{ kind: "picker", key: "officerId", label: "Officer", loader: listOfficers, qKey: "picker-officer" }],
  matterType: [{ kind: "picker", key: "matterType", label: "Matter Type", loader: listMatterTypes, qKey: "picker-matter-type" }],
  status: [{ kind: "select", key: "status", label: "Status", options: STATUS_OPTIONS }],
  priority: [{ kind: "select", key: "priority", label: "Priority", options: PRIORITY_OPTIONS }],
  stage: [{ kind: "select", key: "stage", label: "Stage", options: STAGE_OPTIONS }],
  territory: [{ kind: "text", key: "territory", label: "Country", placeholder: "KN" }],
  court: [{ kind: "picker", key: "courtId", label: "Court", loader: listCourts, qKey: "picker-court" }],
  judge: [{ kind: "text", key: "judgeId", label: "Judge" }],
  counsel: [{ kind: "picker", key: "counselId", label: "Counsel", loader: listCounsel, qKey: "picker-counsel" }],
  campaign: [{ kind: "text", key: "campaignId", label: "Campaign" }],
};

interface Props {
  filterKeys: LegalReportFilterKey[];
  value: LgReportFilters;
  onChange: (v: LgReportFilters) => void;
}

function PickerField({ spec, value, onPatch }: { spec: Extract<FieldSpec, { kind: "picker" }>; value: any; onPatch: (v: any) => void; }) {
  const { data } = useQuery({ queryKey: [spec.qKey], queryFn: spec.loader, staleTime: 300_000 });
  return (
    <Select value={value ?? "__all"} onValueChange={(v) => onPatch(v === "__all" ? undefined : v)}>
      <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All</SelectItem>
        {(data ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ReportFilters({ filterKeys, value, onChange }: Props) {
  const patch = (p: Partial<LgReportFilters>) => onChange({ ...value, ...p });
  const fields = filterKeys.flatMap((k) => FIELDS[k] ?? []);
  if (!fields.length) return null;
  return (
    <Card className="print:hidden">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          {fields.map((f, idx) => (
            <div key={`${String(f.key)}-${idx}`}>
              <Label className="text-xs">{f.label}</Label>
              {f.kind === "date" && (
                <Input type="date" value={(value[f.key] as string) ?? ""} onChange={(e) => patch({ [f.key]: e.target.value || undefined } as any)} className="h-9" />
              )}
              {f.kind === "text" && (
                <Input value={(value[f.key] as string) ?? ""} placeholder={f.placeholder} onChange={(e) => patch({ [f.key]: e.target.value || undefined } as any)} className="h-9" />
              )}
              {f.kind === "select" && (
                <Select value={(value[f.key] as string) ?? "__all"} onValueChange={(v) => patch({ [f.key]: v === "__all" ? undefined : v } as any)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All</SelectItem>
                    {f.options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {f.kind === "picker" && (
                <PickerField spec={f} value={value[f.key]} onPatch={(v) => patch({ [f.key]: v } as any)} />
              )}
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
