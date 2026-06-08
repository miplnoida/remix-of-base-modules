import { useMemo, useState } from 'react';
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
import { Plus, Edit, Copy, Trash2, Power, Search, AlertTriangle, CheckCircle2, FlaskConical, Database, ListChecks, Activity, ShieldCheck, XCircle, PlayCircle } from 'lucide-react';
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
import {
  RULE_GROUP_TYPES, RULE_PARAMETERS, RULE_OPERATORS, FAIL_ACTIONS,
  validateRuleCatalogue,
  type RuleCatalogueItem, type RuleCatalogueInput, type FailAction,
} from '@/services/bn/ruleCatalogueService';
import { statusBadgeVariant, type EligibilityFact } from '@/services/bn/eligibilityFactService';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';

const emptyInput: RuleCatalogueInput = {
  rule_code: '', rule_name: '', description: '', group_type: 'CONTRIBUTION',
  category: 'CONTRIBUTION', parameter: 'TOTAL_CONTRIBUTIONS', fact_key: null,
  operator: 'GREATER_OR_EQUAL',
  value_from: '', value_to: '', values: null,
  default_fail_action: 'REJECT', failure_message_text: '',
  is_active: true, allow_product_override: true, tags: [],
  effective_from: null, effective_to: null,
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleCatalogueInput>(emptyInput);
  const [valuesText, setValuesText] = useState('');

  const filtered = useMemo(() => rules.filter(r => {
    if (groupFilter !== 'ALL' && r.group_type !== groupFilter) return false;
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
  }), [rules, search, groupFilter, statusFilter]);

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
        <TabsList>
          <TabsTrigger value="rules" className="gap-2"><ListChecks className="h-4 w-4" /> Rules</TabsTrigger>
          <TabsTrigger value="facts" className="gap-2"><Database className="h-4 w-4" /> Facts / Data Sources</TabsTrigger>
          <TabsTrigger value="usage" className="gap-2"><Activity className="h-4 w-4" /> Usage</TabsTrigger>
          <TabsTrigger value="test" className="gap-2"><FlaskConical className="h-4 w-4" /> Test Rule</TabsTrigger>
        </TabsList>

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
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Groups</SelectItem>
                    {RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Facts Registry</CardTitle>
              <p className="text-sm text-muted-foreground">Computable values rules can reference. Each fact maps to a source table/column and resolver function. Admin-only — managed in code.</p>
            </CardHeader>
            <CardContent>
              {factsLoading ? <p className="py-8 text-center text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fact Key</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Resolver</TableHead>
                      <TableHead>Allowed Operators</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requires</TableHead>
                      <TableHead>Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facts.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.fact_key}</TableCell>
                        <TableCell className="font-medium">{f.label}</TableCell>
                        <TableCell><Badge variant="outline">{f.category}</Badge></TableCell>
                        <TableCell className="text-xs">{f.data_type}</TableCell>
                        <TableCell className="text-xs">{f.source_table}{f.source_column ? <span className="text-muted-foreground">.{f.source_column}</span> : null}</TableCell>
                        <TableCell className="font-mono text-xs">{f.resolver_function ?? '—'}</TableCell>
                        <TableCell className="text-xs">{f.allowed_operators?.join(', ')}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(f.implementation_status)}>{f.implementation_status}</Badge></TableCell>
                        <TableCell className="text-xs space-x-1">
                          {f.requires_snapshot && <Badge variant="outline">snapshot</Badge>}
                          {f.requires_claim_context && <Badge variant="outline">claim</Badge>}
                          {f.requires_ssn && <Badge variant="outline">ssn</Badge>}
                          {f.requires_deceased_ssn && <Badge variant="outline">deceased</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.example_value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
        <TabsContent value="test">
          <TestRuleTab rules={rules} factByKey={factByKey} />
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
              <Label>Group *</Label>
              <Select value={editing.group_type} onValueChange={v => setEditing({ ...editing, group_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
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

/* -------- Test Rule Tab (lightweight simulator) -------- */
function TestRuleTab({ rules, factByKey }: { rules: RuleCatalogueItem[]; factByKey: Map<string, EligibilityFact> }) {
  const [ruleId, setRuleId] = useState<string>('');
  const [simValue, setSimValue] = useState<string>('');
  const [result, setResult] = useState<{ outcome: 'PASS' | 'FAIL' | 'WARN'; message: string; details: string[] } | null>(null);

  const rule = rules.find(r => r.id === ruleId);
  const fact = rule?.fact_key ? factByKey.get(rule.fact_key) : null;

  const run = () => {
    if (!rule) { toast.error('Pick a rule'); return; }
    if (!fact) { setResult({ outcome: 'WARN', message: 'Rule has no linked fact', details: [] }); return; }
    if (fact.implementation_status === 'NOT_IMPLEMENTED') {
      setResult({ outcome: 'WARN', message: 'Fact is NOT_IMPLEMENTED — cannot evaluate', details: [
        `Source: ${fact.source_table}.${fact.source_column}`,
        `Resolver: ${fact.resolver_function}`,
      ]}); return;
    }
    const expected = rule.value_from;
    const v = simValue;
    let pass = false;
    let cmp = '';
    const num = Number(v);
    const expNum = Number(expected);
    switch (rule.operator) {
      case 'GREATER_OR_EQUAL': pass = num >= expNum; cmp = `${num} >= ${expNum}`; break;
      case 'GREATER_THAN': pass = num > expNum; cmp = `${num} > ${expNum}`; break;
      case 'LESS_OR_EQUAL': pass = num <= expNum; cmp = `${num} <= ${expNum}`; break;
      case 'LESS_THAN': pass = num < expNum; cmp = `${num} < ${expNum}`; break;
      case 'EQUALS': case '=': pass = String(v) === String(expected); cmp = `${v} == ${expected}`; break;
      case 'NOT_EQUALS': case '!=': pass = String(v) !== String(expected); cmp = `${v} != ${expected}`; break;
      case 'BOOLEAN': pass = String(v).toLowerCase() === String(expected).toLowerCase(); cmp = `${v} == ${expected}`; break;
      case 'EXISTS': pass = !!v; cmp = `${v} exists`; break;
      default: pass = false; cmp = `operator ${rule.operator} not simulated`;
    }
    setResult({
      outcome: pass ? 'PASS' : 'FAIL',
      message: pass ? 'Rule passed' : (rule.failure_message_text ?? 'Rule failed'),
      details: [
        `Fact: ${fact.fact_key}`,
        `Source: ${fact.source_table}.${fact.source_column}`,
        `Resolver: ${fact.resolver_function}`,
        `Comparison: ${cmp}`,
        `Fail action: ${rule.default_fail_action}`,
      ],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Rule Simulator</CardTitle>
        <p className="text-sm text-muted-foreground">Validate a rule against a sample value. End-to-end claim simulation runs in the Eligibility Simulator.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rule</Label>
            <Select value={ruleId} onValueChange={setRuleId}>
              <SelectTrigger><SelectValue placeholder="Pick a catalogue rule" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.rule_code} — {r.rule_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Simulated fact value {fact && <span className="text-xs text-muted-foreground">(type: {fact.data_type}, example: {fact.example_value})</span>}</Label>
            <Input value={simValue} onChange={e => setSimValue(e.target.value)} placeholder={fact?.example_value ?? 'enter value to test'} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={run} className="gap-2"><FlaskConical className="h-4 w-4" /> Run Test</Button>
        </div>
        {rule && (
          <div className="text-xs text-muted-foreground">
            Operator <span className="font-mono">{rule.operator}</span>, expected <span className="font-mono">{rule.value_from ?? '(per product)'}</span>
          </div>
        )}
        {result && (
          <Alert variant={result.outcome === 'PASS' ? 'default' : result.outcome === 'WARN' ? 'default' : 'destructive'}>
            {result.outcome === 'PASS' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-semibold mb-1">{result.outcome}: {result.message}</div>
              <ul className="text-xs space-y-0.5">{result.details.map((d, i) => <li key={i} className="font-mono">• {d}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
