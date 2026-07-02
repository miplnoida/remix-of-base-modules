import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportHearings, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";
import { Badge } from "@/components/ui/badge";

export default function LgOverdueHearingsReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: hearings = [], isLoading } = useLgReportHearings(filters);
  const nav = useNavigate();

  const rows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return hearings
      .filter((h: any) => h.scheduled_date && h.scheduled_date < today && !["COMPLETED", "CANCELLED", "ADJOURNED_DONE"].includes(h.status_code || ""))
      .map((h: any) => ({
        ...h,
        lg_case_no: h.lg_case?.lg_case_no,
        territory: h.lg_case?.country_code,
        days_overdue: Math.floor((Date.now() - new Date(h.scheduled_date).getTime()) / 86_400_000),
      }));
  }, [hearings]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.lg_case_id}`)}>{getValue() as string || "-"}</button> },
    { accessorKey: "hearing_type_code", header: "Type", meta: { label: "Type" } },
    { accessorKey: "scheduled_date", header: "Scheduled", meta: { label: "Scheduled" } },
    { accessorKey: "days_overdue", header: "Days Overdue", meta: { label: "Days Overdue", align: "right" },
      cell: ({ getValue }) => <Badge variant="destructive">{getValue() as number}</Badge> },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "court_name", header: "Court", meta: { label: "Court" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ];

  return (
    <LgReportShell
      title="Overdue Hearings" subtitle="Scheduled hearings past due date, not yet closed" breadcrumbTail="Overdue Hearings"
      filters={filters} onFiltersChange={setFilters} showStatus={false}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Type", key: "hearing_type_code" },
        { header: "Scheduled", key: "scheduled_date" }, { header: "Days Overdue", key: "days_overdue" },
        { header: "Status", key: "status_code" }, { header: "Court", key: "court_name" },
        { header: "Territory", key: "territory" },
      ]}
      fileName="lg-overdue-hearings" gridId="lg.reports.overdueHearings"
    />
  );
}
