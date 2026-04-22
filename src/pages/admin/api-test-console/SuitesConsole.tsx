import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Plus, Pencil, Trash2, PlayCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTestRunner } from './useTestRunner';
import type { SavedTestCase, TestEnvironment } from './types';

const CATEGORIES = ['smoke', 'regression', 'auth', 'compliance', 'custom'];

interface Suite {
  id: string;
  name: string;
  description: string | null;
  category: string;
  stop_on_failure: boolean;
  is_active: boolean;
  tags: string[] | null;
}
interface SuiteCase { id: string; suite_id: string; saved_case_id: string; sort_order: number; }

interface SuiteRunReportItem {
  caseId: string;
  caseName: string;
  method: string;
  url: string;
  status: number | null;
  expected: number | null;
  result: string;
  durationMs: number;
  failureReason: string | null;
}

export default function SuitesConsole() {
  const { run } = useTestRunner();
  const [suites, setSuites] = useState<Suite[]>([]);
  const [cases, setCases] = useState<SavedTestCase[]>([]);
  const [envs, setEnvs] = useState<TestEnvironment[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Suite>>({ name: '', category: 'smoke', stop_on_failure: false, is_active: true });
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const [running, setRunning] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<{ suite: Suite; items: SuiteRunReportItem[]; envLabel: string } | null>(null);

  async function load() {
    setLoading(true);
    const [s, c, e] = await Promise.all([
      supabase.from('api_test_suites').select('*').order('name'),
      supabase.from('api_test_saved_cases').select('*').eq('is_active', true).order('name'),
      supabase.from('api_test_environments').select('*').eq('is_active', true).order('sort_order'),
    ]);
    if (s.error) toast.error(s.error.message);
    setSuites((s.data as any) || []);
    setCases((c.data as any) || []);
    setEnvs((e.data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function startEdit(suite?: Suite) {
    if (suite) {
      setEditing(suite);
      const { data } = await supabase.from('api_test_suite_cases').select('saved_case_id').eq('suite_id', suite.id);
      setSelectedCaseIds((data || []).map((r: any) => r.saved_case_id));
    } else {
      setEditing({ name: '', category: 'smoke', stop_on_failure: false, is_active: true });
      setSelectedCaseIds([]);
    }
    setOpen(true);
  }

  async function save() {
    if (!editing.name?.trim()) { toast.error('Name required'); return; }
    const payload = {
      name: editing.name,
      description: editing.description || null,
      category: editing.category || 'smoke',
      stop_on_failure: !!editing.stop_on_failure,
      is_active: editing.is_active !== false,
    };
    let suiteId = (editing as any).id;
    if (suiteId) {
      const { error } = await supabase.from('api_test_suites').update(payload).eq('id', suiteId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from('api_test_suites').insert(payload).select('id').single();
      if (error) { toast.error(error.message); return; }
      suiteId = data!.id;
    }
    // sync suite_cases
    await supabase.from('api_test_suite_cases').delete().eq('suite_id', suiteId);
    if (selectedCaseIds.length) {
      const rows = selectedCaseIds.map((id, i) => ({ suite_id: suiteId, saved_case_id: id, sort_order: i }));
      const { error } = await supabase.from('api_test_suite_cases').insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Suite saved');
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this suite?')) return;
    const { error } = await supabase.from('api_test_suites').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  }

  async function runSuite(suite: Suite) {
    const envKey = localStorage.getItem('atc.activeEnvKey') || 'test';
    const env = envs.find(e => e.env_key === envKey) || envs[0];
    if (!env) { toast.error('No active environment configured'); return; }

    const { data: links } = await supabase
      .from('api_test_suite_cases')
      .select('saved_case_id, sort_order, override_expected_status')
      .eq('suite_id', suite.id)
      .order('sort_order');
    const ids = (links || []).map((l: any) => l.saved_case_id);
    const overrides = new Map((links || []).map((l: any) => [l.saved_case_id, l.override_expected_status]));
    const caseList = ids.map(id => cases.find(c => c.id === id)).filter(Boolean) as SavedTestCase[];
    if (caseList.length === 0) { toast.error('Suite has no cases'); return; }

    setRunning(suite.id);
    const startedAt = performance.now();

    // Create suite run row
    const { data: u } = await supabase.auth.getUser();
    const { data: srRow } = await supabase
      .from('api_test_suite_runs')
      .insert({ suite_id: suite.id, environment_id: env.id, total_cases: caseList.length, triggered_by: u?.user?.id ?? null })
      .select('id')
      .single();
    const suiteRunId = srRow?.id || null;

    let passed = 0, failed = 0, errored = 0;
    const items: SuiteRunReportItem[] = [];

    for (const c of caseList) {
      const headers: Record<string, string> = { ...(c.default_headers || {}) };
      if (!headers['Content-Type'] && c.http_method !== 'GET') headers['Content-Type'] = 'application/json';
      const url = c.endpoint_path.startsWith('http')
        ? c.endpoint_path
        : `${env.edge_functions_url.replace(/\/$/, '')}/${c.endpoint_path.replace(/^\//, '')}`;
      const expected = (overrides.get(c.id) as number | null) ?? c.expected_status ?? undefined;

      const r = await run({
        method: c.http_method,
        url,
        headers,
        body: c.default_body ?? undefined,
        expectedStatus: expected ?? undefined,
        testName: `[${suite.name}] ${c.name}`,
        savedCaseId: c.id,
        environmentId: env.id,
      });

      // best-effort: tag execution row with suite_run_id
      if (suiteRunId && r.executionId) {
        await supabase.from('api_test_executions').update({ suite_run_id: suiteRunId }).eq('id', r.executionId);
      }

      if (r.result === 'pass') passed++;
      else if (r.result === 'fail') failed++;
      else errored++;

      items.push({
        caseId: c.id, caseName: c.name, method: c.http_method, url,
        status: r.status, expected: expected ?? null, result: r.result,
        durationMs: r.durationMs, failureReason: r.failureReason,
      });

      if (suite.stop_on_failure && r.result !== 'pass') break;
    }

    const durationMs = Math.round(performance.now() - startedAt);
    if (suiteRunId) {
      await supabase.from('api_test_suite_runs').update({
        passed, failed, errored, duration_ms: durationMs, finished_at: new Date().toISOString(),
      }).eq('id', suiteRunId);
    }

    setLastReport({ suite, items, envLabel: env.label });
    setRunning(null);
    toast.success(`Suite finished — ${passed} pass / ${failed} fail / ${errored} error`);
  }

  function exportReport() {
    if (!lastReport) return;
    const { suite, items, envLabel } = lastReport;
    const rows = [
      [`Suite Report: ${suite.name}`],
      [`Environment: ${envLabel}`],
      [`Generated: ${new Date().toISOString()}`],
      [],
      ['#', 'Case', 'Method', 'URL', 'Status', 'Expected', 'Result', 'Duration (ms)', 'Failure Reason'],
      ...items.map((i, idx) => [idx + 1, i.caseName, i.method, i.url, i.status ?? '', i.expected ?? '', i.result, i.durationMs, i.failureReason || '']),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suite-report-${suite.name.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Test Suites</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Group saved cases into smoke or regression suites and run them against the active environment.</p>
          </div>
          <Button onClick={() => startEdit()}><Plus className="h-4 w-4 mr-2" /> New Suite</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stop on Fail</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
                {!loading && suites.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No suites defined yet.</TableCell></TableRow>
                )}
                {suites.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}{s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}</TableCell>
                    <TableCell><Badge variant="secondary">{s.category}</Badge></TableCell>
                    <TableCell>{s.stop_on_failure ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{s.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" onClick={() => runSuite(s)} disabled={running === s.id}>
                        <PlayCircle className="h-4 w-4 mr-1" /> {running === s.id ? 'Running…' : 'Run'}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {lastReport && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Last Run — {lastReport.suite.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Environment: {lastReport.envLabel}</p>
            </div>
            <Button variant="outline" onClick={exportReport}><Download className="h-4 w-4 mr-2" /> Export Report</Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Failure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastReport.items.map((i, idx) => (
                    <TableRow key={i.caseId + idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{i.caseName}</TableCell>
                      <TableCell><Badge variant="outline">{i.method}</Badge></TableCell>
                      <TableCell>{i.status ?? '—'}{i.expected ? <span className="text-muted-foreground text-xs"> / {i.expected}</span> : null}</TableCell>
                      <TableCell>
                        <Badge className={i.result === 'pass' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                          {i.result}
                        </Badge>
                      </TableCell>
                      <TableCell>{i.durationMs}ms</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={i.failureReason || ''}>{i.failureReason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(editing as any).id ? 'Edit Suite' : 'New Suite'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2"><Switch checked={!!editing.stop_on_failure} onCheckedChange={v => setEditing({ ...editing, stop_on_failure: v })} /><Label>Stop on failure</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <div className="col-span-2">
              <Label>Cases in this suite</Label>
              <div className="rounded-md border border-border max-h-72 overflow-y-auto p-2 space-y-1">
                {cases.length === 0 && <p className="text-sm text-muted-foreground p-2">No active saved cases. Create some in Saved Cases first.</p>}
                {cases.map(c => {
                  const checked = selectedCaseIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelectedCaseIds(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id));
                        }}
                      />
                      <Badge variant="outline" className="text-xs">{c.http_method}</Badge>
                      <span className="text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto truncate max-w-[260px]" title={c.endpoint_path}>{c.endpoint_path}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedCaseIds.length} selected — execution order matches list order.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleLayout>
  );
}
