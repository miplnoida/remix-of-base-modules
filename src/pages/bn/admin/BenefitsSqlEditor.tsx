/**
 * Benefits SQL Editor — runs read-only queries via public.bn_run_select().
 * Only SELECT / WITH / EXPLAIN / SHOW / TABLE statements are accepted;
 * the server-side function rejects everything else, so no data can be modified.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, ShieldCheck, Download, Code2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

const EXAMPLES: { label: string; sql: string }[] = [
  { label: 'List bn_ tables', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'bn\\_%' ESCAPE '\\' ORDER BY 1" },
  { label: 'Populated bn_ tables', sql: "SELECT * FROM public.bn_list_tables() WHERE row_count > 0 ORDER BY row_count DESC" },
  { label: 'Claim columns', sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='bn_claim' ORDER BY ordinal_position" },
  { label: 'Recent claims', sql: 'SELECT * FROM public.bn_claim ORDER BY created_at DESC NULLS LAST LIMIT 50' },
];

export default function BenefitsSqlEditor() {
  const [sql, setSql] = useState(EXAMPLES[1].sql);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ count: number; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await db.rpc('bn_run_select', { p_sql: sql });
      if (error) throw error;
      const first = Array.isArray(data) ? data[0] : data;
      const out = (first?.rows as any[]) ?? [];
      setRows(out);
      setMeta({ count: Number(first?.row_count ?? out.length), ms: Number(first?.elapsed_ms ?? 0) });
    } catch (e: any) {
      setRows([]);
      setMeta(null);
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bn_query_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Code2 className="h-6 w-6" /> Benefits SQL Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Read-only. Only <code>SELECT</code> / <code>WITH</code> / <code>EXPLAIN</code> / <code>SHOW</code> queries allowed.
            Results capped at 1,000 rows.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm">Query</CardTitle>
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((e) => (
                <Button key={e.label} size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSql(e.sql)}>
                  {e.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            className="font-mono text-sm min-h-[180px] resize-y"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                run();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run {`(⌘/Ctrl + Enter)`}
            </Button>
            <Button variant="outline" disabled={rows.length === 0} onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            {meta && (
              <Badge variant="outline" className="ml-2">
                {meta.count.toLocaleString()} rows · {meta.ms} ms
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive font-mono whitespace-pre-wrap">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded overflow-auto max-h-[60vh]">
            {rows.length === 0 ? (
              <div className="p-6 text-sm text-center text-muted-foreground">
                {loading ? 'Running…' : error ? 'Query failed.' : 'Run a query to see results.'}
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {columns.map((c) => (
                      <th key={c} className="px-2 py-1.5 text-left font-mono font-medium border-b whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="even:bg-muted/20 hover:bg-accent/40">
                      {columns.map((c) => {
                        const v = r[c];
                        const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
                        return (
                          <td key={c} className="px-2 py-1 border-b font-mono align-top max-w-[420px]">
                            <div className="truncate" title={s}>{s || <span className="text-muted-foreground italic">null</span>}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
