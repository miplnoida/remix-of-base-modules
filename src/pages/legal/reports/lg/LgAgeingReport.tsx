import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, ageBucket, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "91-180 days", "181-365 days", "> 365 days"];

export default function LgAgeingReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);
  const nav = useNavigate();

  const open = useMemo(() => cases.filter((c: any) => c.status_code !== "CLOSED"), [cases]);

  const detail = useMemo(() => open.map((c: any) => ({
    ...c, bucket: ageBucket(c.opened_date),
    age_days: c.opened_date ? Math.floor((Date.now() - new Date(c.opened_date).getTime()) / 86_400_000) : 0,
  })), [open]);

  const chart = useMemo(() => BUCKETS.map((b) => ({
    bucket: b, count: detail.filter((d) => d.bucket === b).length,
    claim: detail.filter((d) => d.bucket === b).reduce((s, d) => s + Number(d.claim_amount || 0), 0),
  })), [detail]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.id}`)}>{getValue() as string}</button> },
    { accessorKey: "bucket", header: "Age Bucket", meta: { label: "Age Bucket" } },
    { accessorKey: "age_days", header: "Days", meta: { label: "Days", align: "right" } },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Case Ageing Report" subtitle="Open cases grouped by age" breadcrumbTail="Ageing"
      filters={filters} onFiltersChange={setFilters} data={detail} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Bucket", key: "bucket" },
        { header: "Days", key: "age_days" }, { header: "Opened", key: "opened_date" },
        { header: "Stage", key: "current_stage_code" }, { header: "Territory", key: "country_code" },
        { header: "Claim", key: "claim_amount" },
      ]}
      fileName="lg-ageing-report" gridId="lg.reports.ageing"
      chart={
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis /><Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" name="Cases" />
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}
