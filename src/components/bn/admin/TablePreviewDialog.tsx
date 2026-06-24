/**
 * Read-only data viewer for any bn_* table or view.
 * Uses public.bn_preview_table(text, int, int) — never mutates data.
 */
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;
const PAGE_SIZE = 100;

interface Props {
  tableName: string | null;
  onClose: () => void;
}

export default function TablePreviewDialog({ tableName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!tableName) return;
    setPage(0);
  }, [tableName]);

  useEffect(() => {
    if (!tableName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await db.rpc('bn_preview_table', {
          p_table: tableName,
          p_limit: PAGE_SIZE,
          p_offset: page * PAGE_SIZE,
        });
        if (error) throw error;
        if (cancelled) return;
        const first = Array.isArray(data) ? data[0] : data;
        setRows((first?.rows as any[]) ?? []);
        setTotal(Number(first?.total_count ?? 0));
      } catch (e: any) {
        if (!cancelled) toast.error('Failed to load data', { description: e?.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tableName, page]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const downloadCsv = () => {
    if (rows.length === 0) return;
    const esc = (v: any) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      columns.join(','),
      ...rows.map((r) => columns.map((c) => esc(r[c])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_page${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!tableName} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-base flex items-center justify-between gap-4">
            <span>{tableName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {total.toLocaleString()} rows · page {page + 1} / {pageCount}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b pb-2">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" /> CSV (this page)
          </Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex-1 overflow-auto border rounded">
          {rows.length === 0 && !loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No rows.</div>
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
      </DialogContent>
    </Dialog>
  );
}
