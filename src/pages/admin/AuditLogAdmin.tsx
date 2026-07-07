import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, ShieldAlert, Activity, AlertOctagon, Settings2, UserCog, Lock, Clock, FileText, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

import {
  useAuditEventTypes,
  useAuditLog,
  useAuditLogs,
  useAuditPolicies,
  useAuditSummary,
  useDeactivateAuditEventType,
  useDeactivateAuditPolicy,
  useReactivateAuditEventType,
  useReactivateAuditPolicy,
} from '@/platform/audit/useAudit';
import type {
  AuditEventCategory,
  AuditLogFilters,
  AuditOutcome,
  AuditRiskLevel,
  AuditSeverity,
} from '@/platform/audit/auditTypes';

const CATEGORIES: AuditEventCategory[] = [
  'AUTH', 'SECURITY', 'DATA_CHANGE', 'CONFIGURATION', 'REFERENCE_DATA',
  'LEGACY_MAPPING', 'MIGRATION', 'WORKFLOW', 'APPROVAL', 'DOCUMENT',
  'NOTIFICATION', 'REPORT', 'EXPORT', 'SYSTEM', 'ERROR',
];
const SEVERITIES: AuditSeverity[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const RISKS: AuditRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const OUTCOMES: AuditOutcome[] = ['SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED', 'ERROR'];

const outcomeBadge = (o: AuditOutcome) => {
  switch (o) {
    case 'SUCCESS': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'FAILURE':
    case 'ERROR': return 'bg-red-100 text-red-900 border-red-200';
    case 'DENIED': return 'bg-orange-100 text-orange-900 border-orange-200';
    case 'PARTIAL': return 'bg-amber-100 text-amber-900 border-amber-200';
    default: return '';
  }
};

const riskBadge = (r: AuditRiskLevel) => {
  switch (r) {
    case 'CRITICAL': return 'bg-red-100 text-red-900 border-red-200';
    case 'HIGH': return 'bg-orange-100 text-orange-900 border-orange-200';
    case 'MEDIUM': return 'bg-amber-100 text-amber-900 border-amber-200';
    default: return 'bg-muted';
  }
};

const severityBadge = (s: AuditSeverity) => {
  switch (s) {
    case 'CRITICAL': return 'bg-red-100 text-red-900 border-red-200';
    case 'ERROR': return 'bg-red-100 text-red-900 border-red-200';
    case 'WARNING': return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'DEBUG': return 'bg-muted';
    default: return '';
  }
};

function SummaryCards({ filters }: { filters: AuditLogFilters }) {
  const { data, isLoading } = useAuditSummary(filters);
  const items = [
    { label: 'Total Events', value: data?.total ?? 0, icon: Activity },
    { label: 'Security Events', value: data?.security ?? 0, icon: ShieldAlert },
    { label: 'Failed / Denied', value: data?.failedOrDenied ?? 0, icon: AlertOctagon },
    { label: 'High-Risk', value: data?.highRisk ?? 0, icon: AlertOctagon },
    { label: 'Configuration', value: data?.configuration ?? 0, icon: Settings2 },
    { label: 'User / Admin', value: data?.userAdminChanges ?? 0, icon: UserCog },
    { label: 'Sensitive Data', value: data?.sensitive ?? 0, icon: Lock },
    { label: "Today's Events", value: data?.today ?? 0, icon: Clock },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? <Skeleton className="h-6 w-10" /> : it.value.toLocaleString()}
                </p>
              </div>
              <it.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditLogTab() {
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 200 });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const { data: rows = [], isLoading } = useAuditLogs(filters);
  const { data: detail } = useAuditLog(selectedId);

  const update = (patch: Partial<AuditLogFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <SummaryCards filters={filters} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((s) => !s)}>
              {showAdvanced ? 'Hide advanced filters' : 'Show advanced filters'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search event, actor, entity…"
                  value={filters.search ?? ''}
                  onChange={(e) => update({ search: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={filters.date_from?.slice(0, 10) ?? ''} onChange={(e) => update({ date_from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={filters.date_to?.slice(0, 10) ?? ''} onChange={(e) => update({ date_to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })} />
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={filters.event_category ?? 'ALL'} onValueChange={(v) => update({ event_category: v === 'ALL' ? undefined : (v as AuditEventCategory) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={filters.severity ?? 'ALL'} onValueChange={(v) => update({ severity: v === 'ALL' ? undefined : (v as AuditSeverity) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any severity</SelectItem>
                    {SEVERITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Risk</Label>
                <Select value={filters.risk_level ?? 'ALL'} onValueChange={(v) => update({ risk_level: v === 'ALL' ? undefined : (v as AuditRiskLevel) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any risk</SelectItem>
                    {RISKS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={filters.outcome ?? 'ALL'} onValueChange={(v) => update({ outcome: v === 'ALL' ? undefined : (v as AuditOutcome) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any outcome</SelectItem>
                    {OUTCOMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Module</Label>
                <Input value={filters.module_code ?? ''} onChange={(e) => update({ module_code: e.target.value || undefined })} placeholder="e.g. CORE" />
              </div>
              <div>
                <Label className="text-xs">Entity type</Label>
                <Input value={filters.entity_type ?? ''} onChange={(e) => update({ entity_type: e.target.value || undefined })} />
              </div>
              <div>
                <Label className="text-xs">Entity ID</Label>
                <Input value={filters.entity_id ?? ''} onChange={(e) => update({ entity_id: e.target.value || undefined })} />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={!!filters.contains_pii} onCheckedChange={(v) => update({ contains_pii: v || undefined })} />
                  Contains PII
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={!!filters.contains_financial_data} onCheckedChange={(v) => update({ contains_financial_data: v || undefined })} />
                  Financial
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No audit events found</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.event_time), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell className="font-medium">{r.event_name || r.event_code}</TableCell>
                  <TableCell>{r.actor_name || r.actor_email || <span className="text-muted-foreground">system</span>}</TableCell>
                  <TableCell><Badge variant="outline">{r.module_code}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity_display_name || `${r.entity_type ?? ''}${r.entity_id ? ` #${r.entity_id.slice(0, 8)}` : ''}`}</TableCell>
                  <TableCell className="text-xs">{r.action}</TableCell>
                  <TableCell><Badge className={outcomeBadge(r.outcome)}>{r.outcome}</Badge></TableCell>
                  <TableCell><Badge className={severityBadge(r.severity)} variant="outline">{r.severity}</Badge></TableCell>
                  <TableCell><Badge className={riskBadge(r.risk_level)} variant="outline">{r.risk_level}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedId(r.id); setShowTechnical(false); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.event_name || detail?.event_code || 'Audit Event'}</DialogTitle>
            <DialogDescription>
              {detail ? format(new Date(detail.event_time), 'PPpp') : ''}
            </DialogDescription>
          </DialogHeader>
          {!detail ? <Skeleton className="h-40 w-full" /> : (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 text-sm">
                <section>
                  <h4 className="font-semibold mb-1">Event</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Code:</span> {detail.event_code}</div>
                    <div><span className="text-muted-foreground">Category:</span> {detail.event_category ?? '—'}</div>
                    <div><span className="text-muted-foreground">Severity:</span> <Badge className={severityBadge(detail.severity)} variant="outline">{detail.severity}</Badge></div>
                    <div><span className="text-muted-foreground">Risk:</span> <Badge className={riskBadge(detail.risk_level)} variant="outline">{detail.risk_level}</Badge></div>
                    <div><span className="text-muted-foreground">Outcome:</span> <Badge className={outcomeBadge(detail.outcome)}>{detail.outcome}</Badge></div>
                    <div><span className="text-muted-foreground">Source:</span> {detail.source}</div>
                  </div>
                </section>
                <section>
                  <h4 className="font-semibold mb-1">Actor</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Name:</span> {detail.actor_name ?? '—'}</div>
                    <div><span className="text-muted-foreground">Email:</span> {detail.actor_email ?? '—'}</div>
                    <div><span className="text-muted-foreground">Role:</span> {detail.actor_role_summary ?? '—'}</div>
                    <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{detail.actor_user_id ?? '—'}</span></div>
                  </div>
                </section>
                <section>
                  <h4 className="font-semibold mb-1">Entity</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Type:</span> {detail.entity_type ?? '—'}</div>
                    <div><span className="text-muted-foreground">Name:</span> {detail.entity_display_name ?? '—'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">ID:</span> <span className="font-mono">{detail.entity_id ?? '—'}</span></div>
                  </div>
                </section>
                {(detail.reason || detail.notes) && (
                  <section>
                    <h4 className="font-semibold mb-1">Reason / Notes</h4>
                    {detail.reason && <p className="text-xs">{detail.reason}</p>}
                    {detail.notes && <p className="text-xs text-muted-foreground">{detail.notes}</p>}
                  </section>
                )}
                {detail.changed_fields?.length ? (
                  <section>
                    <h4 className="font-semibold mb-1">Changed Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {detail.changed_fields.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                    </div>
                  </section>
                ) : null}
                <section>
                  <h4 className="font-semibold mb-1">Request Context</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Route:</span> {detail.source_route ?? '—'}</div>
                    <div><span className="text-muted-foreground">Component:</span> {detail.source_component ?? '—'}</div>
                    <div><span className="text-muted-foreground">Session:</span> <span className="font-mono">{detail.session_id ?? '—'}</span></div>
                    <div><span className="text-muted-foreground">Correlation:</span> <span className="font-mono">{detail.correlation_id ?? '—'}</span></div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Technical details</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowTechnical((s) => !s)}>
                      {showTechnical ? 'Hide' : 'Show'} technical details
                    </Button>
                  </div>
                  {showTechnical && (
                    <div className="space-y-2 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Before</p>
                        <pre className="bg-muted rounded p-2 text-xs overflow-auto">{JSON.stringify(detail.before_value ?? null, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">After</p>
                        <pre className="bg-muted rounded p-2 text-xs overflow-auto">{JSON.stringify(detail.after_value ?? null, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                        <pre className="bg-muted rounded p-2 text-xs overflow-auto">{JSON.stringify(detail.metadata ?? null, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventTypesTab() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useAuditEventTypes({ search: search || undefined });
  const deact = useDeactivateAuditEventType();
  const react = useReactivateAuditEventType();
  return (
    <div className="space-y-3">
      <Input placeholder="Search event types…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : data.map((et) => (
                <TableRow key={et.id}>
                  <TableCell className="font-mono text-xs">{et.event_code}</TableCell>
                  <TableCell>{et.event_name}</TableCell>
                  <TableCell><Badge variant="outline">{et.event_category}</Badge></TableCell>
                  <TableCell>{et.module_code}</TableCell>
                  <TableCell><Badge variant="outline" className={severityBadge(et.default_severity)}>{et.default_severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={riskBadge(et.default_risk_level)}>{et.default_risk_level}</Badge></TableCell>
                  <TableCell className="text-xs space-x-1">
                    {et.is_security_event && <Badge variant="secondary">Security</Badge>}
                    {et.is_pii_event && <Badge variant="secondary">PII</Badge>}
                    {et.is_financial_event && <Badge variant="secondary">Financial</Badge>}
                    {et.is_migration_event && <Badge variant="secondary">Migration</Badge>}
                  </TableCell>
                  <TableCell>{et.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    {et.is_active ? (
                      <Button size="sm" variant="outline" onClick={() => deact.mutate(et.id)}>Deactivate</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => react.mutate(et.id)}>Reactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PoliciesTab() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useAuditPolicies({ search: search || undefined });
  const deact = useDeactivateAuditPolicy();
  const react = useReactivateAuditPolicy();
  return (
    <div className="space-y-3">
      <Input placeholder="Search policies…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Retention (days)</TableHead>
                <TableHead>Capture</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.policy_code}</TableCell>
                  <TableCell>{p.policy_name}</TableCell>
                  <TableCell>{p.module_code}</TableCell>
                  <TableCell>{p.domain_code ?? '—'}</TableCell>
                  <TableCell>{p.retention_days}</TableCell>
                  <TableCell className="text-xs space-x-1">
                    {p.capture_before_after && <Badge variant="secondary">Before/After</Badge>}
                    {p.capture_changed_fields && <Badge variant="secondary">Fields</Badge>}
                    {p.mask_pii_in_audit && <Badge variant="secondary">Mask PII</Badge>}
                  </TableCell>
                  <TableCell>{p.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Button size="sm" variant="outline" onClick={() => deact.mutate(p.id)}>Deactivate</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => react.mutate(p.id)}>Reactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthTab() {
  const { data: policies = [] } = useAuditPolicies();
  const { data: events = [] } = useAuditEventTypes();

  const warnings = useMemo(() => {
    const w: { title: string; description: string; level: 'warn' | 'error' }[] = [];
    const eventCodes = new Set(events.map((e) => e.event_code));
    for (const p of policies) {
      if (p.event_code && !eventCodes.has(p.event_code)) {
        w.push({ level: 'error', title: `Policy ${p.policy_code} references unknown event`, description: `Event code ${p.event_code} is not registered.` });
      }
      if (!p.is_active && p.is_required) {
        w.push({ level: 'error', title: `Required policy disabled`, description: `${p.policy_name} is required but inactive.` });
      }
    }
    for (const e of events) {
      if (e.is_security_event && e.retention_days && e.retention_days < 365) {
        w.push({ level: 'warn', title: `Low retention on security event`, description: `${e.event_code} has retention ${e.retention_days} days.` });
      }
      if (e.default_risk_level === 'CRITICAL' && !e.requires_before_after) {
        w.push({ level: 'warn', title: `Critical event without before/after`, description: `${e.event_code} does not require change capture.` });
      }
    }
    return w;
  }, [policies, events]);

  return (
    <div className="space-y-3">
      {warnings.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">All audit health checks pass.</CardContent></Card>
      ) : warnings.map((w, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertOctagon className={`h-5 w-5 mt-0.5 ${w.level === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className="font-medium">{w.title}</p>
              <p className="text-sm text-muted-foreground">{w.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AuditLogAdmin() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start gap-3">
        <FileText className="h-6 w-6 mt-1" />
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Review important system, security, configuration, and data-change activities across the platform.
          </p>
        </div>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Audit Events</TabsTrigger>
          <TabsTrigger value="types">Event Types</TabsTrigger>
          <TabsTrigger value="policies">Audit Policies</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-4"><AuditLogTab /></TabsContent>
        <TabsContent value="types" className="mt-4"><EventTypesTab /></TabsContent>
        <TabsContent value="policies" className="mt-4"><PoliciesTab /></TabsContent>
        <TabsContent value="health" className="mt-4"><HealthTab /></TabsContent>
      </Tabs>
    </div>
  );
}
