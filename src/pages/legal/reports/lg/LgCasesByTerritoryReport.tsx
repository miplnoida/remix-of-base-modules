import { useMemo, useState } from "react";
import { LgReportShell } from "@/components/legal/reports/LgReportShell";
import { useLgReportCases, type LgReportFilters } from "@/hooks/legal/useLgReports";
import type { LgColumnDef } from "@/components/legal/grid";

export default function LgCasesByTerritoryReport() {
  const [filters, setFilters] = useState<LgReportFilters>({});
  const { data: cases = [], isLoading } = useLgReportCases(filters);

  const rows = useMemo(() => {
    const map = new Map<string, { territory: string; total: number; open: number; closed: number; claim: number }>();
    cases.forEach((c: any) => {
      const k = c.country_code || "UNSET";
      const cur = map.get(k) || { territory: k, total: 0, open: 0, closed: 0, claim: 0 };
      cur.total += 1;
      if (c.status_code === "CLOSED") cur.closed += 1; else cur.open += 1;
      cur.claim += Number(c.claim_amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cases]);

  const columns: LgColumnDef<any>[] = [
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory", pinLeft: true },
      cell: ({ row, getValue }) => (
        <button className="text-primary hover:underline" onClick={() => setFilters({ ...filters, territory: row.original.territory })}>{getValue() as string}</button>
      ) },
    { accessorKey: "total", header: "Total", meta: { label: "Total", align: "right" } },
    { accessorKey: "open", header: "Open", meta: { label: "Open", align: "right" } },
    { accessorKey: "closed", header: "Closed", meta: { label: "Closed", align: "right" } },
    { accessorKey: "claim", header: "Claim Value", meta: { label: "Claim Value", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ];

  return (
    <LgReportShell
      title="Cases by Territory" subtitle="Distribution across territories" breadcrumbTail="Cases by Territory"
      filters={filters} onFiltersChange={setFilters} data={rows} columns={columns} loading={isLoading}
      exportColumns={[
        { header: "Territory", key: "territory" }, { header: "Total", key: "total" },
        { header: "Open", key: "open" }, { header: "Closed", key: "closed" }, { header: "Claim", key: "claim" },
      ]}
      fileName="lg-cases-by-territory" gridId="lg.reports.casesByTerritory"
    />
  );
}
