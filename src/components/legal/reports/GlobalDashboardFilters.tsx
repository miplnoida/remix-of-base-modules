/**
 * EPIC-09C Part 2 — Global Dashboard Filter Bar
 * Compact date + master pickers that drive every widget on the page
 * via the URL query string (`useDashboardFilters`).
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardFilters } from "@/hooks/legal/useDashboardFilters";
import { listCourts, listOfficers, listCounsel, listEmployers, listFunds } from "@/services/legal/lgReportingService";

const STATUS = ["OPEN", "CLOSED", "IN_PROGRESS", "PENDING", "BREACHED"];
const PRIORITY = ["LOW", "NORMAL", "MEDIUM", "HIGH", "CRITICAL"];
const RISK = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STAGE = ["INTAKE", "PRE_JUDGMENT", "JUDGMENT", "POST_JUDGMENT", "APPEAL", "ENFORCEMENT", "SETTLEMENT", "CLOSED"];

function usePicker<K extends string>(key: K, fn: () => Promise<any[]>) {
  return useQuery({ queryKey: [`gdf-${key}`], queryFn: fn, staleTime: 300_000 });
}

export function GlobalDashboardFilters() {
  const { filters, patch, reset } = useDashboardFilters();
  const officers = usePicker("officer", listOfficers);
  const courts = usePicker("court", listCourts);
  const counsel = usePicker("counsel", listCounsel);
  const employers = usePicker("employer", listEmployers);
  const funds = usePicker("fund", listFunds);

  const Sel = ({ id, label, value, options, onChange }: {
    id: string; label: string; value?: string; options: { id: string; label: string }[]; onChange: (v?: string) => void;
  }) => (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? undefined : v)}>
        <SelectTrigger id={id} className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All</SelectItem>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className="print:hidden">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={filters.dateFrom ?? ""} onChange={(e) => patch({ dateFrom: e.target.value || undefined })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={filters.dateTo ?? ""} onChange={(e) => patch({ dateTo: e.target.value || undefined })} className="h-9" />
          </div>
          <Sel id="f-employer" label="Employer" value={filters.employerId} options={employers.data ?? []} onChange={(v) => patch({ employerId: v })} />
          <Sel id="f-fund" label="Fund" value={filters.fundCode} options={funds.data ?? []} onChange={(v) => patch({ fundCode: v })} />
          <Sel id="f-court" label="Court" value={filters.courtId} options={courts.data ?? []} onChange={(v) => patch({ courtId: v })} />
          <Sel id="f-officer" label="Recovery Officer" value={filters.officerId} options={officers.data ?? []} onChange={(v) => patch({ officerId: v })} />
          <Sel id="f-counsel" label="Counsel" value={filters.counselId} options={counsel.data ?? []} onChange={(v) => patch({ counselId: v })} />
          <Sel id="f-status" label="Status" value={filters.status} options={STATUS.map((s) => ({ id: s, label: s }))} onChange={(v) => patch({ status: v })} />
          <Sel id="f-priority" label="Priority" value={filters.priority} options={PRIORITY.map((s) => ({ id: s, label: s }))} onChange={(v) => patch({ priority: v })} />
          <Sel id="f-stage" label="Recovery Stage" value={filters.recoveryStage} options={STAGE.map((s) => ({ id: s, label: s }))} onChange={(v) => patch({ recoveryStage: v })} />
          <Sel id="f-risk" label="Risk Rating" value={filters.riskRating} options={RISK.map((s) => ({ id: s, label: s }))} onChange={(v) => patch({ riskRating: v })} />
          <div>
            <Label className="text-xs">Region</Label>
            <Input value={filters.territory ?? ""} placeholder="KN / NV" onChange={(e) => patch({ territory: e.target.value || undefined })} className="h-9" />
          </div>
          <div className="col-span-2 md:col-span-4 lg:col-span-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset all filters</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
