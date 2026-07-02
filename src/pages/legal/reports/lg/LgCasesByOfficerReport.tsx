import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, useLgOfficers, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";

export default function LgCasesByOfficerReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);
  const { data: officers = [] } = useLgOfficers();
  const nav = useNavigate();

  const officerName = (id: string | null) => {
    if (!id) return "Unassigned";
    const o: any = officers.find((x: any) => x.user_id === id || x.id === id);
    return o?.full_name || id;
  };

  const rows = useMemo(() => {
    const map = new Map<string, { officerId: string; officer: string; total: number; open: number; closed: number; claim: number }>();
    cases.forEach((c: any) => {
      const key = c.assigned_legal_officer_id || "__un";
      const cur = map.get(key) || { officerId: c.assigned_legal_officer_id || "", officer: officerName(c.assigned_legal_officer_id), total: 0, open: 0, closed: 0, claim: 0 };
      cur.total += 1;
      if (c.status_code === "CLOSED") cur.closed += 1; else cur.open += 1;
      cur.claim += Number(c.claim_amount || 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cases, officers]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "officer", header: "Officer", meta: { label: "Officer", pinLeft: true },
      cell: ({ row, getValue }) => row.original.officerId ? (
        <button className="text-primary hover:underline" onClick={() => setFilters({ ...filters, officerId: row.original.officerId })}>{getValue() as string}</button>
      ) : (getValue() as string) },
    { accessorKey: "total", header: "Total", meta: { label: "Total", align: "right" } },
    { accessorKey: "open", header: "Open", meta: { label: "Open", align: "right" } },
    { accessorKey: "closed", header: "Closed", meta: { label: "Closed", align: "right" } },
    { accessorKey: "claim", header: "Claim Value", meta: { label: "Claim Value", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Cases by Officer" subtitle="Caseload by assigned legal officer" breadcrumbTail="Cases by Officer"
      filters={filters} onFiltersChange={setFilters} data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Officer", key: "officer" }, { header: "Total", key: "total" },
        { header: "Open", key: "open" }, { header: "Closed", key: "closed" },
        { header: "Claim Value", key: "claim" },
      ]}
      fileName="lg-cases-by-officer" gridId="lg.reports.casesByOfficer"
    />
  );
}
