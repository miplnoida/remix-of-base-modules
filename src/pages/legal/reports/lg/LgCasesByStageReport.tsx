import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, type LgReportFilters } from "@/hooks/legal/useLgReports";
import { LgStatusBadge, type LgColumnDef } from "@/components/legal/grid";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function LgCasesByStageReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);
  const nav = useNavigate();

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c: any) => {
      const k = c.current_stage_code || "UNSET";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([stage, count]) => ({ stage, count }));
  }, [cases]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => (
        <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.id}`)}>{getValue() as string}</button>
      ) },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" },
      cell: ({ getValue }) => <LgStatusBadge status={(getValue() as string) || "-"} /> },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Cases by Stage" subtitle="Distribution across workflow stages" breadcrumbTail="Cases by Stage"
      filters={filters} onFiltersChange={setFilters}
      data={cases} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Stage", key: "current_stage_code" },
        { header: "Status", key: "status_code" }, { header: "Territory", key: "country_code" },
        { header: "Opened", key: "opened_date" }, { header: "Claim", key: "claim_amount" },
      ]}
      fileName="lg-cases-by-stage" gridId="lg.reports.casesByStage" showStage
      chart={
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" /><YAxis /><Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}
