import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import type { SortDirection } from '@/hooks/useTableSort';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, History, ChevronLeft, ChevronRight, Globe, Database, Monitor, UserCheck, AlertTriangle, Separator } from 'lucide-react';
import { formatAuditDateTime } from '@/lib/dateFormat';
import { Label } from '@/components/ui/label';
import ApiLogsTab from '@/components/admin/ApiLogsTab';
import { ExportDropdown } from '@/components/common/ExportDropdown';
import { buildMetadata } from '@/lib/auditReportExports';
import { useSupabaseAuth } from '@/integrations/supabase/auth';

// ────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  module: string | null;
  route: string | null;
  ip_address: string | null;
  before_value: any;
  after_value: any;
  payload_json: any;
  severity: string | null;
}

const PAGE_SIZE = 25;

/** Standardized event taxonomy */
const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  // CRUD
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  // Lifecycle
  { value: 'status_change', label: 'Status Change' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'verify', label: 'Verify' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'enable', label: 'Enable' },
  { value: 'disable', label: 'Disable' },
  // Workflow
  { value: 'schedule', label: 'Schedule' },
  { value: 'reschedule', label: 'Reschedule' },
  { value: 'assign', label: 'Assign' },
  { value: 'close', label: 'Close' },
  // Risk lifecycle
  { value: 'risk_assessed', label: 'Risk Assessed' },
  { value: 'risk_mitigated', label: 'Risk Mitigated' },
  { value: 'risk_reviewed', label: 'Risk Reviewed' },
  { value: 'risk_escalated', label: 'Risk Escalated' },
  // Auth & Navigation
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'page_view', label: 'Page View' },
  { value: 'export', label: 'Export' },
  // Legacy
  { value: 'mutation', label: 'Mutation (Legacy)' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'db_trigger', label: 'DB Trigger' },
  { value: 'app_interceptor', label: 'App Interceptor' },
  { value: 'useAuditedMutation', label: 'Audited Mutation' },
  { value: 'MutationCache_global', label: 'Global Cache' },
];

/** Human-readable entity-type labels */
const ENTITY_LABELS: Record<string, string> = {
  er_master: 'Employer',
  ip_master: 'Insured Person',
  ip_self_employ: 'Self-Employed',
  cn_batch: 'Batch',
  cn_receipt: 'Receipt',
  cn_cash_count: 'Cash Count',
  cn_card_machine: 'Card Machine',
  ia_audit_engagements: 'Audit Engagement',
  ia_findings: 'Audit Finding',
  ia_risk_register: 'Risk Register',
  ia_risk_assessments: 'Risk Assessment',
  ia_audit_universe: 'Audit Universe',
  ia_annual_plans: 'Audit Plan',
  ia_audit_reports: 'Audit Report',
  ia_mitigation_actions: 'Mitigation Action',
  ia_risk_reviews: 'Risk Review',
  bema_c3_submissions: 'C3 Submission',
  bema_registrations: 'BEMA Registration',
  bema_audit_cases: 'Compliance Case',
  bema_payment_plans: 'Payment Plan',
  bema_waivers: 'Waiver',
  system_settings: 'System Setting',
  security_policy_config: 'Security Policy',
  profiles: 'User Profile',
  c3_calculation_config: 'C3 Config',
  workflow_instances: 'Workflow Instance',
  api_settings: 'API Setting',
  api_registry: 'API Registry',
  benefit_claims: 'Benefit Claim',
  legal_hearings: 'Legal Hearing',
  legal_cases: 'Legal Case',
};

function getEntityLabel(raw: string | null): string {
  if (!raw) return '—';
  return ENTITY_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ────────────────────────────────────────────────────────────────────────────
// Diff Logic
// ────────────────────────────────────────────────────────────────────────────

interface FieldDiffRow {
  field: string;
  oldValue: any;
  newValue: any;
  isChanged: boolean;
  changeType: 'added' | 'removed' | 'changed' | 'unchanged';
}

const SKIP_FIELDS = new Set([
  'updated_at', 'modified_date', 'updated_by', 'modified_by',
  'created_at', 'created_by', 'correlation_id', 'session_id',
  'device_info', 'timestamp',
]);

function computeFullRowWithHighlights(
  before: Record<string, any> | null,
  after: Record<string, any> | null,
  action: string | null,
  changedFieldsList?: string[],
): FieldDiffRow[] {
  const rows: FieldDiffRow[] = [];
  if (!before && !after) return rows;
  const a = action?.toLowerCase() || '';

  if (a === 'create' || a === 'insert' || (!before && after)) {
    for (const [key, val] of Object.entries(after || {})) {
      if (SKIP_FIELDS.has(key)) continue;
      rows.push({ field: key, oldValue: null, newValue: val, isChanged: true, changeType: 'added' });
    }
    return rows;
  }

  if (a === 'delete' || (before && !after)) {
    for (const [key, val] of Object.entries(before || {})) {
      if (SKIP_FIELDS.has(key)) continue;
      rows.push({ field: key, oldValue: val, newValue: null, isChanged: true, changeType: 'removed' });
    }
    return rows;
  }

  const changedSet = changedFieldsList ? new Set(changedFieldsList) : null;
  const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})])).filter(k => !SKIP_FIELDS.has(k));
  allKeys.sort((x, y) => {
    const xC = changedSet ? changedSet.has(x) : JSON.stringify(before?.[x]) !== JSON.stringify(after?.[x]);
    const yC = changedSet ? changedSet.has(y) : JSON.stringify(before?.[y]) !== JSON.stringify(after?.[y]);
    if (xC && !yC) return -1;
    if (!xC && yC) return 1;
    return x.localeCompare(y);
  });

  for (const key of allKeys) {
    const oldVal = before?.[key];
    const newVal = after?.[key];
    const isChanged = changedSet ? changedSet.has(key) : JSON.stringify(oldVal) !== JSON.stringify(newVal);
    if (isChanged) {
      const ct = (oldVal == null) ? 'added' : (newVal == null) ? 'removed' : 'changed';
      rows.push({ field: key, oldValue: oldVal, newValue: newVal, isChanged: true, changeType: ct });
    } else {
      rows.push({ field: key, oldValue: oldVal, newValue: newVal, isChanged: false, changeType: 'unchanged' });
    }
  }
  return rows;
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function humanizeFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ────────────────────────────────────────────────────────────────────────────
// Badges
// ────────────────────────────────────────────────────────────────────────────

function getSourceBadge(payloadJson: any) {
  const source = payloadJson?.source;
  if (source === 'db_trigger') return <Badge variant="outline" className="text-xs gap-1"><Database className="h-3 w-3" />DB</Badge>;
  if (source === 'MutationCache_global' || source === 'app_interceptor') return <Badge variant="outline" className="text-xs gap-1"><Monitor className="h-3 w-3" />App</Badge>;
  if (source === 'useAuditedMutation') return <Badge variant="outline" className="text-xs gap-1"><UserCheck className="h-3 w-3" />Audited</Badge>;
  if (source) return <Badge variant="outline" className="text-xs">{source}</Badge>;
  return null;
}

function getActionBadge(action: string | null) {
  const a = action?.toLowerCase() || '';
  if (a.includes('failed')) return <Badge variant="destructive">{action}</Badge>;
  const map: Record<string, { className: string; label: string }> = {
    create: { className: 'bg-primary text-primary-foreground', label: 'Create' },
    insert: { className: 'bg-primary text-primary-foreground', label: 'Create' },
    update: { className: 'bg-secondary text-secondary-foreground', label: 'Update' },
    delete: { className: 'bg-destructive text-destructive-foreground', label: 'Delete' },
    status_change: { className: 'bg-amber-500/20 text-amber-700 border-amber-300', label: 'Status Change' },
    enable: { className: 'bg-primary text-primary-foreground', label: 'Enable' },
    disable: { className: 'bg-accent/30 text-accent-foreground', label: 'Disable' },
    approve: { className: 'bg-primary text-primary-foreground', label: 'Approve' },
    reject: { className: 'bg-destructive text-destructive-foreground', label: 'Reject' },
    verify: { className: 'bg-secondary text-secondary-foreground', label: 'Verify' },
    cancel: { className: 'bg-accent/30 text-accent-foreground', label: 'Cancel' },
    close: { className: 'bg-muted text-muted-foreground', label: 'Close' },
    assign: { className: 'bg-secondary text-secondary-foreground', label: 'Assign' },
    schedule: { className: 'bg-secondary text-secondary-foreground', label: 'Schedule' },
    reschedule: { className: 'bg-secondary text-secondary-foreground', label: 'Reschedule' },
    risk_assessed: { className: 'bg-amber-500/20 text-amber-700 border-amber-300', label: 'Risk Assessed' },
    risk_mitigated: { className: 'bg-primary/20 text-primary border-primary/30', label: 'Risk Mitigated' },
    risk_reviewed: { className: 'bg-secondary text-secondary-foreground', label: 'Risk Reviewed' },
    risk_escalated: { className: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Risk Escalated' },
    page_view: { className: '', label: 'Page View' },
    login: { className: 'bg-secondary text-secondary-foreground', label: 'Login' },
    logout: { className: 'bg-secondary text-secondary-foreground', label: 'Logout' },
    export: { className: '', label: 'Export' },
    mutation: { className: '', label: 'Mutation' },
  };
  const m = map[a];
  if (m) return <Badge variant={m.className ? undefined : 'outline'} className={m.className}>{m.label}</Badge>;
  return <Badge variant="secondary">{action || 'Unknown'}</Badge>;
}

// ────────────────────────────────────────────────────────────────────────────
// Export columns
// ────────────────────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'timestamp', header: 'Timestamp', width: 22 },
  { key: 'user_name', header: 'User', width: 16 },
  { key: 'action', header: 'Action', width: 14 },
  { key: 'module', header: 'Module', width: 16 },
  { key: 'entity_type_label', header: 'Entity Type', width: 20 },
  { key: 'entity_id', header: 'Entity ID', width: 24 },
  { key: 'route', header: 'Route', width: 24 },
  { key: 'source', header: 'Source', width: 12 },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const AuditTrail: React.FC = () => {
  const { isAuthReady, isAuthenticated } = useSupabaseAuth();
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(0);
  };

  // ── Filter options (distinct values from DB) ──
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-trail-filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_audit_trail_filter_options');
      if (error) throw error;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        entityTypes: (parsed?.entity_types || []) as string[],
        modules: (parsed?.modules || []) as string[],
        actions: (parsed?.actions || []) as string[],
      };
    },
    enabled: isAuthReady && isAuthenticated,
    staleTime: 60_000,
  });

  // ── Main data query ──
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-trail', page, sortKey, sortDirection, dateFrom, dateTo, userFilter, entityTypeFilter, moduleFilter, routeFilter, actionFilter, sourceFilter],
    queryFn: async () => {
      const { data: result, error } = await supabase.rpc('get_filtered_audit_trail', {
        p_sort_key: sortKey,
        p_sort_direction: sortDirection,
        p_offset: page * PAGE_SIZE,
        p_limit: PAGE_SIZE,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_user_filter: userFilter || null,
        p_entity_type_filter: entityTypeFilter || null,
        p_module_filter: moduleFilter || null,
        p_route_filter: routeFilter || null,
        p_action_filter: actionFilter || null,
        p_source_filter: sourceFilter || null,
      });
      if (error) throw error;
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (parsed?.error) throw new Error(parsed.error);
      return { entries: (parsed?.entries || []) as AuditEntry[], count: parsed?.count || 0 };
    },
    enabled: isAuthReady && isAuthenticated,
    staleTime: 30_000,
    retry: 2,
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  // ── Detail panel data ──
  const fullRowData = useMemo(() => {
    if (!selectedEntry) return [];
    const changedFields = selectedEntry.payload_json?.changed_fields as string[] | undefined;
    return computeFullRowWithHighlights(selectedEntry.before_value, selectedEntry.after_value, selectedEntry.action, changedFields);
  }, [selectedEntry]);

  const changedCount = fullRowData.filter(r => r.isChanged).length;

  // ── Export data ──
  const exportData = useMemo(() => (data?.entries || []).map(e => ({
    ...e,
    entity_type_label: getEntityLabel(e.entity_type),
    source: e.payload_json?.source || '—',
  })), [data]);

  const exportMetadata = useMemo(() => buildMetadata(
    'Audit Trail',
    data?.count || 0,
    [
      { label: 'User', value: userFilter },
      { label: 'Action', value: actionFilter },
      { label: 'Entity Type', value: entityTypeFilter },
      { label: 'Module', value: moduleFilter },
      { label: 'Source', value: sourceFilter },
    ],
  ), [data?.count, userFilter, actionFilter, entityTypeFilter, moduleFilter, sourceFilter]);

  const clearAllFilters = () => {
    setDateFrom(''); setDateTo(''); setUserFilter('');
    setEntityTypeFilter(''); setModuleFilter('');
    setRouteFilter(''); setActionFilter(''); setSourceFilter('');
    setPage(0);
  };

  const hasFilters = dateFrom || dateTo || userFilter || entityTypeFilter || moduleFilter || routeFilter || actionFilter || sourceFilter;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground">Track data changes with before/after values and API logs</p>
        </div>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />Audit Trail
          </TabsTrigger>
          <TabsTrigger value="api-logs" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />API Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="space-y-4">
            {/* ── Toolbar ── */}
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />Refresh
              </Button>
              <ExportDropdown
                data={exportData}
                columns={EXPORT_COLUMNS}
                fileName="audit-trail"
                title="Audit Trail"
                metadata={exportMetadata}
              />
            </div>

            {/* ── Filters ── */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Filters
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Date From</Label>
                    <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Date To</Label>
                    <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">User</Label>
                    <Input placeholder="Search user..." value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(0); }} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Action</Label>
                    <Select value={actionFilter} onValueChange={val => { setActionFilter(val === ' ' ? '' : val); setPage(0); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Actions" /></SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value || '__all'} value={opt.value || ' '}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Entity Type</Label>
                    <Select value={entityTypeFilter} onValueChange={val => { setEntityTypeFilter(val === ' ' ? '' : val); setPage(0); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Entity Types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">All Entity Types</SelectItem>
                        {(filterOptions?.entityTypes || []).map((et: string) => (
                          <SelectItem key={et} value={et}>{getEntityLabel(et)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Module</Label>
                    <Select value={moduleFilter} onValueChange={val => { setModuleFilter(val === ' ' ? '' : val); setPage(0); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Modules" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">All Modules</SelectItem>
                        {(filterOptions?.modules || []).map((m: string) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Source</Label>
                    <Select value={sourceFilter} onValueChange={val => { setSourceFilter(val === ' ' ? '' : val); setPage(0); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Sources" /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value || '__all'} value={opt.value || ' '}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Route / Screen</Label>
                    <Input placeholder="/cashier/..." value={routeFilter} onChange={e => { setRouteFilter(e.target.value); setPage(0); }} className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Data Table ── */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <p className="text-muted-foreground">Failed to load audit trail</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableTableHead sortKey="timestamp" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Timestamp</SortableTableHead>
                          <SortableTableHead sortKey="user_name" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>User</SortableTableHead>
                          <SortableTableHead sortKey="action" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Action</SortableTableHead>
                          <SortableTableHead sortKey="module" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Module</SortableTableHead>
                          <SortableTableHead sortKey="entity_type" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Entity</SortableTableHead>
                          <SortableTableHead sortKey="entity_id" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Entity ID</SortableTableHead>
                          <TableCell className="font-semibold text-xs">Source</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.entries.map(entry => (
                          <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEntry(entry)}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">{formatAuditDateTime(entry.timestamp, true)}</TableCell>
                            <TableCell className="text-sm">{entry.user_name || entry.user_id?.slice(0, 8) || '—'}</TableCell>
                            <TableCell>{getActionBadge(entry.action)}</TableCell>
                            <TableCell>
                              {entry.module ? <Badge variant="outline" className="text-xs">{entry.module}</Badge> : '—'}
                            </TableCell>
                            <TableCell className="text-sm">{getEntityLabel(entry.entity_type)}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[120px] truncate" title={entry.entity_id || ''}>{entry.entity_id || '—'}</TableCell>
                            <TableCell>{getSourceBadge(entry.payload_json)}</TableCell>
                          </TableRow>
                        ))}
                        {(!data?.entries || data.entries.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              No audit entries found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* ── Pagination ── */}
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        {data?.count ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, data.count)} of ${data.count.toLocaleString()}` : '0 entries'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages || 1}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (data?.count || 0)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-logs">
          <ApiLogsTab />
        </TabsContent>
      </Tabs>

      {/* ─── Detail Drawer (Sheet) ─── */}
      <Sheet open={!!selectedEntry} onOpenChange={open => { if (!open) setSelectedEntry(null); }}>
        <SheetContent className="sm:max-w-xl w-full overflow-hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              Audit Entry Detail
              {selectedEntry && getSourceBadge(selectedEntry.payload_json)}
            </SheetTitle>
            <SheetDescription className="sr-only">Details of the selected audit trail entry</SheetDescription>
          </SheetHeader>

          {selectedEntry && (
            <ScrollArea className="h-[calc(100vh-100px)] pr-4">
              <div className="space-y-5 pt-4">
                {/* ── Context Card ── */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Timestamp</span>
                        <span className="font-mono text-xs">{formatAuditDateTime(selectedEntry.timestamp, true)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Actor</span>
                        <span className="font-medium">{selectedEntry.user_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Action</span>
                        {getActionBadge(selectedEntry.action)}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Module</span>
                        <span>{selectedEntry.module || selectedEntry.payload_json?.screen || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Entity Type</span>
                        <span>{getEntityLabel(selectedEntry.entity_type)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Entity ID</span>
                        <span className="font-mono text-xs break-all">{selectedEntry.entity_id || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Route</span>
                        <span className="text-xs break-all">{selectedEntry.route || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Correlation ID</span>
                        <span className="font-mono text-xs break-all">{selectedEntry.correlation_id || '—'}</span>
                      </div>
                      {selectedEntry.payload_json?.screen && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Screen</span>
                          <span>{selectedEntry.payload_json.screen}</span>
                        </div>
                      )}
                      {selectedEntry.payload_json?.tab && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Tab</span>
                          <span>{selectedEntry.payload_json.tab}</span>
                        </div>
                      )}
                    </div>
                    {selectedEntry.payload_json?.description && (
                      <div className="mt-3 pt-3 border-t text-sm">
                        <span className="text-xs text-muted-foreground block">Description</span>
                        <span>{selectedEntry.payload_json.description}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Field-Level Diff ── */}
                {fullRowData.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {changedCount > 0
                        ? `Record Changes — ${changedCount} field${changedCount > 1 ? 's' : ''} modified`
                        : 'Record Details'}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-semibold w-[24px] px-2"></TableCell>
                            <TableCell className="font-semibold text-xs w-[160px]">Field</TableCell>
                            <TableCell className="font-semibold text-xs">Before</TableCell>
                            <TableCell className="font-semibold text-xs">After</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fullRowData.map((row, idx) => (
                            <TableRow key={idx} className={row.isChanged ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                              <TableCell className="w-[24px] px-2 text-center">
                                {row.isChanged && <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />}
                              </TableCell>
                              <TableCell className={`text-xs ${row.isChanged ? 'font-semibold' : 'text-muted-foreground'}`}>
                                {humanizeFieldName(row.field)}
                              </TableCell>
                              <TableCell className={`text-xs whitespace-pre-wrap break-all ${
                                row.changeType === 'removed' ? 'bg-destructive/10 text-destructive' :
                                row.changeType === 'changed' ? 'bg-destructive/5' : ''
                              }`}>
                                {formatFieldValue(row.oldValue)}
                              </TableCell>
                              <TableCell className={`text-xs whitespace-pre-wrap break-all ${
                                row.changeType === 'added' ? 'bg-primary/10 text-primary' :
                                row.changeType === 'changed' ? 'bg-primary/5' : ''
                              }`}>
                                {formatFieldValue(row.newValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (selectedEntry.before_value || selectedEntry.after_value) ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-sm font-semibold mb-1 text-destructive">Before</h4>
                      <pre className="bg-destructive/10 p-3 rounded-lg overflow-auto text-xs max-h-[250px]">
                        {selectedEntry.before_value ? JSON.stringify(selectedEntry.before_value, null, 2) : 'N/A'}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 text-primary">After</h4>
                      <pre className="bg-primary/10 p-3 rounded-lg overflow-auto text-xs max-h-[250px]">
                        {selectedEntry.after_value ? JSON.stringify(selectedEntry.after_value, null, 2) : 'N/A'}
                      </pre>
                    </div>
                  </div>
                ) : null}

                {/* ── Raw Metadata ── */}
                {selectedEntry.payload_json && Object.keys(selectedEntry.payload_json).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Metadata</h4>
                    <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs max-h-[200px]">
                      {JSON.stringify(selectedEntry.payload_json, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AuditTrail;
