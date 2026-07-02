import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, type LgReportFilters } from "@/hooks/legal/useLgReports";
import { Badge } from "@/components/ui/badge";
import type { LgColumnDef } from "@/components/legal/grid";

export default function LgPendingActionReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);
  const nav = useNavigate();

  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(() => cases
    .filter((c: any) => c.status_code !== "CLOSED" && (c.next_action || c.next_action_due_date))
    .map((c: any) => ({
      ...c,
      due_in_days: c.next_action_due_date ? Math.floor((new Date(c.next_action_due_date).getTime() - Date.now()) / 86_400_000) : null,
      is_overdue: c.next_action_due_date && c.next_action_due_date < today,
    })), [cases]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.id}`)}>{getValue() as string}</button> },
    { accessorKey: "next_action", header: "Pending Action", meta: { label: "Pending Action" } },
    { accessorKey: "next_action_due_date", header: "Due Date", meta: { label: "Due Date" } },
    { accessorKey: "due_in_days", header: "Due In (d)", meta: { label: "Due In (d)", align: "right" },
      cell: ({ row, getValue }) => {
        const v = getValue() as number | null;
        if (v === null) return "-";
        if (row.original.is_overdue) return <Badge variant="destructive">{v}</Badge>;
        return v;
      } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
  ];

  return (
    <LgReportShell
      title="Pending Action Report" subtitle="Open cases with a next-action pending" breadcrumbTail="Pending Actions"
      filters={filters} onFiltersChange={setFilters}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Pending Action", key: "next_action" },
        { header: "Due Date", key: "next_action_due_date" }, { header: "Due In (d)", key: "due_in_days" },
        { header: "Stage", key: "current_stage_code" }, { header: "Status", key: "status_code" },
        { header: "Territory", key: "country_code" },
      ]}
      fileName="lg-pending-action" gridId="lg.reports.pendingAction"
    />
  );
}
