import { useC3ConfigAuditHistory } from '@/hooks/useC3CalculationConfig';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function C3ConfigAuditLog() {
  const { data: auditLogs, isLoading, error } = useC3ConfigAuditHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load audit history
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No configuration changes have been recorded yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Time</TableHead>
          <TableHead>Parameter</TableHead>
          <TableHead>Changed By</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {auditLogs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">
              {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm')}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono text-xs">
                {log.config_key}
              </Badge>
            </TableCell>
            <TableCell>{log.changed_by_name || 'Unknown'}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{log.old_value}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">{log.new_value}</span>
              </div>
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {log.reason || <span className="text-muted-foreground">-</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
