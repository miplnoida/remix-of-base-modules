import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Search, Download, Eye, Filter } from "lucide-react";
import { useAuditLogs, AuditLog } from "@/hooks/useAdminData";
import { format } from "date-fns";

const ACTION_TYPES = [
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'USER_CREATE', 'USER_UPDATE', 'USER_DISABLE', 'USER_ENABLE',
  'ROLE_ASSIGN', 'ROLE_REMOVE', 'PERMISSION_GRANT', 'PERMISSION_REVOKE',
  'RECORD_CREATE', 'RECORD_UPDATE', 'RECORD_DELETE',
  'CONFIG_CHANGE', 'NOTIFICATION_SENT', 'NOTIFICATION_RESEND'
];

const AuditLogViewer = () => {
  const [filters, setFilters] = useState<{
    actionType?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useAuditLogs(filters);

  const filteredLogs = logs.filter(log => 
    searchQuery === "" ||
    log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
    if (actionType.includes('DELETE') || actionType.includes('FAILURE') || actionType.includes('REVOKE')) {
      return 'destructive';
    }
    if (actionType.includes('CREATE') || actionType.includes('SUCCESS') || actionType.includes('GRANT')) {
      return 'default';
    }
    if (actionType.includes('UPDATE') || actionType.includes('CHANGE')) {
      return 'secondary';
    }
    return 'outline';
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Module', 'Entity', 'Field', 'Old Value', 'New Value', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.user_email || '',
        log.action_type,
        log.module_name || '',
        `${log.entity_type || ''}:${log.entity_id || ''}`,
        log.field_name || '',
        log.old_value || '',
        log.new_value || '',
        log.ip_address || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading audit logs...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">View and export system audit trail</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.actionType || ''} onValueChange={(v) => setFilters({...filters, actionType: v || undefined})}>
              <SelectTrigger><SelectValue placeholder="Action Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {ACTION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input 
              type="date" 
              placeholder="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({...filters, startDate: e.target.value || undefined})}
            />
            <Input 
              type="date" 
              placeholder="End Date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({...filters, endDate: e.target.value || undefined})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({filteredLogs.length} records)</CardTitle>
          <CardDescription>Immutable record of all system activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.user_name || 'System'}</p>
                      <p className="text-xs text-muted-foreground">{log.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action_type)}>
                      {log.action_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.module_name || '-'}</TableCell>
                  <TableCell>
                    {log.entity_type ? (
                      <span className="text-sm">{log.entity_type}</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{log.ip_address || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedLog.user_name || 'System'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge variant={getActionBadgeVariant(selectedLog.action_type)}>
                    {selectedLog.action_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Module</p>
                  <p className="font-medium">{selectedLog.module_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity</p>
                  <p className="font-medium">{selectedLog.entity_type || '-'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedLog.entity_id}</p>
                </div>
              </div>
              {selectedLog.field_name && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Field Changed: <span className="font-medium">{selectedLog.field_name}</span></p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Old Value</p>
                      <p className="font-mono text-sm">{selectedLog.old_value || '(empty)'}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">New Value</p>
                      <p className="font-mono text-sm">{selectedLog.new_value || '(empty)'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogViewer;
