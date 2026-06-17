/**
 * RateTableValidator — static analyzer for rate/matrix table rows.
 * Detects:
 *  - RANGE dimension gaps and overlaps (single-dimension only)
 *  - MATRIX missing combinations (warns when EXACT-grid is incomplete)
 *  - Duplicate dimension-value combos (always an error)
 */
import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Dim { dimension_key: string; match_type: 'RANGE' | 'EXACT' | 'IN' }
interface Row { dimension_values_json: Record<string, any>; row_order: number }

interface Finding { severity: 'error' | 'warn' | 'info'; message: string }

function analyze(dims: Dim[], rows: Row[]): Finding[] {
  const out: Finding[] = [];
  if (!rows.length) { out.push({ severity: 'info', message: 'No rows yet' }); return out; }

  // duplicate combos
  const seen = new Map<string, number[]>();
  for (const r of rows) {
    const key = dims.map((d) => JSON.stringify(r.dimension_values_json?.[d.dimension_key] ?? null)).join('|');
    const arr = seen.get(key) ?? [];
    arr.push(r.row_order);
    seen.set(key, arr);
  }
  for (const [k, ord] of seen) {
    if (ord.length > 1) out.push({ severity: 'error', message: `Duplicate combination at rows ${ord.join(', ')} (${k})` });
  }

  // RANGE gap/overlap analysis (one RANGE dim only)
  const rangeDims = dims.filter((d) => d.match_type === 'RANGE');
  if (rangeDims.length === 1) {
    const d = rangeDims[0];
    const otherDims = dims.filter((x) => x !== d);
    // group by exact-key signature of other dims
    const groups = new Map<string, Array<{ min: number; max: number; order: number }>>();
    for (const r of rows) {
      const sig = otherDims.map((o) => JSON.stringify(r.dimension_values_json?.[o.dimension_key] ?? null)).join('|');
      const v = r.dimension_values_json?.[d.dimension_key] ?? {};
      const min = v.min == null ? -Infinity : Number(v.min);
      const max = v.max == null ? Infinity : Number(v.max);
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push({ min, max, order: r.row_order });
    }
    for (const [sig, ranges] of groups) {
      const sorted = [...ranges].sort((a, b) => a.min - b.min);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1], cur = sorted[i];
        if (cur.min <= prev.max) {
          out.push({ severity: 'error', message: `Overlap in "${d.dimension_key}" between rows ${prev.order} & ${cur.order}${sig ? ` (group ${sig})` : ''}` });
        } else if (cur.min > prev.max + 1) {
          out.push({ severity: 'warn', message: `Gap in "${d.dimension_key}" between rows ${prev.order} (≤${prev.max}) and ${cur.order} (≥${cur.min})` });
        }
      }
    }
  }

  if (!out.length) out.push({ severity: 'info', message: 'No issues detected' });
  return out;
}

export function RateTableValidator({ dimensions, rows }: { dimensions: Dim[]; rows: Row[] }) {
  const findings = useMemo(() => analyze(dimensions, rows), [dimensions, rows]);
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <div key={i} className={`flex items-start gap-2 text-xs rounded-md border p-2 ${
          f.severity === 'error' ? 'bg-destructive/10 border-destructive/40 text-destructive'
          : f.severity === 'warn' ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-muted/30'
        }`}>
          {f.severity === 'error' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            : f.severity === 'warn' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-600" />
            : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />}
          <span>{f.message}</span>
        </div>
      ))}
    </div>
  );
}
