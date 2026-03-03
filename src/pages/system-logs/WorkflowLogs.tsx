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
import { Loader2, RefreshCw, Download, GitBranch, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface WorkflowLog {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  workflow_id: string | null;
  application_id: string | null;
  current_step: string | null;
  step_number: number | null;
  status: string | null;
  step_history: any;
}

const PAGE_SIZE = 20;

const WorkflowLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workflowSearch, setWorkflowSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<WorkflowLog | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflow-logs', page, dateFrom, dateTo, statusFilter, workflowSearch],
    queryFn: async () => {
      let query = supabase
        .from('workflow_execution_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (workflowSearch) query = query.ilike('workflow_id', `%${workflowSearch}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as WorkflowLog[], count: count || 0 };
    }
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed': return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending': return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default: return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Workflow Logs
          </h1>
          <p className="text-muted-foreground">Track workflow executions and step history</p>
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
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Workflow ID</Label>
              <Input placeholder="Search workflow..." value={workflowSearch} onChange={(e) => setWorkflowSearch(e.target.value)} />
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
                    <TableHead>Workflow ID</TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Correlation ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedLog(log)}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.workflow_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.application_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>
                        {log.current_step || '-'}
                        {log.step_number && <span className="text-muted-foreground ml-1">(Step {log.step_number})</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.correlation_id?.slice(0, 8) || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No workflow logs found
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
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Workflow Execution Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedLog && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Timestamp:</strong> {format(new Date(selectedLog.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                  <div><strong>Status:</strong> {getStatusBadge(selectedLog.status)}</div>
                  <div><strong>Workflow ID:</strong> {selectedLog.workflow_id || '-'}</div>
                  <div><strong>Application ID:</strong> {selectedLog.application_id || '-'}</div>
                  <div><strong>Current Step:</strong> {selectedLog.current_step || '-'}</div>
                  <div><strong>Step Number:</strong> {selectedLog.step_number || '-'}</div>
                  <div className="col-span-2"><strong>Correlation ID:</strong> {selectedLog.correlation_id || '-'}</div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Step History</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedLog.step_history, null, 2) || 'No step history available'}
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

export default WorkflowLogs;
