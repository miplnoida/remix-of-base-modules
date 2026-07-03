/**
 * EPIC-09A — Reusable Report Viewer
 *
 * Phase 1: renders any LegalReportDefinition against a row provider.
 * Supports search, sorting, column visibility, pagination, totals row,
 * export (Excel/CSV/PDF/Print) with export-audit hooks.
 *
 * Phase 2 will layer grouping, drill-down navigation and saved filters.
 */

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, FileSpreadsheet, FileText, Columns3, Search, Save } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateForDisplay } from "@/lib/format-config";
import { exportReportToExcel } from "@/utils/reportExcelExport";
import { toast } from "sonner";
import type { LegalReportDefinition, LegalReportColumn } from "@/config/legalReportDefinitions";
import { writeExportAudit } from "@/services/legal/lgReportingService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface ReportViewerProps {
  definition: LegalReportDefinition;
  rows: any[];
  loading?: boolean;
  filterPanel?: React.ReactNode;
  summaryCards?: React.ReactNode;
  chart?: React.ReactNode;
  activeFilters?: Record<string, any>;
  onDrilldown?: (row: any) => void;
  onSaveReport?: () => void;
  pageSize?: number;
}

function renderCell(col: LegalReportColumn, value: any) {
  if (value == null || value === "") return "—";
  switch (col.type) {
    case "currency": return formatCurrency(Number(value ?? 0));
    case "date":     return formatDateForDisplay(String(value));
    case "datetime": return formatDateForDisplay(String(value));
    case "number":   return Number(value).toLocaleString();
    case "badge":    return <Badge variant="outline" className="font-normal">{String(value)}</Badge>;
    default:         return String(value);
  }
}

export function ReportViewer({
  definition, rows, loading, filterPanel, summaryCards, chart,
  activeFilters, onDrilldown, onSaveReport, pageSize = 25,
}: ReportViewerProps) {
  const { user } = useSupabaseAuth();

  const columns = definition.columns.length
    ? definition.columns
    : Object.keys(rows[0] ?? {}).slice(0, 8).map((k) => ({ key: k, header: k } as LegalReportColumn));

  const [visible, setVisible] = useState<Set<string>>(new Set(columns.map((c) => c.key)));
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    columns.forEach((c) => {
      if (c.aggregate === "sum") {
        t[c.key] = sorted.reduce((s, r) => s + Number(r[c.key] ?? 0), 0);
      }
    });
    return t;
  }, [sorted, columns]);

  const visibleCols = columns.filter((c) => visible.has(c.key));

  async function audit(format: ExportFormat) {
    if (!user) return;
    await writeExportAudit({
      report_code: definition.code,
      report_name: definition.name,
      exported_by: user.id,
      format,
      filters_json: activeFilters ?? {},
      row_count: sorted.length,
      file_name: `${definition.code}_${new Date().toISOString().slice(0,10)}.${format === "print" ? "pdf" : format}`,
    });
  }

  type ExportFormat = "xlsx" | "csv" | "pdf" | "print";

  async function handleExcel() {
    await exportReportToExcel(
      sorted,
      visibleCols.map((c) => ({ header: c.header, key: c.key })),
      `${definition.code}_${new Date().toISOString().slice(0,10)}`,
      definition.name.slice(0, 30),
    );
    await audit("xlsx");
    toast.success("Excel exported");
  }

  function handleCsv() {
    const headers = visibleCols.map((c) => c.header).join(",");
    const body = sorted.map((r) =>
      visibleCols.map((c) => `"${String(r[c.key] ?? "").replace(/"/g,'""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${definition.code}.csv`; a.click();
    URL.revokeObjectURL(url);
    audit("csv");
    toast.success("CSV exported");
  }

  function handlePrint() {
    window.print();
    audit("print");
  }

  async function handlePdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(definition.name, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [visibleCols.map((c) => c.header)],
      body: sorted.map((r) => visibleCols.map((c) => {
        const v = r[c.key];
        if (c.type === "currency") return formatCurrency(Number(v ?? 0));
        if (c.type === "date" || c.type === "datetime") return v ? formatDateForDisplay(String(v)) : "";
        return v ?? "";
      })),
      styles: { fontSize: 8 },
    });
    doc.save(`${definition.code}.pdf`);
    await audit("pdf");
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <PageHeader
        title={definition.name}
        subtitle={definition.purpose}
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics", href: "/legal/reports" },
          { label: definition.name },
        ]}
      />

      {filterPanel}
      {summaryCards}
      {chart}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Results ({sorted.length.toLocaleString()})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9 w-56"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Columns3 className="h-4 w-4 mr-1" />Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visible.has(c.key)}
                    onCheckedChange={(v) => {
                      const next = new Set(visible);
                      if (v) next.add(c.key); else next.delete(c.key);
                      setVisible(next);
                    }}
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {onSaveReport && (
              <Button variant="outline" size="sm" onClick={onSaveReport}>
                <Save className="h-4 w-4 mr-1" />Save
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCsv}><FileText className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handlePdf}><FileText className="h-4 w-4 mr-2" />PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Print</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleCols.map((c) => (
                    <TableHead
                      key={c.key}
                      className={c.align === "right" ? "text-right cursor-pointer" : "cursor-pointer"}
                      onClick={() => {
                        if (sortKey === c.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortKey(c.key); setSortDir("asc"); }
                      }}
                    >
                      {c.header}
                      {sortKey === c.key && <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                ) : paged.map((r, i) => (
                  <TableRow
                    key={r.id ?? i}
                    className={onDrilldown ? "cursor-pointer hover:bg-muted/40" : ""}
                    onClick={() => onDrilldown?.(r)}
                  >
                    {visibleCols.map((c) => (
                      <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                        {renderCell(c, r[c.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {Object.keys(totals).length > 0 && paged.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    {visibleCols.map((c, idx) => (
                      <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                        {idx === 0 ? "Total" : (totals[c.key] != null ? formatCurrency(totals[c.key]) : "")}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
