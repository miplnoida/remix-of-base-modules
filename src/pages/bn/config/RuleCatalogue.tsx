import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Copy, Trash2, Power, Search, AlertTriangle, CheckCircle2, FlaskConical, Database, ListChecks, Activity, ShieldCheck, XCircle, PlayCircle, LayoutDashboard, BadgeCheck, GitBranch } from 'lucide-react';
import { resolveFact } from '@/services/bn/eligibility/eligibilityFactResolver';
import { computeRuleCoverage, type CoverageRow } from '@/services/bn/eligibility/factCoverageService';
import { runProductEligibilityTest, type ProductTestResult } from '@/services/bn/eligibility/productEligibilityTest';
import { ensureContributionSnapshot } from '@/services/bn/eligibility/contributionSnapshotService';
import { toast } from 'sonner';
import {
  useRuleCatalogue, useRuleCatalogueUsage, useUpsertRuleCatalogue,
  useCloneRuleCatalogue, useDeleteRuleCatalogue, useToggleRuleCatalogueActive,
} from '@/hooks/bn/useRuleCatalogue';
import { useEligibilityFacts } from '@/hooks/bn/useEligibilityFacts';
import { useBnRuleGroups } from '@/hooks/bn/useBnConfig';
import {
  RULE_GROUP_TYPES, RULE_PARAMETERS, RULE_OPERATORS, FAIL_ACTIONS,
  validateRuleCatalogue,
  type RuleCatalogueItem, type RuleCatalogueInput, type FailAction,
} from '@/services/bn/ruleCatalogueService';
import { statusBadgeVariant, sourceTypeBadgeVariant, describeFactSource, type EligibilityFact } from '@/services/bn/eligibilityFactService';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';
import { OverviewTab } from '@/components/bn/ruleCatalogue/OverviewTab';
import { CoverageTypesTab } from '@/components/bn/ruleCatalogue/CoverageTypesTab';
import { ValidationTab } from '@/components/bn/ruleCatalogue/ValidationTab';
import { ImpactTab } from '@/components/bn/ruleCatalogue/ImpactTab';
import { FactsTab } from '@/components/bn/ruleCatalogue/FactsTab';
import { RuntimeTestTab } from '@/components/bn/ruleCatalogue/RuntimeTestTab';
import { AuditTab } from '@/components/bn/ruleCatalogue/AuditTab';
import { validateAllRules } from '@/services/bn/ruleValidationService';
import { computeAllRuleReadiness } from '@/services/bn/readinessService';
import { Progress } from '@/components/ui/progress';

const emptyInput: RuleCatalogueInput = {
  rule_code: '', rule_name: '', description: '', group_type: 'CONTRIBUTION',
  category: 'CONTRIBUTION', parameter: 'TOTAL_CONTRIBUTIONS', fact_key: null,
  operator: 'GREATER_OR_EQUAL',
  value_from: '', value_to: '', values: null,
  default_fail_action: 'REJECT', failure_message_text: '',
  is_active: true, allow_product_override: true, tags: [],
  effective_from: null, effective_to: null,
  rule_group_id: null, rule_group_code: null, rule_group_name: null,
  default_group_sort_order: 0, default_rule_sort_order: 0,
};

function fmtValue(r: RuleCatalogueItem): string {
  if (r.operator === 'BETWEEN') return `${r.value_from ?? ''} – ${r.value_to ?? ''}`;
  if (r.operator === 'IN' || r.operator === 'NOT_IN') return Array.isArray(r.values) ? r.values.join(', ') : '';
  if (r.operator === 'BOOLEAN' || r.operator === 'EXISTS') return String(r.value_from ?? 'true');
  return r.value_from ?? '(per product)';
}

export default function RuleCatalogue() {
  const { data: rules = [], isLoading } = useRuleCatalogue();
  const { data: usage = {} } = useRuleCatalogueUsage();
  const { data: facts = [], isLoading: factsLoading } = useEligibilityFacts();
  const { data: ruleGroups = [] } = useBnRuleGroups();
  const upsert = useUpsertRuleCatalogue();
  const clone = useCloneRuleCatalogue();
  const remove = useDeleteRuleCatalogue();
  const toggle = useToggleRuleCatalogueActive();

  const factByKey = useMemo(() => {
    const m = new Map<string, EligibilityFact>();
    for (const f of facts) m.set(f.fact_key, f);
    return m;
  }, [facts]);

  const [tab, setTab] = useState('rules');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [ruleGroupFilter, setRuleGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleCatalogueInput>(emptyInput);
  const [valuesText, setValuesText] = useState('');

  const filtered = useMemo(() => rules.filter(r => {
    if (groupFilter !== 'ALL' && r.group_type !== groupFilter) return false;
    if (ruleGroupFilter !== 'ALL') {
      if (ruleGroupFilter === '__none__') {
        if (r.rule_group_id) return false;
      } else if (r.rule_group_id !== ruleGroupFilter) return false;
    }
    if (statusFilter === 'ACTIVE' && !r.is_active) return false;
    if (statusFilter === 'INACTIVE' && r.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.rule_code.toLowerCase().includes(s) &&
          !r.rule_name.toLowerCase().includes(s) &&
          !(r.description ?? '').toLowerCase().includes(s) &&
          !(r.fact_key ?? '').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rules, search, groupFilter, ruleGroupFilter, statusFilter]);

  const summary = useMemo(() => {
    const used = new Set(Object.keys(usage));
    const implCount = rules.filter(r => {
      const f = r.fact_key ? factByKey.get(r.fact_key) : null;
      return f?.implementation_status === 'IMPLEMENTED';
    }).length;
    return {
      total: rules.length,
      active: rules.filter(r => r.is_active).length,
      used: rules.filter(r => used.has(r.rule_code)).length,
      implemented: implCount,
    };
  }, [rules, usage, factByKey]);

  const openNew = () => { setEditing({ ...emptyInput }); setValuesText(''); setDialogOpen(true); };
  const openEdit = (r: RuleCatalogueItem) => {
    setEditing({
      id: r.id, rule_code: r.rule_code, rule_name: r.rule_name, description: r.description,
      group_type: r.group_type, category: r.category, parameter: r.parameter, fact_key: r.fact_key,
      operator: r.operator,
      value_from: r.value_from, value_to: r.value_to, values: r.values,
      default_fail_action: r.default_fail_action, failure_message_text: r.failure_message_text,
      is_active: r.is_active, allow_product_override: r.allow_product_override,
      tags: r.tags ?? [], effective_from: r.effective_from, effective_to: r.effective_to,
      rule_group_id: r.rule_group_id ?? null, rule_group_code: r.rule_group_code ?? null,
      rule_group_name: r.rule_group_name ?? null,
      default_group_sort_order: r.default_group_sort_order ?? 0,
      default_rule_sort_order: r.default_rule_sort_order ?? 0,
    });
    setValuesText(Array.isArray(r.values) ? r.values.join(', ') : '');
    setDialogOpen(true);
  };

  const selectedFact = editing.fact_key ? factByKey.get(editing.fact_key) : null;

  const onSave = async () => {
    const payload = { ...editing };
    if (payload.operator === 'IN' || payload.operator === 'NOT_IN') {
      payload.values = valuesText.split(',').map(s => s.trim()).filter(Boolean);
    } else { payload.values = null; }
    if (!payload.fact_key) { toast.error('Fact is required', { description: 'Pick a fact from the Facts registry.' }); return; }
    const fact = factByKey.get(payload.fact_key);
    if (!fact) { toast.error('Selected fact does not exist'); return; }
    if (payload.is_active && fact.implementation_status === 'NOT_IMPLEMENTED') {
      toast.error('Cannot activate', { description: 'The selected fact is not yet implemented.' }); return;
    }
    if (fact.allowed_operators?.length && !fact.allowed_operators.includes(payload.operator)) {
      toast.error('Operator not allowed for this fact', { description: `Allowed: ${fact.allowed_operators.join(', ')}` }); return;
    }
    const err = validateRuleCatalogue(payload);
    if (err) { toast.error(err); return; }
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    await upsert.mutateAsync({ input: payload, userCode });
    setDialogOpen(false);
  };

  const onClone = async (r: RuleCatalogueItem) => {
    const newCode = window.prompt('New rule code', `${r.rule_code}_COPY`);
    if (!newCode) return;
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    await clone.mutateAsync({ source: r, newCode: newCode.toUpperCase(), userCode });
  };
  const onDelete = async (r: RuleCatalogueItem) => {
    if (!window.confirm(`Delete rule ${r.rule_code}? This cannot be undone.`)) return;
    await remove.mutateAsync({ id: r.id, code: r.rule_code });
  };
  const onToggle = async (r: RuleCatalogueItem) => {
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    await toggle.mutateAsync({ id: r.id, isActive: !r.is_active, userCode });
  };

  const isBetween = editing.operator === 'BETWEEN';
  const isList = editing.operator === 'IN' || editing.operator === 'NOT_IN';
  const isBool = editing.operator === 'BOOLEAN' || editing.operator === 'EXISTS';

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Rule Catalogue"
        subtitle="Reusable eligibility rules, facts, usage and live testing — one place"
        breadcrumbs={[
          { label: 'Benefit Management', href: '/bn/dashboard' },
          { label: 'Configuration' },
          { label: 'Rule Catalogue' },
        ]}
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Rules</div><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold text-emerald-600">{summary.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Used in Products</div><div className="text-2xl font-bold">{summary.used}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Fact Implemented</div><div className="text-2xl font-bold text-primary">{summary.implemented}/{summary.total}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="facts" className="gap-2"><Database className="h-4 w-4" /> Facts</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><ListChecks className="h-4 w-4" /> Rules</TabsTrigger>
          <TabsTrigger value="coverage-types" className="gap-2"><GitBranch className="h-4 w-4" /> Coverage Types</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2"><ShieldCheck className="h-4 w-4" /> Implementation Coverage</TabsTrigger>
          <TabsTrigger value="validation" className="gap-2"><BadgeCheck className="h-4 w-4" /> Validation</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><ShieldCheck className="h-4 w-4" /> Audit</TabsTrigger>
          <TabsTrigger value="test" className="gap-2"><FlaskConical className="h-4 w-4" /> Test</TabsTrigger>
          <TabsTrigger value="impact" className="gap-2"><Activity className="h-4 w-4" /> Impact</TabsTrigger>
          <TabsTrigger value="usage" className="gap-2"><Activity className="h-4 w-4" /> Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab rules={rules} facts={facts} />
        </TabsContent>

        <TabsContent value="coverage-types">
          <CoverageTypesTab rules={rules} facts={facts} />
        </TabsContent>

        <TabsContent value="validation">
          <ValidationTab rules={rules} facts={facts} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>

        <TabsContent value="impact">
          <ImpactTab rules={rules} facts={facts} />
        </TabsContent>


        {/* RULES TAB */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <CardTitle className="flex-1">Catalogue</CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search code, name, fact" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={ruleGroupFilter} onValueChange={setRuleGroupFilter}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Rule Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Rule Groups</SelectItem>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {ruleGroups.filter((g: any) => g.is_active).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.group_code} — {g.group_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No rules match.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Used in Groups</TableHead>
                      <TableHead>Fact Key</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead>Fail</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Fact</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Ver</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const f = r.fact_key ? factByKey.get(r.fact_key) : null;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                          <TableCell className="font-medium">{r.rule_name}</TableCell>
                          <TableCell><Badge variant="outline">{r.category ?? r.group_type}</Badge></TableCell>
                          <TableCell className="text-xs">{r.rule_group_code ? <Badge variant="secondary" title="Legacy single-link; manage memberships via Rule Groups screen">{r.rule_group_code}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="font-mono text-xs">{r.fact_key ?? <span className="text-destructive">— missing —</span>}</TableCell>
                          <TableCell className="text-xs">{r.operator}</TableCell>
                          <TableCell className="text-xs">{fmtValue(r)}</TableCell>
                          <TableCell>
                            <Badge variant={r.default_fail_action === 'REJECT' ? 'destructive' : r.default_fail_action === 'BLOCK' ? 'secondary' : 'default'}>
                              {r.default_fail_action}
                            </Badge>
                          </TableCell>
                          <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell>
                            {f
                              ? <Badge variant={statusBadgeVariant(f.implementation_status)}>{f.implementation_status}</Badge>
                              : <Badge variant="destructive">UNLINKED</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{usage[r.rule_code] ?? 0}</TableCell>
                          <TableCell className="text-xs">v{r.version}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Edit className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => onClone(r)} title="Clone"><Copy className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => onToggle(r)} title={r.is_active ? 'Deactivate' : 'Activate'}><Power className={`h-4 w-4 ${r.is_active ? 'text-amber-600' : 'text-emerald-600'}`} /></Button>
                              <Button size="icon" variant="ghost" onClick={() => onDelete(r)} title="Delete" disabled={(usage[r.rule_code] ?? 0) > 0}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FACTS TAB */}
        <TabsContent value="facts">
          <FactsTab />
        </TabsContent>

        {/* USAGE TAB */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Rule Usage Across Products</CardTitle>
              <p className="text-sm text-muted-foreground">Where each catalogue rule is referenced. Override values are managed inside Product Catalog → Eligibility Rules.</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Code</TableHead>
                    <TableHead>Fact</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Default Fail</TableHead>
                    <TableHead># Product Versions Using</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                      <TableCell className="font-mono text-xs">{r.fact_key ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.operator}</TableCell>
                      <TableCell><Badge variant="outline">{r.default_fail_action}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">{usage[r.rule_code] ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEST TAB */}
        <TabsContent value="coverage">
          <CoverageTab rules={rules} />
        </TabsContent>

        <TabsContent value="test">
          <RuntimeTestTab rules={rules} factByKey={factByKey} facts={facts} />
        </TabsContent>
      </Tabs>

      {/* RULE EDITOR DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit' : 'Add'} Catalogue Rule</DialogTitle>
            <DialogDescription>Reusable rule referenced by product versions</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Code *</Label>
              <Input value={editing.rule_code}
                onChange={e => setEditing({ ...editing, rule_code: e.target.value.toUpperCase() })}
                disabled={!!editing.id} placeholder="MIN_TOTAL_CONTRIBUTIONS" />
            </div>
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={editing.rule_name} onChange={e => setEditing({ ...editing, rule_name: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Fact *</Label>
              <Select
                value={editing.fact_key ?? ''}
                onValueChange={v => {
                  const f = factByKey.get(v);
                  setEditing(prev => ({
                    ...prev,
                    fact_key: v,
                    category: f?.category ?? prev.category,
                    operator: f && f.allowed_operators?.length && !f.allowed_operators.includes(prev.operator)
                      ? f.allowed_operators[0]
                      : prev.operator,
                  }));
                }}>
                <SelectTrigger><SelectValue placeholder="Pick a fact from the Facts registry" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {facts.map(f => (
                    <SelectItem key={f.fact_key} value={f.fact_key}>
                      <span className="font-mono text-xs">{f.fact_key}</span> — {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFact && (
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(selectedFact.implementation_status)}>{selectedFact.implementation_status}</Badge>
                  <span>source: <span className="font-mono">{selectedFact.source_table}.{selectedFact.source_column}</span></span>
                  <span>resolver: <span className="font-mono">{selectedFact.resolver_function}</span></span>
                  <span>type: {selectedFact.data_type}</span>
                  {selectedFact.requires_snapshot && <Badge variant="outline">Snapshot Required</Badge>}
                </div>
              )}
              {selectedFact?.implementation_status === 'NOT_IMPLEMENTED' && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">This fact is not implemented. The rule cannot be activated until the resolver is in place.</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rule Category *</Label>
              <Select value={editing.group_type} onValueChange={v => setEditing({ ...editing, group_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Broad classification (AGE, CONTRIBUTION, …). Distinct from the reusable Rule Group below.</p>
            </div>
            <div className="space-y-2">
              <Label>Linked Rule Group</Label>
              <Select
                value={editing.rule_group_id ?? '__none__'}
                onValueChange={v => {
                  if (v === '__none__') {
                    setEditing({ ...editing, rule_group_id: null, rule_group_code: null, rule_group_name: null });
                  } else {
                    const g = (ruleGroups as any[]).find(x => x.id === v);
                    setEditing({ ...editing, rule_group_id: v, rule_group_code: g?.group_code ?? null, rule_group_name: g?.group_name ?? null });
                  }
                }}>
                <SelectTrigger><SelectValue placeholder="Optional — pick an existing Rule Group" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">— None —</SelectItem>
                  {(ruleGroups as any[]).filter(g => g.is_active).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.group_code} — {g.group_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Master reusable group (managed in Rule Groups screen). Products can add eligibility rules by Rule Group.</p>
            </div>
            <div className="space-y-2">
              <Label>Legacy Parameter</Label>
              <Select value={editing.parameter} onValueChange={v => setEditing({ ...editing, parameter: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_PARAMETERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operator *</Label>
              <Select value={editing.operator} onValueChange={v => setEditing({ ...editing, operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(selectedFact?.allowed_operators?.length ? selectedFact.allowed_operators : RULE_OPERATORS).map(o =>
                    <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Fail Action *</Label>
              <Select value={editing.default_fail_action} onValueChange={v => setEditing({ ...editing, default_fail_action: v as FailAction })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FAIL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {!isList && !isBool && (
              <>
                <div className="space-y-2">
                  <Label>Value{isBetween ? ' From' : ''}{!isBetween && ' (default, optional)'}</Label>
                  <Input value={editing.value_from ?? ''} onChange={e => setEditing({ ...editing, value_from: e.target.value })} placeholder="configurable per product" />
                </div>
                {isBetween && (
                  <div className="space-y-2">
                    <Label>Value To *</Label>
                    <Input value={editing.value_to ?? ''} onChange={e => setEditing({ ...editing, value_to: e.target.value })} />
                  </div>
                )}
              </>
            )}
            {isBool && (
              <div className="space-y-2">
                <Label>Expected *</Label>
                <Select value={String(editing.value_from ?? 'true')} onValueChange={v => setEditing({ ...editing, value_from: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isList && (
              <div className="space-y-2 col-span-2">
                <Label>Values * (comma separated)</Label>
                <Input value={valuesText} onChange={e => setValuesText(e.target.value)} placeholder="ACTIVE, SUSPENDED, …" />
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <Label>Failure Message</Label>
              <Textarea rows={2} value={editing.failure_message_text ?? ''} onChange={e => setEditing({ ...editing, failure_message_text: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={(editing.tags ?? []).join(', ')} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-end gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.allow_product_override} onCheckedChange={v => setEditing({ ...editing, allow_product_override: v })} />
                <Label>Allow product override</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={editing.effective_from ?? ''} onChange={e => setEditing({ ...editing, effective_from: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input type="date" value={editing.effective_to ?? ''} onChange={e => setEditing({ ...editing, effective_to: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* -------- Coverage Tab -------- */
function CoverageTab({ rules }: { rules: RuleCatalogueItem[] }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CoverageRow[]>([]);

  const run = async () => {
    setLoading(true);
    try {
      const s = await computeRuleCoverage(rules);
      setRows(s.rows);
    } finally { setLoading(false); }
  };

  // auto-run when rules load/change
  useEffect(() => { if (rules.length) run(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [rules.length]);

  const ok = rows.filter(r => r.blocking_reasons.length === 0).length;
  const blocked = rows.filter(r => r.blocking_reasons.length > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="flex-1">Fact Coverage Checker</CardTitle>
          <Button variant="outline" onClick={run} disabled={loading} className="gap-2"><ShieldCheck className="h-4 w-4" />{loading ? 'Checking…' : 'Re-check'}</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          For every catalogue rule we verify the fact exists, has a resolver, has a known source table/column, the operator is allowed, and the implementation status. Rules with blocking issues cannot be safely published.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Wireable</div><div className="text-2xl font-bold text-emerald-600">{ok}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Blocked</div><div className="text-2xl font-bold text-destructive">{blocked}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Checked</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Fact</TableHead>
              <TableHead className="text-center">Fact</TableHead>
              <TableHead className="text-center">Resolver</TableHead>
              <TableHead className="text-center">Table</TableHead>
              <TableHead className="text-center">Column</TableHead>
              <TableHead className="text-center">Operator</TableHead>
              <TableHead className="text-center">Testable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Blocking reasons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.rule_id}>
                <TableCell><div className="font-mono text-xs">{r.rule_code}</div><div className="text-xs text-muted-foreground">{r.rule_name}</div></TableCell>
                <TableCell className="font-mono text-xs">{r.fact_key ?? '—'}</TableCell>
                <TableCell className="text-center">{r.fact_exists ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-destructive" />}</TableCell>
                <TableCell className="text-center">{r.resolver_exists ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-destructive" />}</TableCell>
                <TableCell className="text-center">{r.source_table_known ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-destructive" />}</TableCell>
                <TableCell className="text-center">{r.source_column_known ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-muted-foreground" />}</TableCell>
                <TableCell className="text-center">{r.operator_allowed ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-destructive" />}</TableCell>
                <TableCell className="text-center">{r.testable ? <CheckCircle2 className="h-4 w-4 inline text-emerald-600" /> : <XCircle className="h-4 w-4 inline text-destructive" />}</TableCell>
                <TableCell><Badge variant={r.implementation_status === 'IMPLEMENTED' ? 'default' : r.implementation_status === 'PARTIAL' ? 'secondary' : 'destructive'}>{r.implementation_status}</Badge></TableCell>
                <TableCell className="text-xs text-destructive">{r.blocking_reasons.join('; ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

