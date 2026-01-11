import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Download, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface ErrorLog {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  user_id: string | null;
  api_name: string | null;
  module: string | null;
  severity: string | null;
  error_type: string | null;
  error_message: string | null;
  stack_trace: string | null;
}

const PAGE_SIZE = 20;

const ErrorLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [apiFilter, setApiFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['error-logs', page, dateFrom, dateTo, apiFilter, userFilter, severityFilter, errorTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('system_error_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (apiFilter) query = query.ilike('api_name', `%${apiFilter}%`);
      if (userFilter) query = query.eq('user_id', userFilter);
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
      if (errorTypeFilter) query = query.ilike('error_type', `%${errorTypeFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as ErrorLog[], count: count || 0 };
    }
  });

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      default: return <Badge variant="secondary">{severity || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Error Logs
          </h1>
          <p className="text-muted-foreground">Track and analyze system errors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
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
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Name</Label>
              <Input placeholder="Search API..." value={apiFilter} onChange={(e) => setApiFilter(e.target.value)} />
            </div>
            <div>
              <Label>Error Type</Label>
              <Input placeholder="Error type..." value={errorTypeFilter} onChange={(e) => setErrorTypeFilter(e.target.value)} />
            </div>
            <div>
              <Label>User ID</Label>
              <Input placeholder="User ID..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
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
                    <TableHead>Error Type</TableHead>
                    <TableHead>API Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedLog(log)}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.error_type || '-'}</TableCell>
                      <TableCell>{log.api_name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.user_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.error_message || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No error logs found
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Timestamp:</strong> {format(new Date(selectedLog.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                  <div><strong>Severity:</strong> {getSeverityBadge(selectedLog.severity)}</div>
                  <div><strong>Error Type:</strong> {selectedLog.error_type || '-'}</div>
                  <div><strong>API Name:</strong> {selectedLog.api_name || '-'}</div>
                  <div><strong>Module:</strong> {selectedLog.module || '-'}</div>
                  <div><strong>Correlation ID:</strong> {selectedLog.correlation_id || '-'}</div>
                </div>
                <div>
                  <strong>Error Message:</strong>
                  <p className="mt-1 text-destructive">{selectedLog.error_message || 'No message'}</p>
                </div>
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs mt-1 whitespace-pre-wrap">
                    {selectedLog.stack_trace || 'No stack trace available'}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorLogs;
