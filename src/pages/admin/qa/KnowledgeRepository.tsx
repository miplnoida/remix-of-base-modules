import React, { useState, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, Plus, Wand2, Edit2, CheckCircle2, AlertTriangle,
  Search, Database, Layers, GitBranch, Shield, Globe, Zap, Eye,
  ChevronRight, ChevronDown, Tag, Clock, FlaskConical, Play,
  AlertCircle, XCircle, Package, TrendingUp, BarChart3, Filter,
  RefreshCw, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchKnowledgeEntries, createKnowledgeEntry, updateKnowledgeEntry,
  fetchTestCases, createTestCase, updateTestCase, deleteTestCase,
  generateAITestCases, triggerTestRun,
  type QAKnowledgeEntry, type QATestCase,
} from '@/services/qaService';

// ── Types ────────────────────────────────────────────────────────────────────

interface AppModule {
  id: string;
  name: string;
  display_name: string;
  route: string;
  description: string;
  is_enabled: boolean;
  parent_id: string | null;
}

interface ModuleCoverage {
  module: AppModule;
  knowledgeEntries: QAKnowledgeEntry[];
  testCases: QATestCase[];
  coverageScore: number;
  hasGap: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RULE_TYPE_ICONS: Record<string, React.ReactNode> = {
  validation: <CheckCircle2 className="h-3.5 w-3.5" />,
  calculation: <Zap className="h-3.5 w-3.5" />,
  workflow: <GitBranch className="h-3.5 w-3.5" />,
  api_contract: <Globe className="h-3.5 w-3.5" />,
  ui_behavior: <Eye className="h-3.5 w-3.5" />,
  db_constraint: <Database className="h-3.5 w-3.5" />,
  access_control: <Shield className="h-3.5 w-3.5" />,
};

const RULE_TYPE_COLORS: Record<string, string> = {
  validation: 'bg-info/10 text-info border-info/20',
  calculation: 'bg-warning/10 text-warning border-warning/20',
  workflow: 'bg-accent text-accent-foreground border-accent',
  api_contract: 'bg-success/10 text-success border-success/20',
  ui_behavior: 'bg-info/15 text-info border-info/25',
  db_constraint: 'bg-warning/15 text-warning border-warning/25',
  access_control: 'bg-destructive/10 text-destructive border-destructive/20',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-destructive font-semibold',
  high: 'text-warning font-medium',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};

const TEST_TYPE_COLORS: Record<string, string> = {
  positive: 'bg-success/10 text-success border-success/20',
  negative: 'bg-destructive/10 text-destructive border-destructive/20',
  boundary: 'bg-accent text-accent-foreground border-accent',
  workflow: 'bg-info/10 text-info border-info/20',
  rbac: 'bg-warning/15 text-warning border-warning/25',
  integrity: 'bg-warning/10 text-warning border-warning/20',
  dependency: 'bg-info/15 text-info border-info/25',
};

// Normalize module names to match knowledge entries (fuzzy match)
function normalizeModuleName(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

function moduleMatchesEntries(module: AppModule, entries: QAKnowledgeEntry[]): boolean {
  const normalized = normalizeModuleName(module.display_name);
  return entries.some(e => {
    const entryModule = normalizeModuleName(e.module);
    return entryModule.includes(normalized) ||
      normalized.includes(entryModule) ||
      entryModule.includes(normalized.split(' ')[0]) ||
      normalized.split(' ').some(word => word.length > 3 && entryModule.includes(word));
  });
}

// ── Small Components ─────────────────────────────────────────────────────────

function RuleTypeBadge({ type }: { type: string }) {
  const color = RULE_TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border';
  const icon = RULE_TYPE_ICONS[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
      {icon} {type.replace('_', ' ')}
    </span>
  );
}

function TestTypeBadge({ type }: { type: string }) {
  const color = TEST_TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${color} capitalize`}>
      {type}
    </span>
  );
}

function CoverageBar({ score, hasGap }: { score: number; hasGap: boolean }) {
  const color = hasGap ? 'bg-destructive/70' : score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right">{score}%</span>
    </div>
  );
}

// ── Forms ────────────────────────────────────────────────────────────────────

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
    onSuccess: () => { toast.success(entry ? 'Entry updated (new version)' : 'Entry created'); onSaved(); onClose(); },
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
            <Textarea value={form.expected_behavior || ''} onChange={e => set('expected_behavior', e.target.value)} className="mt-1 resize-none" rows={2} placeholder="What the system should do…" />
          </div>
          <div>
            <Label className="text-xs">Rule Definition (JSON)</Label>
            <Textarea value={ruleJson} onChange={e => setRuleJson(e.target.value)} className="mt-1 resize-none font-mono text-xs" rows={4} />
          </div>
          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} className="mt-1" placeholder="validation, ip_master, critical" />
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
  const [configJson, setConfigJson] = useState(JSON.stringify(tc?.test_config || { method: 'SUPABASE_QUERY', assertions: [] }, null, 2));
  const [expectedJson, setExpectedJson] = useState(JSON.stringify(tc?.expected_result || { status: 'passed', validations: [] }, null, 2));

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
            <div className="flex items-end pb-0.5">
              <div className="flex items-center gap-2 h-9 mt-5">
                <Switch checked={form.is_mandatory || false} onCheckedChange={v => set('is_mandatory', v)} id="mandatory" />
                <Label htmlFor="mandatory" className="text-xs cursor-pointer">Mandatory (blocks deployment)</Label>
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

// ── Module Coverage Card ──────────────────────────────────────────────────────

function ModuleCoverageCard({
  coverage,
  isExpanded,
  onToggle,
  onAddEntry,
  onGenerateTests,
  onRunTests,
  generating,
}: {
  coverage: ModuleCoverage;
  isExpanded: boolean;
  onToggle: () => void;
  onAddEntry: () => void;
  onGenerateTests: () => void;
  onRunTests: () => void;
  generating: boolean;
}) {
  const { module, knowledgeEntries, testCases, coverageScore, hasGap } = coverage;
  const [selectedEntry, setSelectedEntry] = useState<QAKnowledgeEntry | null>(null);
  const [editEntry, setEditEntry] = useState<QAKnowledgeEntry | undefined>();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const qc = useQueryClient();

  const criticalEntries = knowledgeEntries.filter(e => e.priority === 'critical');
  const untestedEntries = knowledgeEntries.filter(e =>
    !testCases.some(tc => tc.knowledge_entry_id === e.id)
  );

  return (
    <Card className={`border transition-all ${hasGap ? 'border-destructive/30 bg-destructive/[0.02]' : ''}`}>
      {/* Module Header */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
            <div className={`p-1.5 rounded-md ${hasGap ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <Package className={`h-4 w-4 ${hasGap ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{module.display_name}</h3>
                {hasGap && (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive shrink-0">
                    <AlertCircle className="h-2.5 w-2.5 mr-1" />Gap
                  </Badge>
                )}
              </div>
              {module.route && (
                <p className="text-[11px] text-muted-foreground font-mono truncate">{module.route}</p>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-3 shrink-0">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <strong className="text-foreground">{knowledgeEntries.length}</strong> rules
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                <strong className="text-foreground">{testCases.length}</strong> tests
              </span>
              {criticalEntries.length > 0 && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalEntries.length} critical
                </span>
              )}
            </div>

            {/* Coverage bar */}
            <div className="w-24 hidden md:block">
              <CoverageBar score={coverageScore} hasGap={hasGap} />
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddEntry}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onGenerateTests} disabled={generating || knowledgeEntries.length === 0}>
                {generating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onRunTests} disabled={testCases.length === 0}>
                <Play className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Detail */}
      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Untested warning */}
          {untestedEntries.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span><strong>{untestedEntries.length}</strong> knowledge {untestedEntries.length === 1 ? 'entry' : 'entries'} without test cases: {untestedEntries.map(e => e.title).slice(0, 2).join(', ')}{untestedEntries.length > 2 ? ` +${untestedEntries.length - 2} more` : ''}</span>
            </div>
          )}

          {knowledgeEntries.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center gap-2">
              <AlertCircle className="h-8 w-8 text-destructive/50" />
              <p className="text-sm font-medium text-destructive">No knowledge entries</p>
              <p className="text-xs text-muted-foreground">This module has no documented rules. Add entries to ensure coverage.</p>
              <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={onAddEntry}>
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Knowledge Entries */}
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Knowledge Entries ({knowledgeEntries.length})
              </div>
              {knowledgeEntries.map(entry => {
                const entryTests = testCases.filter(tc => tc.knowledge_entry_id === entry.id);
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <div key={entry.id} className={`rounded-lg border transition-all ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border/80 bg-muted/20 hover:bg-muted/40'}`}>
                    <button
                      className="w-full text-left p-3 flex items-start gap-3"
                      onClick={() => setSelectedEntry(isSelected ? null : entry)}
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="font-medium text-sm leading-tight">{entry.title}</span>
                          {entry.priority === 'critical' && (
                            <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 h-4">critical</Badge>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5">
                          <RuleTypeBadge type={entry.rule_type} />
                          {entry.submodule && (
                            <span className="text-[11px] text-muted-foreground">→ {entry.submodule}</span>
                          )}
                          {entry.db_table && (
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{entry.db_table}</span>
                          )}
                          <span className={`text-[11px] ${entryTests.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {entryTests.length} test{entryTests.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); setEditEntry(entry); setShowEntryForm(true); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Drill-down: entry detail + test cases */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/60 mt-0">
                        {entry.description && (
                          <p className="text-xs text-muted-foreground pt-2">{entry.description}</p>
                        )}
                        {entry.expected_behavior && (
                          <div className="bg-accent border border-border rounded p-2">
                            <p className="text-[11px] font-medium text-accent-foreground mb-0.5">Expected Behavior</p>
                            <p className="text-xs text-muted-foreground">{entry.expected_behavior}</p>
                          </div>
                        )}
                        {entry.screen_path && (
                          <p className="text-[11px] text-muted-foreground">
                            Screen: <span className="font-mono bg-muted px-1 rounded">{entry.screen_path}</span>
                          </p>
                        )}

                        {/* Test Cases for this entry */}
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Test Cases ({entryTests.length})
                          </div>
                          {entryTests.length === 0 ? (
                            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1.5">
                              No test cases linked — coverage gap!
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {entryTests.map(tc => (
                                <div key={tc.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border border-border/60 text-xs">
                                  <TestTypeBadge type={tc.test_type} />
                                  <span className="flex-1 truncate">{tc.title}</span>
                                  <span className={`${PRIORITY_COLOR[tc.priority] || 'text-muted-foreground'} text-[11px] capitalize shrink-0`}>{tc.priority}</span>
                                  {tc.is_mandatory && (
                                    <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 h-4 shrink-0">Mandatory</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Test Cases not linked to specific entries */}
          {(() => {
            const unlinkedTests = testCases.filter(tc => !tc.knowledge_entry_id);
            if (unlinkedTests.length === 0) return null;
            return (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Unlinked Test Cases ({unlinkedTests.length})
                </div>
                <div className="space-y-1">
                  {unlinkedTests.map(tc => (
                    <div key={tc.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 border border-border/60 text-xs">
                      <TestTypeBadge type={tc.test_type} />
                      <span className="flex-1 truncate">{tc.title}</span>
                      <span className={`${PRIORITY_COLOR[tc.priority] || ''} text-[11px] capitalize`}>{tc.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      )}

      {showEntryForm && (
        <EntryForm
          entry={editEntry}
          onClose={() => { setShowEntryForm(false); setEditEntry(undefined); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ['qa-knowledge'] })}
        />
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KnowledgeRepository() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('coverage');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterGap, setFilterGap] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showTcForm, setShowTcForm] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [generatingModule, setGeneratingModule] = useState<string | null>(null);

  // Flat list views
  const [tcSearch, setTcSearch] = useState('');
  const [tcModule, setTcModule] = useState('');
  const [tcType, setTcType] = useState('');

  // Fetch all data in parallel
  const { data: appModules = [] } = useQuery<AppModule[]>({
    queryKey: ['app-modules-qa'],
    queryFn: async () => {
      const { data } = await supabase.from('app_modules').select('*').eq('is_enabled', true).order('display_name');
      return (data || []) as AppModule[];
    },
  });

  const { data: allEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['qa-knowledge-all'],
    queryFn: (): Promise<QAKnowledgeEntry[]> => fetchKnowledgeEntries().then(r => (r.data || []) as QAKnowledgeEntry[]),
  });

  const { data: allTestCases = [], isLoading: loadingTc, refetch: refetchTc } = useQuery({
    queryKey: ['qa-testcases-all'],
    queryFn: (): Promise<QATestCase[]> => fetchTestCases().then(r => (r.data || []) as QATestCase[]),
  });

  // Build module coverage map
  const moduleCoverages = useMemo<ModuleCoverage[]>(() => {
    return appModules.map(module => {
      const moduleEntries = allEntries.filter(e => {
        const em = normalizeModuleName(e.module);
        const mm = normalizeModuleName(module.display_name);
        return em === mm ||
          em.includes(mm) || mm.includes(em) ||
          (mm.split(' ').length > 1 && mm.split(' ').some(w => w.length > 3 && em.includes(w)));
      });

      const moduleTests = allTestCases.filter(tc => {
        const tm = normalizeModuleName(tc.module);
        const mm = normalizeModuleName(module.display_name);
        return tm === mm || tm.includes(mm) || mm.includes(tm) ||
          (mm.split(' ').length > 1 && mm.split(' ').some(w => w.length > 3 && tm.includes(w)));
      });

      const hasGap = moduleEntries.length === 0;
      const entryScore = Math.min(moduleEntries.length * 20, 60);
      const testScore = Math.min(moduleTests.length * 10, 40);
      const coverageScore = Math.min(entryScore + testScore, 100);

      return { module, knowledgeEntries: moduleEntries, testCases: moduleTests, coverageScore, hasGap };
    });
  }, [appModules, allEntries, allTestCases]);

  // Filter for coverage view
  const filteredCoverages = useMemo(() => {
    return moduleCoverages.filter(c => {
      if (search && !c.module.display_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGap && !c.hasGap) return false;
      return true;
    });
  }, [moduleCoverages, search, filterGap]);

  // Flat filtered entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.module.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && e.rule_type !== filterType) return false;
      if (filterPriority && e.priority !== filterPriority) return false;
      return true;
    });
  }, [allEntries, search, filterType, filterPriority]);

  // Flat filtered test cases
  const filteredTc = useMemo(() => {
    return allTestCases.filter(tc => {
      if (tcSearch && !tc.title.toLowerCase().includes(tcSearch.toLowerCase())) return false;
      if (tcModule && tc.module !== tcModule) return false;
      if (tcType && tc.test_type !== tcType) return false;
      return true;
    });
  }, [allTestCases, tcSearch, tcModule, tcType]);

  // Summary stats
  const stats = useMemo(() => {
    const totalModules = appModules.length;
    const coveredModules = moduleCoverages.filter(c => !c.hasGap).length;
    const gapModules = totalModules - coveredModules;
    const criticalEntries = allEntries.filter(e => e.priority === 'critical').length;
    const mandatoryTests = allTestCases.filter(tc => tc.is_mandatory).length;
    const untestedEntries = allEntries.filter(e => !allTestCases.some(tc => tc.knowledge_entry_id === e.id)).length;
    return { totalModules, coveredModules, gapModules, criticalEntries, mandatoryTests, untestedEntries };
  }, [moduleCoverages, allEntries, allTestCases, appModules]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedModules(new Set(appModules.map(m => m.id)));
  const collapseAll = () => setExpandedModules(new Set());

  const handleGenerateForModule = async (coverage: ModuleCoverage) => {
    setGeneratingModule(coverage.module.id);
    try {
      const entryIds = coverage.knowledgeEntries.map(e => e.id);
      if (entryIds.length === 0) { toast.error('No knowledge entries to generate tests from'); return; }
      for (const id of entryIds.slice(0, 5)) {
        await generateAITestCases({ knowledge_entry_id: id, module: coverage.module.display_name });
      }
      toast.success(`AI test cases generated for ${coverage.module.display_name}`);
      refetchTc();
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setGeneratingModule(null);
    }
  };

  const handleRunModuleTests = async (moduleName: string) => {
    try {
      await triggerTestRun({ run_type: 'module', modules: [moduleName] });
      toast.success(`Started targeted run for: ${moduleName}`);
    } catch (e: any) {
      toast.error(`Failed to start run: ${e.message}`);
    }
  };

  const handleExportAll = () => {
    const rows = [
      ['Module', 'Rule Title', 'Type', 'Priority', 'DB Table', 'Screen', 'Test Count', 'Description'],
      ...allEntries.map(e => [
        e.module, e.title, e.rule_type, e.priority,
        e.db_table || '', e.screen_path || '',
        allTestCases.filter(tc => tc.knowledge_entry_id === e.id).length,
        e.description || '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qa-knowledge-repository.csv'; a.click();
  };

  const refetchAll = () => { refetchEntries(); refetchTc(); };

  const moduleNames = [...new Set((allTestCases as QATestCase[]).map(tc => tc.module))].sort();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Knowledge Repository"
        subtitle="Centralized business rules, validation logic, and automated test case coverage across all modules"
        breadcrumbs={[{ label: 'QA Dashboard', href: '/admin/qa' }, { label: 'Knowledge Repository' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={refetchAll}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportAll}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" className="gap-1" onClick={() => { setSelectedModule(''); setShowEntryForm(true); }}>
              <Plus className="h-4 w-4" /> Add Rule
            </Button>
          </div>
        }
      />

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Modules Analyzed', value: stats.totalModules, icon: <Layers className="h-4 w-4" />, color: 'text-primary' },
          { label: 'Modules Covered', value: stats.coveredModules, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
          { label: 'Coverage Gaps', value: stats.gapModules, icon: <AlertCircle className="h-4 w-4" />, color: stats.gapModules > 0 ? 'text-destructive' : 'text-muted-foreground' },
          { label: 'Knowledge Entries', value: allEntries.length, icon: <BookOpen className="h-4 w-4" />, color: 'text-blue-600' },
          { label: 'Test Cases', value: allTestCases.length, icon: <FlaskConical className="h-4 w-4" />, color: 'text-purple-600' },
          { label: 'Untested Rules', value: stats.untestedEntries, icon: <AlertTriangle className="h-4 w-4" />, color: stats.untestedEntries > 0 ? 'text-orange-600' : 'text-muted-foreground' },
        ].map(m => (
          <Card key={m.label} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`${m.color} opacity-70`}>{m.icon}</span>
            </div>
            <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Overall Coverage Bar ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Module Coverage</span>
            <span className="text-sm font-bold">{Math.round((stats.coveredModules / Math.max(stats.totalModules, 1)) * 100)}%</span>
          </div>
          <Progress value={(stats.coveredModules / Math.max(stats.totalModules, 1)) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {stats.coveredModules} of {stats.totalModules} modules have documented knowledge entries.
            {stats.gapModules > 0 && <span className="text-destructive font-medium"> {stats.gapModules} modules still need coverage.</span>}
          </p>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="coverage" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Module Coverage
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> All Rules ({allEntries.length})
          </TabsTrigger>
          <TabsTrigger value="testcases" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> All Test Cases ({allTestCases.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Module Coverage Tab ── */}
        <TabsContent value="coverage" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search modules…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant={filterGap ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1"
              onClick={() => setFilterGap(v => !v)}>
              <AlertCircle className="h-3 w-3" /> Gaps Only
            </Button>
            <div className="flex gap-1 ml-auto">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={expandAll}>Expand All</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={collapseAll}>Collapse All</Button>
            </div>
          </div>

          {/* Gap alert */}
          {stats.gapModules > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong>{stats.gapModules} modules</strong> have no knowledge entries. Rules must be documented before they can be tested.</span>
            </div>
          )}

          {/* Module cards */}
          <div className="space-y-3">
            {filteredCoverages.map(coverage => (
              <ModuleCoverageCard
                key={coverage.module.id}
                coverage={coverage}
                isExpanded={expandedModules.has(coverage.module.id)}
                onToggle={() => toggleModule(coverage.module.id)}
                onAddEntry={() => { setSelectedModule(coverage.module.display_name); setShowEntryForm(true); }}
                onGenerateTests={() => handleGenerateForModule(coverage)}
                onRunTests={() => handleRunModuleTests(coverage.module.display_name)}
                generating={generatingModule === coverage.module.id}
              />
            ))}
            {filteredCoverages.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No modules match the current filter.</div>
            )}
          </div>
        </TabsContent>

        {/* ── All Knowledge Entries Tab ── */}
        <TabsContent value="knowledge" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search rules…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.keys(RULE_TYPE_ICONS).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={v => setFilterPriority(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {['critical', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Rule Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>DB Table</TableHead>
                  <TableHead className="text-center">Tests</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEntries ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No entries found</TableCell></TableRow>
                ) : filteredEntries.map(entry => {
                  const tcCount = allTestCases.filter(tc => tc.knowledge_entry_id === entry.id).length;
                  return (
                    <TableRow key={entry.id} className={tcCount === 0 ? 'bg-yellow-50/50' : ''}>
                      <TableCell className="font-medium max-w-[220px]">
                        <div className="truncate">{entry.title}</div>
                        {entry.submodule && <div className="text-[11px] text-muted-foreground">{entry.submodule}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{entry.module}</TableCell>
                      <TableCell><RuleTypeBadge type={entry.rule_type} /></TableCell>
                      <TableCell><span className={`text-xs capitalize ${PRIORITY_COLOR[entry.priority] || ''}`}>{entry.priority}</span></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{entry.db_table || '–'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-bold ${tcCount === 0 ? 'text-destructive' : 'text-green-600'}`}>{tcCount}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">v{entry.version}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── All Test Cases Tab ── */}
        <TabsContent value="testcases" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search test cases…" value={tcSearch} onChange={e => setTcSearch(e.target.value)} />
            </div>
            <Select value={tcModule} onValueChange={v => setTcModule(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {moduleNames.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tcType} onValueChange={v => setTcType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {['positive', 'negative', 'boundary', 'workflow', 'rbac', 'integrity', 'dependency'].map(t =>
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Test Case Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTc ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredTc.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No test cases found</TableCell></TableRow>
                ) : filteredTc.map(tc => (
                  <TableRow key={tc.id}>
                    <TableCell className="font-medium max-w-[220px]">
                      <div className="truncate">{tc.title}</div>
                      {tc.submodule && <div className="text-[11px] text-muted-foreground">{tc.submodule}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{tc.module}</TableCell>
                    <TableCell><TestTypeBadge type={tc.test_type} /></TableCell>
                    <TableCell><span className={`text-xs capitalize ${PRIORITY_COLOR[tc.priority] || ''}`}>{tc.priority}</span></TableCell>
                    <TableCell>
                      {tc.is_mandatory
                        ? <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Mandatory</Badge>
                        : <span className="text-xs text-muted-foreground">–</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {tc.generation_source === 'ai_generated' ? <><Wand2 className="h-2.5 w-2.5 mr-1" />AI</> : 'Manual'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Global modals */}
      {showEntryForm && (
        <EntryForm
          onClose={() => setShowEntryForm(false)}
          onSaved={refetchAll}
        />
      )}
      {showTcForm && (
        <TestCaseForm
          defaultModule={selectedModule}
          onClose={() => setShowTcForm(false)}
          onSaved={refetchAll}
        />
      )}
    </div>
  );
}
