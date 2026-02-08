import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  useWorkflowApiExecutionLogs,
  useRetryWorkflowApiExecution,
  type WorkflowApiExecutionLog,
} from '@/hooks/useWorkflowActionApi';

interface WorkflowApiExecutionLogsProps {
  instanceId: string;
}

export function WorkflowApiExecutionLogs({ instanceId }: WorkflowApiExecutionLogsProps) {
  const { data: logs, isLoading, refetch } = useWorkflowApiExecutionLogs(instanceId);
  const retryExecution = useRetryWorkflowApiExecution();

  const getStatusBadge = (status: WorkflowApiExecutionLog['execution_status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'TIMEOUT':
        return (
          <Badge variant="secondary" className="bg-amber-600 dark:bg-amber-700 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Execution Logs</CardTitle>
          <CardDescription>No API executions for this workflow instance</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">API Execution Logs</CardTitle>
            <CardDescription>
              History of external API calls for this workflow
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Executed At</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.executed_at), 'MMM dd, HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action_code}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={log.endpoint_url}>
                  <span className="text-muted-foreground">{log.http_method}</span>{' '}
                  {log.endpoint_url}
                </TableCell>
                <TableCell>{getStatusBadge(log.execution_status)}</TableCell>
                <TableCell>
                  {log.http_status ? (
                    <span
                      className={
                        log.http_status >= 200 && log.http_status < 300
                          ? 'text-green-600'
                          : log.http_status >= 400
                          ? 'text-red-600'
                          : ''
                      }
                    >
                      {log.http_status}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <LogDetailsDialog log={log} />
                    {log.execution_status !== 'SUCCESS' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => retryExecution.mutate(log.id)}
                        disabled={retryExecution.isPending}
                        title="Retry API call"
                      >
                        {retryExecution.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LogDetailsDialog({ log }: { log: WorkflowApiExecutionLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="View details">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>API Execution Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Action:</span>{' '}
                <Badge variant="outline">{log.action_code}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                {log.execution_status}
              </div>
              <div>
                <span className="text-muted-foreground">HTTP Status:</span>{' '}
                {log.http_status || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{' '}
                {log.duration_ms ? `${log.duration_ms}ms` : '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Executed By:</span>{' '}
                {log.executed_by || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Retry Attempt:</span>{' '}
                {log.retry_attempt}
              </div>
            </div>

            <div>
              <span className="text-muted-foreground text-sm">Endpoint:</span>
              <p className="font-mono text-sm bg-muted p-2 rounded mt-1 break-all">
                {log.http_method} {log.endpoint_url}
              </p>
            </div>

            {log.error_message && (
              <div>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Error Message:
                </span>
                <p className="font-mono text-sm bg-destructive/10 text-destructive p-2 rounded mt-1">
                  {log.error_message}
                </p>
              </div>
            )}

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="request">
                <AccordionTrigger>Request Payload</AccordionTrigger>
                <AccordionContent>
                  <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(log.request_payload, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              {log.response_payload && (
                <AccordionItem value="response">
                  <AccordionTrigger>Response Payload</AccordionTrigger>
                  <AccordionContent>
                    <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(log.response_payload, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowApiExecutionLogs;
