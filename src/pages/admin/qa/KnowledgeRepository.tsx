import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  BookOpen, Plus, Wand2, Edit2, CheckCircle2, AlertTriangle,
  Search, Filter, Database, Layers, GitBranch, Shield, Globe, Zap, Eye,
  ChevronRight, Tag, Clock, RotateCcw, FlaskConical, Play
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchKnowledgeEntries, createKnowledgeEntry, updateKnowledgeEntry,
  fetchTestCases, createTestCase, updateTestCase, deleteTestCase,
  generateAITestCases, triggerTestRun, fetchDistinctModules,
  type QAKnowledgeEntry, type QATestCase,
} from '@/services/qaService';

const RULE_TYPE_ICONS: Record<string, React.ReactNode> = {
  validation: <CheckCircle2 className="h-3.5 w-3.5" />,
  calculation: <Zap className="h-3.5 w-3.5" />,
  workflow: <GitBranch className="h-3.5 w-3.5" />,
  api_contract: <Globe className="h-3.5 w-3.5" />,
  ui_behavior: <Eye className="h-3.5 w-3.5" />,
  db_constraint: <Database className="h-3.5 w-3.5" />,
  access_control: <Shield className="h-3.5 w-3.5" />,
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-destructive',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-muted-foreground',
};

function EntryForm({ entry, onClose, onSaved }: { entry?: QAKnowledgeEntry; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<QAKnowledgeEntry>>({
    title: '', module: '', rule_type: 'validation', priority: 'medium',
    status: 'active', description: '', expected_behavior: '',
    screen_path: '', db_table: '', api_endpoint: '', workflow_step: '',
    rule_definition: {}, tags: [],
    ...entry,
  });
  const [tagInput, setTagInput] = useState((entry?.tags || []).join(', '));
  const [ruleJson, setRuleJson] = useState(JSON.stringify(entry?.rule_definition || {}, null, 2));

  const save = useMutation({
    mutationFn: async () => {
      let parsed = {};
      try { parsed = JSON.parse(ruleJson); } catch { throw new Error('Rule Definition must be valid JSON'); }
      const payload = { ...form, rule_definition: parsed, tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) };
      if (entry?.id) return updateKnowledgeEntry(entry.id, payload);
      return createKnowledgeEntry(payload);
    },
    onSuccess: () => { toast.success(entry ? 'Entry updated (new version created)' : 'Entry created'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: keyof QAKnowledgeEntry, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {entry ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
              <Input value={form.title || ''} onChange={e => set('title', e.target.value)} className="mt-1" placeholder="Descriptive rule title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Module <span className="text-destructive">*</span></Label>
                <Input value={form.module || ''} onChange={e => set('module', e.target.value)} className="mt-1" placeholder="e.g. IP Registration" />
              </div>
              <div>
                <Label className="text-xs">Submodule</Label>
                <Input value={form.submodule || ''} onChange={e => set('submodule', e.target.value)} className="mt-1" placeholder="e.g. Address" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Rule Type</Label>
                <Select value={form.rule_type} onValueChange={v => set('rule_type', v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(RULE_TYPE_ICONS).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => set('priority', v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['critical', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['active', 'draft', 'deprecated'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Screen Path</Label>
                <Input value={form.screen_path || ''} onChange={e => set('screen_path', e.target.value)} className="mt-1" placeholder="/ip-registration" />
              </div>
              <div>
                <Label className="text-xs">DB Table</Label>
                <Input value={form.db_table || ''} onChange={e => set('db_table', e.target.value)} className="mt-1" placeholder="ip_master" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Expected Behavior</Label>
              <Textarea value={form.expected_behavior || ''} onChange={e => set('expected_behavior', e.target.value)} className="mt-1 resize-none" rows={2} placeholder="Describe what the system should do…" />
            </div>
            <div>
              <Label className="text-xs">Rule Definition (JSON)</Label>
              <Textarea value={ruleJson} onChange={e => setRuleJson(e.target.value)} className="mt-1 resize-none font-mono text-xs" rows={4} placeholder='{ "rule": "..." }' />
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} className="mt-1" placeholder="validation, ip_master, critical" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || !form.title || !form.module} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : entry ? 'Save New Version' : 'Create Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestCaseForm({ tc, defaultModule, onClose, onSaved }: { tc?: QATestCase; defaultModule?: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<QATestCase>>({
    title: '', module: defaultModule || '', test_type: 'positive', priority: 'medium',
    status: 'active', is_mandatory: false, description: '', test_config: {}, expected_result: {},
    ...tc,
  });
  const [configJson, setConfigJson] = useState(JSON.stringify(tc?.test_config || {
    method: 'SUPABASE_QUERY', endpoint: '', payload: {}, expected_status: 'success', assertions: []
  }, null, 2));
  const [expectedJson, setExpectedJson] = useState(JSON.stringify(tc?.expected_result || {
    status: 'passed', description: '', validations: []
  }, null, 2));

  const save = useMutation({
    mutationFn: async () => {
      let cfg = {}, exp = {};
      try { cfg = JSON.parse(configJson); } catch { throw new Error('Test Config must be valid JSON'); }
      try { exp = JSON.parse(expectedJson); } catch { throw new Error('Expected Result must be valid JSON'); }
      const payload = { ...form, test_config: cfg, expected_result: exp };
      if (tc?.id) return updateTestCase(tc.id, payload);
      return createTestCase({ ...payload, generation_source: 'manual' });
    },
    onSuccess: () => { toast.success(tc ? 'Test case updated' : 'Test case created'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: keyof QATestCase, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            {tc ? 'Edit Test Case' : 'New Test Case'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
            <Input value={form.title || ''} onChange={e => set('title', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Module <span className="text-destructive">*</span></Label>
              <Input value={form.module || ''} onChange={e => set('module', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Test Type</Label>
              <Select value={form.test_type} onValueChange={v => set('test_type', v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['positive', 'negative', 'boundary', 'dependency', 'workflow', 'rbac', 'integrity'].map(t =>
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['critical', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-0.5">
              <div className="flex items-center gap-2 h-9 mt-5">
                <Switch checked={form.is_mandatory || false} onCheckedChange={v => set('is_mandatory', v)} id="mandatory" />
                <Label htmlFor="mandatory" className="text-xs cursor-pointer">Mandatory (blocks deployment on failure)</Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Test Config (JSON)</Label>
            <Textarea value={configJson} onChange={e => setConfigJson(e.target.value)} className="mt-1 resize-none font-mono text-xs" rows={5} />
          </div>
          <div>
            <Label className="text-xs">Expected Result (JSON)</Label>
            <Textarea value={expectedJson} onChange={e => setExpectedJson(e.target.value)} className="mt-1 resize-none font-mono text-xs" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || !form.title || !form.module} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : tc ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KnowledgeRepository() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('knowledge');
  const [entrySearch, setEntrySearch] = useState('');
  const [entryModule, setEntryModule] = useState('');
  const [entryType, setEntryType] = useState('');
  const [tcSearch, setTcSearch] = useState('');
  const [tcModule, setTcModule] = useState('');
  const [tcType, setTcType] = useState('');
  const [editEntry, setEditEntry] = useState<QAKnowledgeEntry | undefined>();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editTc, setEditTc] = useState<QATestCase | undefined>();
  const [showTcForm, setShowTcForm] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const { data: modules } = useQuery({ queryKey: ['qa-modules'], queryFn: fetchDistinctModules });

  const { data: entries, isLoading: loadingEntries } = useQuery({
    queryKey: ['qa-knowledge', entrySearch, entryModule, entryType],
    queryFn: () => fetchKnowledgeEntries({
      search: entrySearch || undefined,
      module: entryModule || undefined,
      rule_type: entryType || undefined,
    }).then(r => r.data || []),
  });

  const { data: testCases, isLoading: loadingTc } = useQuery({
    queryKey: ['qa-testcases', tcSearch, tcModule, tcType],
    queryFn: () => fetchTestCases({
      search: tcSearch || undefined,
      module: tcModule || undefined,
      test_type: tcType || undefined,
    }).then(r => r.data || []),
  });

  const archiveTc = useMutation({
    mutationFn: (id: string) => deleteTestCase(id),
    onSuccess: () => { toast.success('Test case archived'); qc.invalidateQueries({ queryKey: ['qa-testcases'] }); },
    onError: () => toast.error('Failed to archive test case'),
  });

  const generateForEntry = async (entry: QAKnowledgeEntry) => {
    setGeneratingFor(entry.id);
    try {
      const { error } = await generateAITestCases({ knowledge_entry_id: entry.id, test_types: ['positive', 'negative', 'boundary'] });
      if (error) throw error;
      toast.success('AI test cases generated successfully');
      qc.invalidateQueries({ queryKey: ['qa-testcases'] });
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setGeneratingFor(null);
    }
  };

  const runModuleTests = async (module: string) => {
    try {
      const { error } = await triggerTestRun({ run_type: 'module', modules: [module] });
      if (error) throw error;
      toast.success(`Started targeted run for: ${module}`);
    } catch (e: any) {
      toast.error(`Failed to start run: ${e.message}`);
    }
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['qa-knowledge'] });
    qc.invalidateQueries({ queryKey: ['qa-testcases'] });
    qc.invalidateQueries({ queryKey: ['qa-modules'] });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Knowledge Repository"
        subtitle="Structured business rules, validations, and automated test case management"
        breadcrumbs={[{ label: 'QA Dashboard', href: '/admin/qa' }, { label: 'Knowledge Repository' }]}
        actions={
          <div className="flex gap-2">
            {tab === 'knowledge' && (
              <Button size="sm" onClick={() => { setEditEntry(undefined); setShowEntryForm(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            )}
            {tab === 'testcases' && (
              <Button size="sm" onClick={() => { setEditTc(undefined); setShowTcForm(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Add Test Case
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="knowledge" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Knowledge Entries</TabsTrigger>
          <TabsTrigger value="testcases" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Test Cases</TabsTrigger>
        </TabsList>

        {/* ── Knowledge Entries ─────────────────────────────────────────── */}
        <TabsContent value="knowledge" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-xs" placeholder="Search entries…"
                    value={entrySearch} onChange={e => setEntrySearch(e.target.value)} />
                </div>
                <Select value={entryModule} onValueChange={v => setEntryModule(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {(modules || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={entryType} onValueChange={v => setEntryType(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.keys(RULE_TYPE_ICONS).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loadingEntries ? (
            <div className="py-12 text-center text-muted-foreground">Loading knowledge entries…</div>
          ) : (entries || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No entries found. Create the first knowledge entry.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(entries || []).map((entry: any) => (
                <Card key={entry.id} className="group">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {RULE_TYPE_ICONS[entry.rule_type]} {entry.rule_type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">{entry.module}</Badge>
                          {entry.submodule && <Badge variant="secondary" className="text-xs">{entry.submodule}</Badge>}
                          <span className={`text-xs font-semibold capitalize ${PRIORITY_COLOR[entry.priority]}`}>{entry.priority}</span>
                          <span className="text-xs text-muted-foreground">v{entry.version}</span>
                        </div>
                        <h3 className="font-medium text-sm">{entry.title}</h3>
                        {entry.expected_behavior && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.expected_behavior}</p>
                        )}
                        {(entry.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(entry.tags || []).slice(0, 5).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => runModuleTests(entry.module)}>
                          <Play className="h-3 w-3" /> Run
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          disabled={generatingFor === entry.id}
                          onClick={() => generateForEntry(entry)}>
                          <Wand2 className="h-3 w-3" />
                          {generatingFor === entry.id ? 'Generating…' : 'Generate Tests'}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditEntry(entry); setShowEntryForm(true); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Test Cases ─────────────────────────────────────────────────── */}
        <TabsContent value="testcases" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-xs" placeholder="Search test cases…"
                    value={tcSearch} onChange={e => setTcSearch(e.target.value)} />
                </div>
                <Select value={tcModule} onValueChange={v => setTcModule(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {(modules || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tcType} onValueChange={v => setTcType(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {['positive', 'negative', 'boundary', 'dependency', 'workflow', 'rbac', 'integrity'].map(t =>
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loadingTc ? (
            <div className="py-12 text-center text-muted-foreground">Loading test cases…</div>
          ) : (testCases || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No test cases found. Generate from a knowledge entry or add manually.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Title</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(testCases || []).map((tc: any) => (
                    <TableRow key={tc.id} className="text-sm">
                      <TableCell className="font-medium max-w-[220px] truncate">{tc.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{tc.module}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize text-xs">{tc.test_type}</Badge></TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[tc.priority]}`}>{tc.priority}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {tc.generation_source === 'ai' ? <><Wand2 className="h-3 w-3" /> AI</> : tc.generation_source === 'manual' ? 'Manual' : 'Fallback'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tc.is_mandatory
                          ? <Badge variant="outline" className="text-[10px] border-warning text-warning">Mandatory</Badge>
                          : <span className="text-xs text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditTc(tc); setShowTcForm(true); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => archiveTc.mutate(tc.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showEntryForm && (
        <EntryForm entry={editEntry} onClose={() => { setShowEntryForm(false); setEditEntry(undefined); }} onSaved={invalidate} />
      )}
      {showTcForm && (
        <TestCaseForm tc={editTc} onClose={() => { setShowTcForm(false); setEditTc(undefined); }} onSaved={invalidate} />
      )}
    </div>
  );
}
