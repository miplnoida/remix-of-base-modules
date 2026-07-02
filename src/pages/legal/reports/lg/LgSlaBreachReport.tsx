import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportTasks, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";
import { Badge } from "@/components/ui/badge";

export default function LgSlaBreachReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: tasks = [], isLoading } = useLgReportTasks(filters);
  const nav = useNavigate();

  const rows = useMemo(() => tasks
    .filter((t: any) => ["OVERDUE", "ESCALATED", "AT_RISK"].includes(t.sla_status || "") || (t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "COMPLETED"))
    .map((t: any) => ({
      ...t, lg_case_no: t.lg_case?.lg_case_no, territory: t.lg_case?.country_code,
      overdue_days: t.due_date ? Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86_400_000) : 0,
    })), [tasks]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.lg_case_id}`)}>{getValue() as string || "-"}</button> },
    { accessorKey: "title", header: "Task", meta: { label: "Task" } },
    { accessorKey: "sla_status", header: "SLA", meta: { label: "SLA" },
      cell: ({ getValue }) => <Badge variant={getValue() === "ESCALATED" ? "destructive" : "secondary"}>{(getValue() as string) || "-"}</Badge> },
    { accessorKey: "escalation_level", header: "Esc Lvl", meta: { label: "Esc Lvl", align: "right" } },
    { accessorKey: "due_date", header: "Due", meta: { label: "Due" } },
    { accessorKey: "overdue_days", header: "Days Over", meta: { label: "Days Over", align: "right" } },
    { accessorKey: "status", header: "Status", meta: { label: "Status" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ];

  return (
    <LgReportShell
      title="SLA Breach Report" subtitle="Tasks in overdue, at-risk, or escalated SLA state" breadcrumbTail="SLA Breach"
      filters={filters} onFiltersChange={setFilters}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Task", key: "title" },
        { header: "SLA", key: "sla_status" }, { header: "Esc Lvl", key: "escalation_level" },
        { header: "Due", key: "due_date" }, { header: "Days Over", key: "overdue_days" },
        { header: "Status", key: "status" }, { header: "Territory", key: "territory" },
      ]}
      fileName="lg-sla-breach" gridId="lg.reports.slaBreach"
    />
  );
}
