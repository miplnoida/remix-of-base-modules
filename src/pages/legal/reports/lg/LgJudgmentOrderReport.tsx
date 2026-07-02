import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportOrders, type LgReportFilters } from "@/hooks/legal/useLgReports";
import { LgStatusBadge, type LgColumnDef } from "@/components/legal/grid";

export default function LgJudgmentOrderReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: orders = [], isLoading } = useLgReportOrders(filters);
  const nav = useNavigate();

  const rows = useMemo(() => orders.map((o: any) => ({
    ...o, lg_case_no: o.lg_case?.lg_case_no, territory: o.lg_case?.country_code,
  })), [orders]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "order_no", header: "Order No", meta: { label: "Order No", pinLeft: true } },
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No" },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.lg_case_id}`)}>{getValue() as string || "-"}</button> },
    { accessorKey: "order_type_code", header: "Type", meta: { label: "Type" } },
    { accessorKey: "order_date", header: "Order Date", meta: { label: "Order Date" } },
    { accessorKey: "compliance_date", header: "Comply By", meta: { label: "Comply By" } },
    { accessorKey: "amount_ordered", header: "Amount", meta: { label: "Amount", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={(getValue() as string) || "-"} /> },
    { accessorKey: "court_name", header: "Court", meta: { label: "Court" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ];

  return (
    <LgReportShell
      title="Judgment / Order Report" subtitle="Court orders and judgments issued" breadcrumbTail="Judgments & Orders"
      filters={filters} onFiltersChange={setFilters} showStatus={false}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Order No", key: "order_no" }, { header: "Case No", key: "lg_case_no" },
        { header: "Type", key: "order_type_code" }, { header: "Order Date", key: "order_date" },
        { header: "Comply By", key: "compliance_date" }, { header: "Amount", key: "amount_ordered" },
        { header: "Status", key: "status_code" }, { header: "Court", key: "court_name" },
        { header: "Territory", key: "territory" },
      ]}
      fileName="lg-judgment-order-report" gridId="lg.reports.judgmentOrder"
    />
  );
}
