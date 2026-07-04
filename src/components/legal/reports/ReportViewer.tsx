/**
 * EPIC-09A / 09B — Reusable Report Viewer
 *
 * Renders any LegalReportDefinition against a row provider.
 * Supports search, sort, column visibility, pagination, totals row,
 * export (Excel/CSV/PDF/Print) with audit hooks.
 *
 * EPIC-09B additions (Part 8):
 *  - Multi-level grouping with summary rows
 *  - Pivot mode (row × col aggregation)
 *  - Favourites / Pinned toggles + Recently-used history
 *  - Column presets (save/load/delete)
 *  - Saved layouts (grouping + pivot + conditional formatting persisted per report)
 *  - Conditional formatting (rules by column threshold)
 *  - Export preview modal
 *  - Quick search (already), toolbar cleaned up
 */

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Printer, FileSpreadsheet, FileText, Columns3, Search, Save,
  Star, Pin, Layers, Eye, Settings2,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateForDisplay } from "@/lib/format-config";
import { exportReportToExcel } from "@/utils/reportExcelExport";
import { toast } from "sonner";
import type { LegalReportDefinition, LegalReportColumn } from "@/config/legalReportDefinitions";
import { writeExportAudit } from "@/services/legal/lgReportingService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import {
  isFavourite, toggleFavourite, isPinned, togglePinned, recordHistory,
  getColumnPresets, saveColumnPreset, deleteColumnPreset,
  getReportLayout, saveReportLayout, type ReportLayout,
} from "@/services/legal/lgReportPersonalization";

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

type ExportFormat = "xlsx" | "csv" | "pdf" | "print";

function renderCell(col: LegalReportColumn, value: any) {
  if (value == null || value === "") return "—";
  switch (col.type) {
    case "currency": return formatCurrency(Number(value ?? 0));
    case "date":
    case "datetime": return formatDateForDisplay(String(value));
    case "number":   return Number(value).toLocaleString();
    case "badge":    return <Badge variant="outline" className="font-normal">{String(value)}</Badge>;
    default:         return String(value);
  }
}

function toneClass(tone?: "success" | "warning" | "danger") {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "danger") return "bg-red-50 text-red-700";
  return "";
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

  const [fav, setFav] = useState(isFavourite(definition.code));
  const [pin, setPin] = useState(isPinned(definition.code));
  const [showPreview, setShowPreview] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [layout, setLayout] = useState<ReportLayout>(getReportLayout(definition.code));

  useEffect(() => { recordHistory(definition.code, definition.name); }, [definition.code, definition.name]);

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

  const groupCols = layout.groupBy ?? [];
  const grouped = useMemo(() => {
    if (!groupCols.length) return null;
    const root: any = { key: "__root", rows: [], children: new Map() };
    for (const r of sorted) {
      let node = root;
      for (const g of groupCols) {
        const v = r[g] ?? "—";
        if (!node.children.has(v)) node.children.set(v, { key: v, rows: [], children: new Map() });
        node = node.children.get(v);
      }
      node.rows.push(r);
    }
    return root;
  }, [sorted, groupCols]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = grouped ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    columns.forEach((c) => {
      if (c.aggregate === "sum") t[c.key] = sorted.reduce((s, r) => s + Number(r[c.key] ?? 0), 0);
    });
    return t;
  }, [sorted, columns]);

  const visibleCols = columns.filter((c) => visible.has(c.key));

  const evalTone = (col: string, v: any) => {
    for (const rule of layout.conditionalRules ?? []) {
      if (rule.column !== col) continue;
      const n = Number(v ?? 0);
      const ok = rule.op === "gt" ? n > rule.value : rule.op === "lt" ? n < rule.value : n === rule.value;
      if (ok) return rule.tone;
    }
    return undefined;
  };

  async function audit(format: ExportFormat) {
    if (!user) return;
    await writeExportAudit({
      report_code: definition.code, report_name: definition.name, exported_by: user.id,
      format, filters_json: activeFilters ?? {}, row_count: sorted.length,
      file_name: `${definition.code}_${new Date().toISOString().slice(0,10)}.${format === "print" ? "pdf" : format}`,
    });
  }

  async function handleExcel() {
    await exportReportToExcel(sorted, visibleCols.map((c) => ({ header: c.header, key: c.key })),
      `${definition.code}_${new Date().toISOString().slice(0,10)}`, definition.name.slice(0, 30));
    await audit("xlsx"); toast.success("Excel exported");
  }
  function handleCsv() {
    const headers = visibleCols.map((c) => c.header).join(",");
    const body = sorted.map((r) => visibleCols.map((c) => `"${String(r[c.key] ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${definition.code}.csv`; a.click();
    URL.revokeObjectURL(url); audit("csv"); toast.success("CSV exported");
  }
  function handlePrint() { window.print(); audit("print"); }
  async function handlePdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14); doc.text(definition.name, 14, 14);
    autoTable(doc, {
      startY: 20, head: [visibleCols.map((c) => c.header)],
      body: sorted.map((r) => visibleCols.map((c) => {
        const v = r[c.key];
        if (c.type === "currency") return formatCurrency(Number(v ?? 0));
        if (c.type === "date" || c.type === "datetime") return v ? formatDateForDisplay(String(v)) : "";
        return v ?? "";
      })), styles: { fontSize: 8 },
    });
    doc.save(`${definition.code}.pdf`); await audit("pdf");
  }

  function persistLayout(patch: Partial<ReportLayout>) {
    const next = { ...layout, ...patch };
    setLayout(next); saveReportLayout(definition.code, next);
  }

  function renderRow(r: any, i: number) {
    return (
      <TableRow key={r.id ?? i}
        className={onDrilldown ? "cursor-pointer hover:bg-muted/40" : ""}
        onClick={() => onDrilldown?.(r)}>
        {visibleCols.map((c) => {
          const tone = evalTone(c.key, r[c.key]);
          return (
            <TableCell key={c.key}
              className={`${c.align === "right" ? "text-right tabular-nums" : ""} ${toneClass(tone)}`}>
              {renderCell(c, r[c.key])}
            </TableCell>
          );
        })}
      </TableRow>
    );
  }

  function renderGroup(node: any, depth = 0, path: string[] = []): React.ReactNode[] {
    if (node.children.size === 0) return node.rows.map((r: any, i: number) => renderRow(r, i));
    const parts: React.ReactNode[] = [];
    Array.from(node.children.entries()).forEach(([k, child]: [any, any]) => {
      const p = [...path, String(k)];
      const rowCount = (function count(n: any): number { let c = n.rows.length; for (const cc of n.children.values()) c += count(cc); return c; })(child);
      const sums: Record<string, number> = {};
      (function walk(n: any) { for (const r of n.rows) for (const c of columns) if (c.aggregate === "sum") sums[c.key] = (sums[c.key] ?? 0) + Number(r[c.key] ?? 0); for (const cc of n.children.values()) walk(cc); })(child);
      parts.push(
        <TableRow key={`grp-${p.join("|")}`} className="bg-muted/40 font-medium">
          <TableCell colSpan={visibleCols.length} style={{ paddingLeft: 8 + depth * 16 }}>
            <span className="text-primary">{groupCols[depth]}:</span> <strong>{String(k)}</strong>
            <span className="ml-2 text-xs text-muted-foreground">({rowCount})</span>
            {Object.entries(sums).map(([kk, v]) => {
              const col = columns.find((c) => c.key === kk);
              return <span key={kk} className="ml-4 text-xs">{col?.header}: <strong>{formatCurrency(v)}</strong></span>;
            })}
          </TableCell>
        </TableRow>
      );
      parts.push(...renderGroup(child, depth + 1, p));
    });
    return parts;
  }

  // Pivot mode ---------------------------------------------------------------
  const pivotView = useMemo(() => {
    if (!layout.pivotEnabled || !layout.pivotRow || !layout.pivotCol) return null;
    const rowKey = layout.pivotRow, colKey = layout.pivotCol;
    const aggKey = layout.pivotAgg ?? columns.find((c) => c.aggregate === "sum")?.key ?? columns[0]?.key;
    const rowsSet = new Set<string>(), colsSet = new Set<string>();
    const matrix = new Map<string, Map<string, number>>();
    for (const r of sorted) {
      const rk = String(r[rowKey] ?? "—"), ck = String(r[colKey] ?? "—");
      rowsSet.add(rk); colsSet.add(ck);
      if (!matrix.has(rk)) matrix.set(rk, new Map());
      const cur = matrix.get(rk)!.get(ck) ?? 0;
      matrix.get(rk)!.set(ck, cur + Number(r[aggKey] ?? 0));
    }
    return {
      rows: Array.from(rowsSet).sort(),
      cols: Array.from(colsSet).sort(),
      matrix, aggKey,
    };
  }, [layout, sorted, columns]);

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
        actions={
          <div className="flex items-center gap-1">
            <Button variant={fav ? "default" : "outline"} size="icon" title="Favourite"
              onClick={() => { setFav(!fav); toggleFavourite(definition.code); }}>
              <Star className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
            </Button>
            <Button variant={pin ? "default" : "outline"} size="icon" title="Pin"
              onClick={() => { setPin(!pin); togglePinned(definition.code); }}>
              <Pin className={`h-4 w-4 ${pin ? "fill-current" : ""}`} />
            </Button>
          </div>
        }
      />

      {filterPanel}
      {summaryCards}
      {chart}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
          <CardTitle className="text-base">
            {layout.pivotEnabled ? "Pivot view" : "Results"} ({sorted.length.toLocaleString()})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9 w-56" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Columns3 className="h-4 w-4 mr-1" />Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem key={c.key} checked={visible.has(c.key)}
                    onCheckedChange={(v) => {
                      const next = new Set(visible);
                      if (v) next.add(c.key); else next.delete(c.key);
                      setVisible(next);
                    }}>{c.header}</DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowPresets(true)}>Manage presets…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => setShowLayout(true)}>
              <Settings2 className="h-4 w-4 mr-1" />Layout
            </Button>

            {onSaveReport && (
              <Button variant="outline" size="sm" onClick={onSaveReport}>
                <Save className="h-4 w-4 mr-1" />Save
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-1" />Preview
            </Button>

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
            {pivotView ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{layout.pivotRow}</TableHead>
                    {pivotView.cols.map((c) => <TableHead key={c} className="text-right">{c}</TableHead>)}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotView.rows.map((r) => {
                    const rowTotal = pivotView.cols.reduce((s, c) => s + (pivotView.matrix.get(r)?.get(c) ?? 0), 0);
                    return (
                      <TableRow key={r}>
                        <TableCell className="font-medium">{r}</TableCell>
                        {pivotView.cols.map((c) => (
                          <TableCell key={c} className="text-right tabular-nums">
                            {formatCurrency(pivotView.matrix.get(r)?.get(c) ?? 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(rowTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.map((c) => (
                      <TableHead key={c.key}
                        className={`${c.align === "right" ? "text-right" : ""} cursor-pointer`}
                        onClick={() => { if (sortKey === c.key) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(c.key); setSortDir("asc"); } }}>
                        {c.header}
                        {sortKey === c.key && <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : sorted.length === 0 ? (
                    <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  ) : grouped ? renderGroup(grouped) : paged.map(renderRow)}
                  {!grouped && Object.keys(totals).length > 0 && paged.length > 0 && (
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
            )}
          </div>
          {!grouped && !pivotView && totalPages > 1 && (
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

      {/* Layout dialog: grouping + pivot + conditional formatting */}
      <Dialog open={showLayout} onOpenChange={setShowLayout}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Layout & formatting</DialogTitle>
            <DialogDescription>Grouping, pivot mode and conditional highlighting persist per report.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Group by (comma-separated column keys)</Label>
              <Input value={(layout.groupBy ?? []).join(",")}
                onChange={(e) => persistLayout({ groupBy: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. status_code, priority" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Pivot row</Label>
                <Select value={layout.pivotRow ?? "__none"} onValueChange={(v) => persistLayout({ pivotRow: v === "__none" ? undefined : v, pivotEnabled: v !== "__none" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.header}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pivot col</Label>
                <Select value={layout.pivotCol ?? "__none"} onValueChange={(v) => persistLayout({ pivotCol: v === "__none" ? undefined : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.header}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Aggregate</Label>
                <Select value={layout.pivotAgg ?? "__auto"} onValueChange={(v) => persistLayout({ pivotAgg: v === "__auto" ? undefined : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Auto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto">Auto</SelectItem>
                    {columns.filter((c) => c.aggregate === "sum").map((c) => <SelectItem key={c.key} value={c.key}>{c.header}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Conditional rules (column, op, value, tone)</Label>
              <p className="text-xs text-muted-foreground mb-1">Example: <code>total_outstanding gt 10000 danger</code></p>
              <Input
                value={(layout.conditionalRules ?? []).map((r) => `${r.column} ${r.op} ${r.value} ${r.tone}`).join(" | ")}
                placeholder="col gt 1000 warning | recovery_pct lt 50 danger"
                onChange={(e) => {
                  const rules = e.target.value.split("|").map((s) => s.trim()).filter(Boolean).map((s) => {
                    const [column, op, value, tone] = s.split(/\s+/);
                    return { column, op: op as any, value: Number(value), tone: (tone as any) ?? "warning" };
                  }).filter((r) => r.column && r.op && !isNaN(r.value));
                  persistLayout({ conditionalRules: rules });
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { const empty: ReportLayout = {}; setLayout(empty); saveReportLayout(definition.code, empty); }}>Reset</Button>
            <Button onClick={() => setShowLayout(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column preset manager */}
      <PresetDialog open={showPresets} onOpenChange={setShowPresets}
        definition={definition} visible={visible} setVisible={setVisible} columns={columns} />

      {/* Export preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Export preview</DialogTitle>
            <DialogDescription>Preview of the exact rows that will be exported ({sorted.length}).</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader><TableRow>{visibleCols.map((c) => <TableHead key={c.key}>{c.header}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {sorted.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>{visibleCols.map((c) => <TableCell key={c.key}>{renderCell(c, r[c.key])}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
            {sorted.length > 200 && <p className="text-xs text-muted-foreground p-2">Showing first 200 rows.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresetDialog({ open, onOpenChange, definition, visible, setVisible, columns }: any) {
  const [presets, setPresets] = useState(getColumnPresets(definition.code));
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Column presets</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preset name" />
            <Button size="sm" onClick={() => {
              if (!name.trim()) return;
              const next = saveColumnPreset(definition.code, { name: name.trim(), visibleKeys: Array.from(visible) });
              setPresets(next); setName(""); toast.success("Preset saved");
            }}>Save current</Button>
          </div>
          <div className="space-y-1">
            {presets.length === 0 && <p className="text-xs text-muted-foreground">No presets yet.</p>}
            {presets.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between border rounded p-2 text-sm">
                <span>{p.name} <span className="text-xs text-muted-foreground">({p.visibleKeys.length} cols)</span></span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setVisible(new Set(p.visibleKeys)); toast.success(`Applied: ${p.name}`); }}>Apply</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPresets(deleteColumnPreset(definition.code, p.name)); }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
