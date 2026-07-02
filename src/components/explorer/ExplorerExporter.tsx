/**
 * Enterprise exporter: acts ONLY on the currently filtered rows.
 * Supports: Excel, PDF, CSV, HTML, JSON, XML, Word (.doc via HTML), Print, Email.
 */
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Mail, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToPDF } from "@/utils/exportUtils";

interface Props {
  title: string;
  fileName: string;
  rows: Record<string, any>[];
  columns: { header: string; key: string }[];
  additionalInfo?: { label: string; value: string }[];
  onScheduleClick?: () => void;
  onEmailClick?: () => void;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: any[], cols: { header: string; key: string }[]) {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map((c) => esc(c.header)).join(","), ...rows.map((r) => cols.map((c) => esc(r[c.key])).join(","))].join("\n");
}

function toHTML(title: string, rows: any[], cols: { header: string; key: string }[]) {
  const th = cols.map((c) => `<th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f3f4f6">${c.header}</th>`).join("");
  const tr = rows.map((r) => `<tr>${cols.map((c) => `<td style="padding:6px 8px;border:1px solid #ddd">${r[c.key] ?? ""}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui,sans-serif"><h2>${title}</h2><div style="color:#666;font-size:12px;margin-bottom:8px">Generated ${new Date().toLocaleString()} • ${rows.length} rows</div><table style="border-collapse:collapse;font-size:12px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;
}

function toXML(root: string, rows: any[]) {
  const esc = (v: any) => String(v ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
  const items = rows.map((r) => `<row>${Object.entries(r).map(([k, v]) => `<${k}>${esc(v)}</${k}>`).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><${root}>${items}</${root}>`;
}

export function ExplorerExporter({ title, fileName, rows, columns, additionalInfo, onScheduleClick, onEmailClick }: Props) {
  const { toast } = useToast();

  const wrap = (fn: () => Promise<void> | void, label: string) => async () => {
    try {
      await fn();
      toast({ title: `${label} exported`, description: `${rows.length} rows.` });
    } catch (e: any) {
      toast({ title: `${label} export failed`, description: e?.message || String(e), variant: "destructive" });
    }
  };

  const doExcel = wrap(() => exportToExcel(rows, columns, fileName, title), "Excel");
  const doPdf = wrap(() => exportToPDF(title, columns, rows, fileName, additionalInfo), "PDF");
  const doCsv = wrap(() => download(new Blob([toCSV(rows, columns)], { type: "text/csv;charset=utf-8" }), `${fileName}.csv`), "CSV");
  const doHtml = wrap(() => download(new Blob([toHTML(title, rows, columns)], { type: "text/html;charset=utf-8" }), `${fileName}.html`), "HTML");
  const doJson = wrap(() => download(new Blob([JSON.stringify({ title, generatedAt: new Date().toISOString(), rows }, null, 2)], { type: "application/json" }), `${fileName}.json`), "JSON");
  const doXml = wrap(() => download(new Blob([toXML(fileName.replace(/[^a-z0-9]/gi, "_"), rows)], { type: "application/xml" }), `${fileName}.xml`), "XML");
  const doWord = wrap(() => download(new Blob(["\ufeff", toHTML(title, rows, columns)], { type: "application/msword" }), `${fileName}.doc`), "Word");
  const doPrint = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(toHTML(title, rows, columns));
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="flex gap-2 no-print">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-background border shadow-lg z-50">
          <DropdownMenuLabel>Current view only ({rows.length} rows)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={doExcel}>Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={doPdf}>PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={doWord}>Word (.doc)</DropdownMenuItem>
          <DropdownMenuItem onClick={doCsv}>CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={doHtml}>HTML</DropdownMenuItem>
          <DropdownMenuItem onClick={doJson}>JSON</DropdownMenuItem>
          <DropdownMenuItem onClick={doXml}>XML</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={doPrint}><Printer className="h-4 w-4 mr-2" />Print</DropdownMenuItem>
          {onEmailClick && <DropdownMenuItem onClick={onEmailClick}><Mail className="h-4 w-4 mr-2" />Email now…</DropdownMenuItem>}
          {onScheduleClick && <DropdownMenuItem onClick={onScheduleClick}>Schedule delivery…</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
