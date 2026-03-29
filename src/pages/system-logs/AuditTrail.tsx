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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Download, History, ChevronLeft, ChevronRight, Globe, Database, Monitor, UserCheck } from 'lucide-react';
import { formatAuditDateTime } from '@/lib/dateFormat';
import { Label } from '@/components/ui/label';
import ApiLogsTab from '@/components/admin/ApiLogsTab';

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
}

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'enable', label: 'Enable' },
  { value: 'disable', label: 'Disable' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'page_view', label: 'Page View' },
  { value: 'export', label: 'Export' },
  { value: 'mutation', label: 'Mutation (Legacy)' },
];

/** Compute field-level diffs for the detail dialog */
function computeVisualDiff(
  before: Record<string, any> | null,
  after: Record<string, any> | null,
  action: string | null
): Array<{ field: string; oldValue: any; newValue: any; changeType: 'added' | 'removed' | 'changed' }> {
  const skipFields = new Set([
    'updated_at', 'modified_date', 'updated_by', 'modified_by',
    'created_at', 'created_by', 'correlation_id', 'session_id',
    'device_info', 'timestamp',
  ]);

  const diffs: Array<{ field: string; oldValue: any; newValue: any; changeType: 'added' | 'removed' | 'changed' }> = [];

  if (!before && !after) return diffs;

  const a = action?.toLowerCase() || '';

  if (a === 'create' || a === 'insert' || (!before && after)) {
    for (const [key, val] of Object.entries(after || {})) {
      if (skipFields.has(key) || val === null || val === undefined) continue;
      diffs.push({ field: key, oldValue: null, newValue: val, changeType: 'added' });
    }
    return diffs;
  }

  if (a === 'delete' || (before && !after)) {
    for (const [key, val] of Object.entries(before || {})) {
      if (skipFields.has(key) || val === null || val === undefined) continue;
      diffs.push({ field: key, oldValue: val, newValue: null, changeType: 'removed' });
    }
    return diffs;
  }

  // Update / general: compare field by field
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of allKeys) {
    if (skipFields.has(key)) continue;
    const oldVal = before?.[key];
    const newVal = after?.[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      if (oldVal === null || oldVal === undefined) {
        diffs.push({ field: key, oldValue: null, newValue: newVal, changeType: 'added' });
      } else if (newVal === null || newVal === undefined) {
        diffs.push({ field: key, oldValue: oldVal, newValue: null, changeType: 'removed' });
      } else {
        diffs.push({ field: key, oldValue: oldVal, newValue: newVal, changeType: 'changed' });
      }
    }
  }

  return diffs;
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getSourceBadge(payloadJson: any) {
  const source = payloadJson?.source;
  if (source === 'db_trigger') return <Badge variant="outline" className="text-xs gap-1"><Database className="h-3 w-3" />DB</Badge>;
  if (source === 'MutationCache_global' || source === 'app_interceptor') return <Badge variant="outline" className="text-xs gap-1"><Monitor className="h-3 w-3" />App</Badge>;
  if (source === 'useAuditedMutation') return <Badge variant="outline" className="text-xs gap-1"><UserCheck className="h-3 w-3" />Audited</Badge>;
  if (source) return <Badge variant="outline" className="text-xs">{source}</Badge>;
  return null;
}

const AuditTrail: React.FC = () => {
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-trail', page, sortKey, sortDirection, dateFrom, dateTo, userFilter, entityTypeFilter, moduleFilter, routeFilter, actionFilter],
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
      });

      if (error) throw error;

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (parsed?.error) throw new Error(parsed.error);

      return {
        entries: (parsed?.entries || []) as AuditEntry[],
        count: parsed?.count || 0,
      };
    }
  });

  const getActionBadge = (action: string | null) => {
    const a = action?.toLowerCase() || '';
    if (a.includes('failed')) return <Badge variant="destructive">{action}</Badge>;
    switch (a) {
      case 'create': case 'insert': return <Badge className="bg-primary text-primary-foreground">Create</Badge>;
      case 'update': return <Badge className="bg-secondary text-secondary-foreground">Update</Badge>;
      case 'delete': return <Badge variant="destructive">Delete</Badge>;
      case 'status_change': return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">Status Change</Badge>;
      case 'enable': return <Badge className="bg-primary text-primary-foreground">Enable</Badge>;
      case 'disable': return <Badge className="bg-accent/30 text-accent-foreground">Disable</Badge>;
      case 'approve': return <Badge className="bg-primary text-primary-foreground">Approve</Badge>;
      case 'reject': return <Badge variant="destructive">Reject</Badge>;
      case 'verify': return <Badge className="bg-secondary text-secondary-foreground">Verify</Badge>;
      case 'cancel': return <Badge className="bg-accent/30 text-accent-foreground">Cancel</Badge>;
      case 'page_view': return <Badge variant="outline">Page View</Badge>;
      case 'mutation': return <Badge variant="secondary">Mutation</Badge>;
      case 'login': case 'logout': return <Badge className="bg-secondary text-secondary-foreground">{action}</Badge>;
      case 'export': return <Badge variant="outline">Export</Badge>;
      case 'schedule': case 'reschedule': return <Badge className="bg-secondary text-secondary-foreground">{action}</Badge>;
      default: return <Badge variant="secondary">{action || 'Unknown'}</Badge>;
    }
  };

  // Compute diffs for selected entry
  const visualDiff = useMemo(() => {
    if (!selectedEntry) return [];
    return computeVisualDiff(selectedEntry.before_value, selectedEntry.after_value, selectedEntry.action);
  }, [selectedEntry]);

  const hasFieldDiff = visualDiff.length > 0;

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
            <History className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="api-logs" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            API Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Date From</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>Date To</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <div>
                    <Label>User</Label>
                    <Input placeholder="Search user..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
                  </div>
                  <div>
                    <Label>Action</Label>
                    <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(0); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value || '__all'} value={opt.value || ' '}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Module</Label>
                    <Input placeholder="Module / Source..." value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} />
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <Input placeholder="Entity type..." value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} />
                  </div>
                  <div>
                    <Label>Route / Screen</Label>
                    <Input placeholder="/cashier/..." value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setDateFrom(''); setDateTo(''); setUserFilter('');
                      setEntityTypeFilter(''); setModuleFilter('');
                      setRouteFilter(''); setActionFilter(''); setPage(0);
                    }}>Clear Filters</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
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
                          <SortableTableHead sortKey="route" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Route</SortableTableHead>
                          <SortableTableHead sortKey="entity_type" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Entity Type</SortableTableHead>
                          <SortableTableHead sortKey="entity_id" currentSortKey={sortKey} direction={sortDirection} onSort={handleSort}>Entity ID</SortableTableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.entries.map((entry) => (
                          <TableRow key={entry.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedEntry(entry)}>
                            <TableCell className="font-mono text-sm">
                              {formatAuditDateTime(entry.timestamp, true)}
                            </TableCell>
                            <TableCell>{entry.user_name || entry.user_id?.slice(0, 8) || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {getActionBadge(entry.action)}
                                {getSourceBadge(entry.payload_json)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.module ? (
                                <Badge variant="outline">{entry.module}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{entry.route || '-'}</TableCell>
                            <TableCell>{entry.entity_type || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{entry.entity_id || '-'}</TableCell>
                          </TableRow>
                        ))}
                        {(!data?.entries || data.entries.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No audit entries found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, data?.count || 0)} of {data?.count || 0}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (data?.count || 0)}>
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

      {/* ─── Detail Dialog with Field-Level Diff ─── */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Audit Entry Details
              {selectedEntry && getSourceBadge(selectedEntry.payload_json)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedEntry && (
              <div className="space-y-6">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Timestamp:</strong> {formatAuditDateTime(selectedEntry.timestamp, true)}</div>
                  <div><strong>User:</strong> {selectedEntry.user_name || '-'}</div>
                  <div><strong>Action:</strong> {getActionBadge(selectedEntry.action)}</div>
                  <div><strong>Module:</strong> {selectedEntry.module || selectedEntry.payload_json?.screen || '-'}</div>
                  <div><strong>Route:</strong> {selectedEntry.route || '-'}</div>
                  <div><strong>Entity Type:</strong> {selectedEntry.entity_type || '-'}</div>
                  <div><strong>Entity ID:</strong> {selectedEntry.entity_id || '-'}</div>
                  <div><strong>Correlation ID:</strong> <span className="font-mono text-xs">{selectedEntry.correlation_id || '-'}</span></div>
                  {selectedEntry.payload_json?.screen && (
                    <div><strong>Screen:</strong> {selectedEntry.payload_json.screen}</div>
                  )}
                  {selectedEntry.payload_json?.tab && (
                    <div><strong>Tab:</strong> {selectedEntry.payload_json.tab}</div>
                  )}
                  {selectedEntry.payload_json?.section && (
                    <div><strong>Section:</strong> {selectedEntry.payload_json.section}</div>
                  )}
                  {selectedEntry.payload_json?.description && (
                    <div className="col-span-2"><strong>Description:</strong> {selectedEntry.payload_json.description}</div>
                  )}
                </div>

                {/* ─── Field-Level Diff Table ─── */}
                {hasFieldDiff ? (
                  <div>
                    <h4 className="font-semibold mb-2">Field-Level Changes</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-semibold w-[200px]">Field</TableCell>
                            <TableCell className="font-semibold">Before</TableCell>
                            <TableCell className="font-semibold">After</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visualDiff.map((diff, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs font-medium">{diff.field}</TableCell>
                              <TableCell className={`text-xs whitespace-pre-wrap break-all ${
                                diff.changeType === 'removed' ? 'bg-destructive/10 text-destructive' :
                                diff.changeType === 'changed' ? 'bg-destructive/5' : ''
                              }`}>
                                {formatFieldValue(diff.oldValue)}
                              </TableCell>
                              <TableCell className={`text-xs whitespace-pre-wrap break-all ${
                                diff.changeType === 'added' ? 'bg-primary/10 text-primary' :
                                diff.changeType === 'changed' ? 'bg-primary/5' : ''
                              }`}>
                                {formatFieldValue(diff.newValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  /* Fallback: raw JSON if no diff could be computed */
                  (selectedEntry.before_value || selectedEntry.after_value) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-destructive">Before Value</h4>
                        <pre className="bg-destructive/10 p-4 rounded-lg overflow-auto text-xs max-h-[300px]">
                          {selectedEntry.before_value ? JSON.stringify(selectedEntry.before_value, null, 2) : 'N/A'}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-primary">After Value</h4>
                        <pre className="bg-primary/10 p-4 rounded-lg overflow-auto text-xs max-h-[300px]">
                          {selectedEntry.after_value ? JSON.stringify(selectedEntry.after_value, null, 2) : 'N/A'}
                        </pre>
                      </div>
                    </div>
                  )
                )}

                {/* Metadata section */}
                {selectedEntry.payload_json && (
                  <div>
                    <h4 className="font-semibold mb-2">Metadata</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(selectedEntry.payload_json, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrail;
