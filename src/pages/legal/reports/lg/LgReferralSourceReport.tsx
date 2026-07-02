import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportIntake, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";

export default function LgReferralSourceReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: intake = [], isLoading } = useLgReportIntake(filters);
  const nav = useNavigate();

  const rows = useMemo(() => {
    const map = new Map<string, { source: string; total: number; accepted: number; rejected: number; pending: number; exposure: number }>();
    intake.forEach((i: any) => {
      const k = i.source_module || i.source_type || "UNKNOWN";
      const cur = map.get(k) || { source: k, total: 0, accepted: 0, rejected: 0, pending: 0, exposure: 0 };
      cur.total += 1;
      const s = (i.intake_status || "").toUpperCase();
      if (s === "ACCEPTED" || s === "CONVERTED") cur.accepted += 1;
      else if (s === "REJECTED") cur.rejected += 1;
      else cur.pending += 1;
      cur.exposure += Number(i.exposure_amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [intake]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "source", header: "Source", meta: { label: "Source", pinLeft: true } },
    { accessorKey: "total", header: "Total", meta: { label: "Total", align: "right" } },
    { accessorKey: "accepted", header: "Accepted", meta: { label: "Accepted", align: "right" } },
    { accessorKey: "rejected", header: "Rejected", meta: { label: "Rejected", align: "right" } },
    { accessorKey: "pending", header: "Pending", meta: { label: "Pending", align: "right" } },
    { accessorKey: "exposure", header: "Exposure", meta: { label: "Exposure", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Referral Source Report" subtitle="Intake volume and outcomes by source module" breadcrumbTail="Referral Source"
      filters={filters} onFiltersChange={setFilters} showStatus={false}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Source", key: "source" }, { header: "Total", key: "total" },
        { header: "Accepted", key: "accepted" }, { header: "Rejected", key: "rejected" },
        { header: "Pending", key: "pending" }, { header: "Exposure", key: "exposure" },
      ]}
      fileName="lg-referral-source" gridId="lg.reports.referralSource"
    />
  );
}
