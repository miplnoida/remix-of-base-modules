/**
 * RateTableImportExport — CSV download/upload helpers for rate-table rows.
 * Columns: row_order, <dim1.min>, <dim1.max> | <dim>, ..., output_value, output_type, effective_from, effective_to, notes
 */
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Dim { dimension_key: string; match_type: 'RANGE' | 'EXACT' | 'IN' }
interface Row {
  row_order: number;
  dimension_values_json: Record<string, any>;
  output_value: number | null;
  output_type: string;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
}

function rowsToCsv(dims: Dim[], rows: Row[]): string {
  const header: string[] = ['row_order'];
  for (const d of dims) {
    if (d.match_type === 'RANGE') header.push(`${d.dimension_key}_min`, `${d.dimension_key}_max`);
    else header.push(d.dimension_key);
  }
  header.push('output_value', 'output_type', 'effective_from', 'effective_to', 'notes');
  const lines = [header.join(',')];
  for (const r of rows) {
    const cells: string[] = [String(r.row_order)];
    for (const d of dims) {
      const v = r.dimension_values_json?.[d.dimension_key];
      if (d.match_type === 'RANGE') {
        cells.push(v?.min == null ? '' : String(v.min), v?.max == null ? '' : String(v.max));
      } else cells.push(v == null ? '' : String(v));
    }
    cells.push(
      r.output_value == null ? '' : String(r.output_value),
      r.output_type,
      r.effective_from ?? '',
      r.effective_to ?? '',
      (r.notes ?? '').replace(/"/g, '""'),
    );
    lines.push(cells.map((c) => /[,"\n]/.test(c) ? `"${c}"` : c).join(','));
  }
  return lines.join('\n');
}

function csvToRows(dims: Dim[], csv: string): Row[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(',').map((s) => s.trim());
  const idx = (k: string) => head.indexOf(k);
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(','); // basic CSV (no embedded commas)
    const dimVals: Record<string, any> = {};
    for (const d of dims) {
      if (d.match_type === 'RANGE') {
        const mn = cells[idx(`${d.dimension_key}_min`)];
        const mx = cells[idx(`${d.dimension_key}_max`)];
        dimVals[d.dimension_key] = { min: mn === '' ? null : Number(mn), max: mx === '' ? null : Number(mx) };
      } else {
        dimVals[d.dimension_key] = cells[idx(d.dimension_key)];
      }
    }
    out.push({
      row_order: Number(cells[idx('row_order')] || i),
      dimension_values_json: dimVals,
      output_value: cells[idx('output_value')] === '' ? null : Number(cells[idx('output_value')]),
      output_type: cells[idx('output_type')] || 'AMOUNT',
      effective_from: cells[idx('effective_from')] || null,
      effective_to: cells[idx('effective_to')] || null,
      notes: cells[idx('notes')] || null,
    });
  }
  return out;
}

export function RateTableImportExport({
  tableCode, dims, rows, onImport,
}: {
  tableCode: string; dims: Dim[]; rows: Row[]; onImport: (rows: Row[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const csv = rowsToCsv(dims, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${tableCode}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (f: File) => {
    try {
      const text = await f.text();
      const parsed = csvToRows(dims, text);
      onImport(parsed);
      toast.success(`Imported ${parsed.length} row(s) — review and save`);
    } catch (e: any) {
      toast.error(`Import failed: ${e.message ?? e}`);
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={download} className="gap-1.5">
        <Download className="h-3.5 w-3.5" /> Export CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} className="gap-1.5">
        <Upload className="h-3.5 w-3.5" /> Import CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
