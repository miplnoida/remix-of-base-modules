/**
 * BNDataGrid exporters — CSV, Excel (xlsx), PDF (HTML→PDF).
 * Each export embeds the active filter summary, sort order, timestamp and user
 * at the top so downstream consumers can audit what they received.
 */
import * as XLSX from 'xlsx';
import type { Table } from '@tanstack/react-table';

export interface ExportContext {
  filename: string;
  userLabel?: string;
  filterSummary?: string[];
  sortSummary?: string[];
}

interface ExportRowsResult {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

function buildExportRows<T>(table: Table<T>): ExportRowsResult {
  const visibleLeaf = table.getVisibleLeafColumns().filter((c) => {
    const meta = c.columnDef.meta;
    return c.id !== '__select__' && c.id !== '__actions__' && !meta?.noExport;
  });

  const headers = visibleLeaf.map((c) => {
    const meta = c.columnDef.meta;
    return (meta?.label as string) || (c.columnDef.header as string) || c.id;
  });

  const sortedRows = table.getSortedRowModel().rows;
  const filtered = table.getFilteredRowModel().rows;
  const rowsSource = filtered.length ? filtered : sortedRows;

  const rows = rowsSource.map((r) =>
    visibleLeaf.map((c) => {
      const meta = c.columnDef.meta;
      if (meta?.exportValue) return meta.exportValue(r.original);
      const v = r.getValue(c.id);
      if (v == null) return '';
      if (typeof v === 'object') {
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      }
      return v as string | number;
    }),
  );

  return { headers, rows };
}

function buildHeaderLines(ctx: ExportContext): string[] {
  const lines: string[] = [];
  lines.push(`Export: ${ctx.filename}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  if (ctx.userLabel) lines.push(`User: ${ctx.userLabel}`);
  if (ctx.filterSummary?.length) lines.push(`Filters: ${ctx.filterSummary.join(' | ')}`);
  if (ctx.sortSummary?.length) lines.push(`Sort: ${ctx.sortSummary.join(', ')}`);
  return lines;
}

function escapeCsv(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV<T>(table: Table<T>, ctx: ExportContext) {
  const { headers, rows } = buildExportRows(table);
  const meta = buildHeaderLines(ctx).map((l) => `# ${l}`).join('\n');
  const body = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob([meta + '\n\n' + body], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${ctx.filename}.csv`);
}

export function exportXLSX<T>(table: Table<T>, ctx: ExportContext) {
  const { headers, rows } = buildExportRows(table);
  const headerLines = buildHeaderLines(ctx).map((l) => [l]);
  const aoa: (string | number | null | undefined)[][] = [
    ...headerLines,
    [],
    headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, `${ctx.filename}.xlsx`);
}

export function exportPDF<T>(table: Table<T>, ctx: ExportContext) {
  const { headers, rows } = buildExportRows(table);
  const headerHtml = buildHeaderLines(ctx)
    .map((l) => `<div style="font-size:11px;color:#555">${l}</div>`)
    .join('');
  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr>${headers.map((h) => `<th style="border:1px solid #ccc;padding:4px;background:#f3f4f6;text-align:left">${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>${r
                .map((c) => `<td style="border:1px solid #ddd;padding:4px">${escapeHtml(c == null ? '' : String(c))}</td>`)
                .join('')}</tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <!doctype html><html><head><title>${escapeHtml(ctx.filename)}</title>
    <style>body{font-family:system-ui,sans-serif;padding:16px}</style></head>
    <body>${headerHtml}<h2 style="font-size:14px;margin:8px 0">${escapeHtml(ctx.filename)}</h2>${tableHtml}
    <script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
