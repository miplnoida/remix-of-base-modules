import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Mail, MessageSquare, Bell, Smartphone, Eye, Download, 
  CheckCircle, XCircle, Clock, RotateCcw, X, Search, Filter 
} from "lucide-react";
import { useNotificationLogs, useResendNotification, useCancelNotification, NotificationLog as NotificationLogType } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { toast } from "sonner";

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'in_app', label: 'In-App', icon: Bell },
] as const;

export default function NotificationLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<NotificationLogType | null>(null);

  const { data: logs = [], isLoading } = useNotificationLogs({
    channel: channelFilter !== 'all' ? channelFilter as any : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
  });
  const resendNotification = useResendNotification();
  const cancelNotification = useCancelNotification();

  const filteredLogs = logs.filter(log =>
    searchTerm === "" ||
    log.recipient_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => ['queued', 'sending'].includes(l.status)).length,
  };

  const getChannelIcon = (channel: string) => {
    const ch = CHANNELS.find(c => c.value === channel);
    return ch ? <ch.icon className="h-4 w-4" /> : null;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      sent: { variant: 'default', label: 'Sent' },
      queued: { variant: 'secondary', label: 'Queued' },
      sending: { variant: 'outline', label: 'Sending' },
      failed: { variant: 'destructive', label: 'Failed' },
      cancelled: { variant: 'secondary', label: 'Cancelled' },
    };
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Channel', 'Recipient', 'Subject/Title', 'Status', 'Failure Reason'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.channel,
        log.recipient_address,
        log.subject || log.title || '',
        log.status,
        log.failure_reason || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Logs exported successfully');
  };

  const handleResend = async (logId: string) => {
    await resendNotification.mutateAsync(logId);
  };

  const handleCancel = async (logId: string) => {
    await cancelNotification.mutateAsync(logId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Log</h1>
          <p className="text-muted-foreground">View and manage all notification delivery records</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
              </div>
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-sm text-muted-foreground">Pending/Queued</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sending">Sending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History ({filteredLogs.length} records)</CardTitle>
          <CardDescription>All notification delivery attempts and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading notification logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notification logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject/Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="capitalize">{log.channel.replace('_', '-')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.recipient_address}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.subject || log.title || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(log.status)}
                        {log.failure_reason && (
                          <p className="text-xs text-destructive">{log.failure_reason}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSelectedLog(log)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(log.status === 'failed' || log.status === 'sent') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleResend(log.id)}
                            disabled={resendNotification.isPending}
                            title="Resend"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {log.status === 'queued' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCancel(log.id)}
                            disabled={cancelNotification.isPending}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>Full notification record</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <div className="flex items-center gap-2">
                    {getChannelIcon(selectedLog.channel)}
                    <span className="capitalize">{selectedLog.channel}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-mono">{selectedLog.recipient_address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                {selectedLog.sent_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sent At</p>
                    <p className="font-medium">{format(new Date(selectedLog.sent_at), 'PPpp')}</p>
                  </div>
                )}
                {selectedLog.failure_reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Failure Reason</p>
                    <p className="text-destructive">{selectedLog.failure_reason}</p>
                  </div>
                )}
              </div>
              
              {(selectedLog.subject || selectedLog.title) && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject/Title</p>
                  <p className="font-medium">{selectedLog.subject || selectedLog.title}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">Body</p>
                <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                  {selectedLog.body}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
