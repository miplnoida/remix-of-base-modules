import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Download, History, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
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

const AuditTrail: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-trail', page, dateFrom, dateTo, userFilter, entityTypeFilter, moduleFilter, routeFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('system_audit_trail')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (userFilter) query = query.ilike('user_name', `%${userFilter}%`);
      if (entityTypeFilter) query = query.ilike('entity_type', `%${entityTypeFilter}%`);
      if (moduleFilter) query = query.ilike('module', `%${moduleFilter}%`);
      if (routeFilter) query = query.ilike('route', `%${routeFilter}%`);
      if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { entries: data as AuditEntry[], count: count || 0 };
    }
  });

  const getActionBadge = (action: string | null) => {
    switch (action?.toLowerCase()) {
      case 'create': return <Badge className="bg-primary text-primary-foreground">Create</Badge>;
      case 'update': return <Badge className="bg-secondary text-secondary-foreground">Update</Badge>;
      case 'delete': return <Badge variant="destructive">Delete</Badge>;
      case 'enable': return <Badge className="bg-primary text-primary-foreground">Enable</Badge>;
      case 'disable': return <Badge className="bg-accent/30 text-accent-foreground">Disable</Badge>;
      case 'approve': return <Badge className="bg-primary text-primary-foreground">Approve</Badge>;
      case 'reject': return <Badge variant="destructive">Reject</Badge>;
      case 'verify': return <Badge className="bg-secondary text-secondary-foreground">Verify</Badge>;
      case 'cancel': return <Badge className="bg-accent/30 text-accent-foreground">Cancel</Badge>;
      default: return <Badge variant="secondary">{action || 'Unknown'}</Badge>;
    }
  };

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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <Label>Module</Label>
                    <Input placeholder="Module / Source..." value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} />
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <Input placeholder="Entity type..." value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} />
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
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Entity Type</TableHead>
                          <TableHead>Entity ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.entries.map((entry) => (
                          <TableRow key={entry.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedEntry(entry)}>
                            <TableCell className="font-mono text-sm">
                              {formatAuditDateTime(entry.timestamp, true)}
                            </TableCell>
                            <TableCell>{entry.user_name || entry.user_id?.slice(0, 8) || '-'}</TableCell>
                            <TableCell>{getActionBadge(entry.action)}</TableCell>
                            <TableCell>
                              {entry.module ? (
                                <Badge variant="outline">{entry.module}</Badge>
                              ) : '-'}
                            </TableCell>
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

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedEntry && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Timestamp:</strong> {formatAuditDateTime(selectedEntry.timestamp, true)}</div>
                  <div><strong>User:</strong> {selectedEntry.user_name || '-'}</div>
                  <div><strong>Action:</strong> {getActionBadge(selectedEntry.action)}</div>
                  <div><strong>Module:</strong> {selectedEntry.module || '-'}</div>
                  <div><strong>Entity Type:</strong> {selectedEntry.entity_type || '-'}</div>
                  <div><strong>Entity ID:</strong> {selectedEntry.entity_id || '-'}</div>
                </div>
                
                {selectedEntry.payload_json && (
                  <div>
                    <h4 className="font-semibold mb-2">Metadata</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(selectedEntry.payload_json, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-destructive">Before Value</h4>
                    <pre className="bg-destructive/10 p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(selectedEntry.before_value, null, 2) || 'No data'}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600">After Value</h4>
                    <pre className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(selectedEntry.after_value, null, 2) || 'No data'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrail;
