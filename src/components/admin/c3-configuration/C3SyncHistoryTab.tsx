import { useC3SyncLog } from '@/hooks/useC3ConfigPublish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function C3SyncHistoryTab() {
  const { data: logs, isLoading, error } = useC3SyncLog();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p className="font-medium">Failed to load sync history</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync History
        </CardTitle>
        <CardDescription>
          History of C3 configuration publishes to C3-Wizard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Published At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published By</TableHead>
                <TableHead className="text-center">Periods</TableHead>
                <TableHead className="text-center">Levy Slabs</TableHead>
                <TableHead className="text-center">Bonus Pol.</TableHead>
                <TableHead className="text-center">Bonus Exc.</TableHead>
                <TableHead className="text-center">Holiday Pol.</TableHead>
                <TableHead className="text-center">Holiday Exc.</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDateTime(log.published_at)}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{log.published_by || '-'}</TableCell>
                  <TableCell className="text-center">{log.config_periods_count}</TableCell>
                  <TableCell className="text-center">{log.levy_slabs_count}</TableCell>
                  <TableCell className="text-center">{log.bonus_policies_count || 0}</TableCell>
                  <TableCell className="text-center">{log.bonus_exceptions_count || 0}</TableCell>
                  <TableCell className="text-center">{log.holiday_policies_count || 0}</TableCell>
                  <TableCell className="text-center">{log.holiday_exceptions_count || 0}</TableCell>
                  <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                    {log.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No publish history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
