import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, daysBetween, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";

export default function LgClosedCasesReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases({ ...filters, status: "CLOSED" });
  const nav = useNavigate();

  const rows = useMemo(() => cases.map((c: any) => ({
    ...c, duration_days: c.opened_date && c.closed_date ? daysBetween(c.opened_date, c.closed_date) : 0,
  })), [cases]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.id}`)}>{getValue() as string}</button> },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
    { accessorKey: "closed_date", header: "Closed", meta: { label: "Closed" } },
    { accessorKey: "duration_days", header: "Days Open", meta: { label: "Days Open", align: "right" } },
    { accessorKey: "closure_reason_code", header: "Closure Reason", meta: { label: "Closure Reason" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Closed Cases Report" subtitle="Closed cases with duration and closure reason" breadcrumbTail="Closed Cases"
      filters={filters} onFiltersChange={setFilters} showStatus={false}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Opened", key: "opened_date" },
        { header: "Closed", key: "closed_date" }, { header: "Days Open", key: "duration_days" },
        { header: "Closure Reason", key: "closure_reason_code" },
        { header: "Territory", key: "country_code" }, { header: "Claim", key: "claim_amount" },
      ]}
      fileName="lg-closed-cases" gridId="lg.reports.closedCases"
    />
  );
}
