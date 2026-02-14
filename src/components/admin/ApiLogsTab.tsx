import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, Filter, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface ApiLog {
  id: string;
  api_name: string;
  endpoint_url: string | null;
  http_method: string | null;
  request_headers: Record<string, unknown> | null;
  request_payload: Record<string, unknown> | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  is_success: boolean | null;
  error_message: string | null;
  execution_timestamp: string;
  duration_ms: number | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  module: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const ApiLogsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiNameFilter, setApiNameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const { data: apiNames = [] } = useQuery({
    queryKey: ['api-log-names'],
    queryFn: async () => {
      const { data } = await supabase
        .from('api_logs')
        .select('api_name')
        .order('api_name');
      const unique = [...new Set((data || []).map(d => d.api_name))];
      return unique;
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['api-logs', apiNameFilter, statusFilter, startDate, endDate, entityIdFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('api_logs')
        .select('*', { count: 'exact' })
        .order('execution_timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (apiNameFilter !== 'all') query = query.eq('api_name', apiNameFilter);
      if (statusFilter === 'success') query = query.eq('is_success', true);
      if (statusFilter === 'failed') query = query.eq('is_success', false);
      if (startDate) query = query.gte('execution_timestamp', `${startDate}T00:00:00`);
      if (endDate) query = query.lte('execution_timestamp', `${endDate}T23:59:59`);
      if (entityIdFilter) query = query.eq('related_entity_id', entityIdFilter);

      const { data: logs, count, error } = await query;
      if (error) throw error;
      return { logs: (logs || []) as ApiLog[], total: count || 0 };
    }
  });

  const logs = data?.logs || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filteredLogs = logs.filter(log =>
    !searchQuery ||
    log.api_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.endpoint_url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.module?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'API Name', 'Method', 'Endpoint', 'Status', 'Success', 'Duration(ms)', 'Module', 'Entity ID', 'Error'].join(','),
      ...filteredLogs.map(log => [
        log.execution_timestamp,
        log.api_name,
        log.http_method || '',
        log.endpoint_url || '',
        log.response_status || '',
        log.is_success ? 'Yes' : 'No',
        log.duration_ms || '',
        log.module || '',
        log.related_entity_id || '',
        log.error_message || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search API name, endpoint..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={apiNameFilter} onValueChange={(v) => { setApiNameFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="API Name" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All APIs</SelectItem>
                {apiNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} placeholder="Start Date" />
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} placeholder="End Date" />
          </div>
          <div className="mt-3 flex gap-3">
            <Input placeholder="Application / Entity ID" value={entityIdFilter} onChange={(e) => { setEntityIdFilter(e.target.value); setPage(0); }} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">API Logs ({totalCount} records)</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page {page + 1} of {totalPages || 1}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>API Name</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{format(new Date(log.execution_timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                    <TableCell className="font-medium text-sm">{log.api_name}</TableCell>
                    <TableCell><Badge variant="outline">{log.http_method || 'GET'}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={log.is_success ? 'default' : 'destructive'}>
                        {log.response_status || (log.is_success ? '200' : 'ERR')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.duration_ms != null ? `${log.duration_ms}ms` : '-'}</TableCell>
                    <TableCell className="text-sm">{log.module || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{log.related_entity_id ? `${log.related_entity_type || ''}:${log.related_entity_id}` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No API logs found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">API Name</p><p className="font-medium">{selectedLog.api_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Timestamp</p><p className="font-medium">{format(new Date(selectedLog.execution_timestamp), 'PPpp')}</p></div>
                <div><p className="text-sm text-muted-foreground">Method</p><Badge variant="outline">{selectedLog.http_method}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Response Status</p><Badge variant={selectedLog.is_success ? 'default' : 'destructive'}>{selectedLog.response_status}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Duration</p><p className="font-medium">{selectedLog.duration_ms}ms</p></div>
                <div><p className="text-sm text-muted-foreground">Module</p><p className="font-medium">{selectedLog.module || '-'}</p></div>
              </div>
              <div><p className="text-sm text-muted-foreground">Endpoint URL</p><p className="font-mono text-sm break-all">{selectedLog.endpoint_url}</p></div>
              {selectedLog.error_message && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Error</p>
                  <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                </div>
              )}
              {selectedLog.related_entity_id && (
                <div><p className="text-sm text-muted-foreground">Related Entity</p><p className="font-mono text-sm">{selectedLog.related_entity_type}: {selectedLog.related_entity_id}</p></div>
              )}
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Request Headers</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-32">{JSON.stringify(selectedLog.request_headers, null, 2)}</pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Request Payload</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-40">{JSON.stringify(selectedLog.request_payload, null, 2)}</pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Response Body</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-40">{JSON.stringify(selectedLog.response_body, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiLogsTab;
