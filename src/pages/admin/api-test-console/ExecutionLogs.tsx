import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Download, Eye, RefreshCw, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import ResponseInspector from './ResponseInspector';
import type { TestExecution } from './types';

const RESULTS = ['pass', 'fail', 'error', 'warning', 'pending'];

function resultColor(r: string) {
  if (r === 'pass') return 'bg-success text-success-foreground';
  if (r === 'fail') return 'bg-destructive text-destructive-foreground';
  if (r === 'error') return 'bg-destructive/80 text-destructive-foreground';
  return 'bg-muted text-foreground';
}

export default function ExecutionLogs() {
  const [items, setItems] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TestExecution | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_test_executions')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(e => {
    if (resultFilter !== 'all' && e.result !== resultFilter) return false;
    if (methodFilter !== 'all' && e.http_method !== methodFilter) return false;
    if (search && !`${e.test_name || ''} ${e.full_url}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, resultFilter, methodFilter, search]);

  function exportCsv() {
    const rows = [
      ['Executed At', 'Test', 'Method', 'URL', 'Status', 'Expected', 'Result', 'Duration (ms)', 'Failure Reason'],
      ...filtered.map(e => [
        e.executed_at,
        e.test_name || '',
        e.http_method,
        e.full_url,
        e.response_status ?? '',
        e.expected_status ?? '',
        e.result,
        e.duration_ms ?? '',
        e.failure_reason || '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-executions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  }

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Execution Logs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 500 test executions across environments.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            <Button onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search test name / URL…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                {RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No executions match the filters.</TableCell></TableRow>
                )}
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(e.executed_at).toLocaleString()}</TableCell>
                    <TableCell>{e.test_name || <span className="text-muted-foreground italic">ad-hoc</span>}</TableCell>
                    <TableCell><Badge variant="outline">{e.http_method}</Badge></TableCell>
                    <TableCell className="font-mono text-xs max-w-[280px] truncate" title={e.full_url}>{e.full_url}</TableCell>
                    <TableCell>{e.response_status ?? '—'}{e.expected_status ? <span className="text-muted-foreground text-xs"> / {e.expected_status}</span> : null}</TableCell>
                    <TableCell><Badge className={resultColor(e.result)}>{e.result}</Badge></TableCell>
                    <TableCell>{e.duration_ms ?? '—'}ms</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setActive(e); setOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Execution Detail</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-4 space-y-4">
              <div className="text-xs text-muted-foreground">{active.test_name || 'Ad-hoc request'} • {new Date(active.executed_at).toLocaleString()}</div>
              <ResponseInspector
                method={active.http_method}
                url={active.full_url}
                requestHeaders={active.request_headers}
                requestBody={active.request_body}
                status={active.response_status}
                responseHeaders={active.response_headers}
                responseBody={active.response_body}
                durationMs={active.duration_ms}
                result={active.result}
                failureReason={active.failure_reason}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </ConsoleLayout>
  );
}
