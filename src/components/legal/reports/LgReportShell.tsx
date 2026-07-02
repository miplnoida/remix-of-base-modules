import { ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { ExportActions } from "@/components/reports/ExportActions";
import { LgDataGrid, type LgColumnDef } from "@/components/legal/grid";
import { useLgOfficers, useLgTerritories, type LgReportFilters } from "@/hooks/legal/useLgReports";

export interface LgReportShellProps<T> {
  title: string;
  subtitle?: string;
  breadcrumbTail: string;
  filters: LgReportFilters;
  onFiltersChange: (f: LgReportFilters) => void;
  showStatus?: boolean;
  showStage?: boolean;
  data: T[];
  columns: LgColumnDef<T>[];
  exportColumns: { header: string; key: string }[];
  fileName: string;
  gridId: string;
  chart?: ReactNode;
  summary?: ReactNode;
  loading?: boolean;
}

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "AWAITING_HEARING", "JUDGMENT", "ENFORCEMENT", "SETTLED", "CLOSED"];
const STAGE_OPTIONS = ["INTAKE", "PREP", "FILED", "HEARING", "JUDGMENT", "ENFORCEMENT", "CLOSED"];

export function LgReportShell<T extends Record<string, any>>({
  title, subtitle, breadcrumbTail,
  filters, onFiltersChange, showStatus = true, showStage = false,
  data, columns, exportColumns, fileName, gridId, chart, summary, loading,
}: LgReportShellProps<T>) {
  const { data: officers = [] } = useLgOfficers();
  const { data: territories = [] } = useLgTerritories();

  const patch = (p: Partial<LgReportFilters>) => onFiltersChange({ ...filters, ...p });

  return (
    <div className="container mx-auto p-6 space-y-6 print:p-0">
      <div className="print:hidden">
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={[
            { label: "Legal Management", href: "/legal/dashboard" },
            { label: "Legal Reports", href: "/legal/reports" },
            { label: breadcrumbTail },
          ]}
        />
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={filters.dateFrom || ""} onChange={(e) => patch({ dateFrom: e.target.value || undefined })} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={filters.dateTo || ""} onChange={(e) => patch({ dateTo: e.target.value || undefined })} />
            </div>
            <div>
              <Label className="text-xs">Territory</Label>
              <Select value={filters.territory || "__all"} onValueChange={(v) => patch({ territory: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {territories.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Officer</Label>
              <Select value={filters.officerId || "__all"} onValueChange={(v) => patch({ officerId: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {officers.map((o: any) => <SelectItem key={o.id} value={o.user_id || o.id}>{o.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {showStatus && (
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status || "__all"} onValueChange={(v) => patch({ status: v === "__all" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All</SelectItem>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showStage && (
              <div>
                <Label className="text-xs">Stage</Label>
                <Select value={filters.stage || "__all"} onValueChange={(v) => patch({ stage: v === "__all" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All</SelectItem>
                    {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onFiltersChange({})}>Reset</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="print:hidden">
        <ExportActions
          reportTitle={title}
          fileName={fileName}
          data={data as any[]}
          columns={exportColumns}
          additionalInfo={[
            { label: "Generated", value: new Date().toLocaleString() },
            { label: "Records", value: String(data.length) },
            ...(filters.dateFrom ? [{ label: "From", value: filters.dateFrom }] : []),
            ...(filters.dateTo ? [{ label: "To", value: filters.dateTo }] : []),
          ]}
        />
      </div>

      {summary}
      {chart && <Card><CardContent className="pt-6">{chart}</CardContent></Card>}

      <Card>
        <CardHeader><CardTitle>Details ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <LgDataGrid
            id={gridId}
            columns={columns}
            data={data}
            searchPlaceholder="Search..."
            exportFilename={fileName}
            isLoading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
