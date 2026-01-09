import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';
import { useWorkflowLogs } from '@/hooks/useWorkflows';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function WorkflowLogs() {
  const [searchTerm, setSearchTerm] = useState('');

  const { can } = useActionPermissions(MODULE_NAMES.WORKFLOW_LOGS);
  const { data: logs, isLoading } = useWorkflowLogs();

  // Get workflow instances for reference
  const { data: instances } = useQuery({
    queryKey: ['workflow-instances-for-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('id, workflow_name');
      if (error) throw error;
      return data || [];
    },
  });

  const instanceMap = new Map(instances?.map(i => [i.id, i.workflow_name]) || []);

  const filteredLogs = logs?.filter(log =>
    log.step_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instanceMap.get(log.instance_id)?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'approve':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'reject':
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'started':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'escalate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Workflow', 'Step', 'User', 'Action', 'Old Status', 'New Status', 'Comments'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        instanceMap.get(log.instance_id) || 'Unknown',
        log.step_name || '-',
        log.user_name || '-',
        log.action,
        log.old_status || '-',
        log.new_status || '-',
        `"${(log.comments || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_LOGS}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workflow Logs</h1>
            <p className="text-muted-foreground">View workflow execution history and audit trail</p>
          </div>
          {can(ACTION_NAMES.EXPORT) && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Old Status</TableHead>
                <TableHead>New Status</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No workflow logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{instanceMap.get(log.instance_id) || 'Unknown'}</TableCell>
                    <TableCell>{log.step_name || '-'}</TableCell>
                    <TableCell>{log.user_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.old_status || '-'}</TableCell>
                    <TableCell>{log.new_status || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.comments || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PermissionWrapper>
  );
}
