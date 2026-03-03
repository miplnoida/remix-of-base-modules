import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, RefreshCw, Download, FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TechnicalLog {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  user_id: string | null;
  api_name: string | null;
  module: string | null;
  execution_time_ms: number | null;
  status: string | null;
  request_payload: any;
  response_payload: any;
  headers: any;
  stack_trace: string | null;
  ip_address: string | null;
}

const PAGE_SIZE = 20;

const TechnicalLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [apiFilter, setApiFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [correlationSearch, setCorrelationSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<TechnicalLog | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['technical-logs', page, dateFrom, dateTo, apiFilter, userFilter, correlationSearch, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('system_technical_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) {
        query = query.gte('timestamp', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      }
      if (apiFilter) {
        query = query.ilike('api_name', `%${apiFilter}%`);
      }
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }
      if (correlationSearch) {
        query = query.eq('correlation_id', correlationSearch);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as TechnicalLog[], count: count || 0 };
    }
  });

  const getStatusBadge = (status: string | null) => {
    if (status === 'success') return <Badge className="bg-primary text-primary-foreground">Success</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  };

  const handleExport = () => {
    // Export logic would go here
    console.log('Exporting logs...');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCode className="h-6 w-6" />
            Technical Logs
          </h1>
          <p className="text-muted-foreground">View API calls and technical operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>API Name</Label>
              <Input
                placeholder="Search API..."
                value={apiFilter}
                onChange={(e) => setApiFilter(e.target.value)}
              />
            </div>
            <div>
              <Label>User ID</Label>
              <Input
                placeholder="User ID..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
            <div>
              <Label>Correlation ID</Label>
              <Input
                placeholder="Search..."
                value={correlationSearch}
                onChange={(e) => setCorrelationSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>API Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Correlation ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.api_name || '-'}</TableCell>
                      <TableCell>{log.module || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.user_id?.slice(0, 8) || '-'}
                      </TableCell>
                      <TableCell>
                        {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.correlation_id?.slice(0, 8) || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No logs found
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= (data?.count || 0)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedLog && (
              <Tabs defaultValue="request">
                <TabsList>
                  <TabsTrigger value="request">Request Payload</TabsTrigger>
                  <TabsTrigger value="response">Response Payload</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="stack">Stack Trace</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Timestamp:</strong> {format(new Date(selectedLog.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                      <div><strong>API Name:</strong> {selectedLog.api_name || '-'}</div>
                      <div><strong>Module:</strong> {selectedLog.module || '-'}</div>
                      <div><strong>User ID:</strong> {selectedLog.user_id || '-'}</div>
                      <div><strong>Correlation ID:</strong> {selectedLog.correlation_id || '-'}</div>
                      <div><strong>IP Address:</strong> {selectedLog.ip_address || '-'}</div>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(selectedLog.request_payload, null, 2) || 'No request payload'}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="response" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedLog.response_payload, null, 2) || 'No response payload'}
                  </pre>
                </TabsContent>
                <TabsContent value="headers" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedLog.headers, null, 2) || 'No headers'}
                  </pre>
                </TabsContent>
                <TabsContent value="stack" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs whitespace-pre-wrap">
                    {selectedLog.stack_trace || 'No stack trace'}
                  </pre>
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicalLogs;
