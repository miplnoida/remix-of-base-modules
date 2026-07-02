import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";
import { Card, CardContent } from "@/components/ui/card";

export default function LgRecoveryReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);
  const nav = useNavigate();

  const rows = useMemo(() => cases.map((c: any) => {
    const claim = Number(c.claim_amount || 0);
    const outstanding = Number(c.total_outstanding ?? c.outstanding_amount_snapshot ?? 0);
    const recovered = Math.max(claim - outstanding, 0);
    const pct = claim > 0 ? Math.round((recovered / claim) * 100) : 0;
    return { ...c, recovered, outstanding, recovery_pct: pct };
  }), [cases]);

  const totals = useMemo(() => rows.reduce((a, r: any) => ({
    claim: a.claim + Number(r.claim_amount || 0),
    recovered: a.recovered + r.recovered, outstanding: a.outstanding + r.outstanding,
  }), { claim: 0, recovered: 0, outstanding: 0 }), [rows]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <button className="text-primary hover:underline" onClick={() => nav(`/legal/lg/cases/${row.original.id}`)}>{getValue() as string}</button> },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "recovered", header: "Recovered", meta: { label: "Recovered", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "outstanding", header: "Outstanding", meta: { label: "Outstanding", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "recovery_pct", header: "Recovery %", meta: { label: "Recovery %", align: "right" },
      cell: ({ getValue }) => `${getValue()}%` },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
  ];

  const summary = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {[
        { label: "Total Claim", value: totals.claim },
        { label: "Recovered", value: totals.recovered },
        { label: "Outstanding", value: totals.outstanding },
        { label: "Recovery %", value: totals.claim > 0 ? Math.round((totals.recovered / totals.claim) * 100) : 0, suffix: "%" },
      ].map((s) => (
        <Card key={s.label}><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-2xl font-semibold">{s.suffix ? `${s.value}${s.suffix}` : `EC$${Number(s.value).toLocaleString()}`}</div>
        </CardContent></Card>
      ))}
    </div>
  );

  return (
    <LgReportShell
      title="Recovery Report" subtitle="Recovery progress by case" breadcrumbTail="Recovery"
      filters={filters} onFiltersChange={setFilters}
      data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Case No", key: "lg_case_no" }, { header: "Status", key: "status_code" },
        { header: "Claim", key: "claim_amount" }, { header: "Recovered", key: "recovered" },
        { header: "Outstanding", key: "outstanding" }, { header: "Recovery %", key: "recovery_pct" },
        { header: "Territory", key: "country_code" },
      ]}
      fileName="lg-recovery-report" gridId="lg.reports.recovery" summary={summary}
    />
  );
}
