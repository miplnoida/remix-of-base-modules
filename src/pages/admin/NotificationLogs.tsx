import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Search, Download, Eye, Filter, Mail, MessageSquare, Bell, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAuditDateTime, formatDateForStorage } from '@/lib/dateFormat';

interface NotificationLog {
  id: string;
  channel: string;
  recipient_address: string;
  recipient_user_id: string | null;
  subject: string | null;
  title: string | null;
  body: string;
  status: string;
  failure_reason: string | null;
  sent_at: string | null;
  created_at: string;
  trigger_source: string | null;
  ip_address: string | null;
}

const CHANNELS = ['email', 'sms', 'push', 'in_app'];
const STATUSES = ['pending', 'sent', 'delivered', 'failed', 'bounced'];

const NotificationLogs = () => {
  const [filters, setFilters] = useState<{
    channel?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['notification-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.channel) {
        query = query.eq('channel', filters.channel as 'email' | 'sms' | 'push' | 'in_app');
      }
      if (filters.status) {
        query = query.eq('status', filters.status as 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled');
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  const filteredLogs = logs.filter(log =>
    searchQuery === "" ||
    log.recipient_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return 'default';
      case 'failed':
      case 'bounced':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
      case 'in_app':
        return <Bell className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Channel', 'Recipient', 'Subject/Title', 'Status', 'Failure Reason'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.channel,
        log.recipient_address || '',
        log.subject || log.title || '',
        log.status,
        log.failure_reason || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-logs-${formatDateForStorage(new Date())}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">Loading notification logs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Logs</h1>
          <p className="text-muted-foreground mt-1">View and export notification delivery history</p>
        </div>
        <Button onClick={handleExport} disabled={filteredLogs.length === 0}>
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
                placeholder="Search by recipient or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.channel || 'all'}
              onValueChange={(v) => setFilters({ ...filters, channel: v === 'all' ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map(channel => (
                  <SelectItem key={channel} value={channel}>{channel.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification History ({filteredLogs.length} records)</CardTitle>
          <CardDescription>Complete log of all notification deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No logs available</h3>
              <p className="text-muted-foreground">
                {logs.length === 0
                  ? "No notification logs have been recorded yet."
                  : "No logs match your current filters."}
              </p>
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
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatAuditDateTime(log.created_at, true)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="capitalize">{log.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.recipient_address || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.subject || log.title || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{formatAuditDateTime(selectedLog.created_at, true)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <div className="flex items-center gap-2">
                    {getChannelIcon(selectedLog.channel)}
                    <span className="font-medium capitalize">{selectedLog.channel}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedLog.recipient_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedLog.status)}>
                    {selectedLog.status}
                  </Badge>
                </div>
              </div>

              {(selectedLog.subject || selectedLog.title) && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject/Title</p>
                  <p className="font-medium">{selectedLog.subject || selectedLog.title}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Body</p>
                <div className="p-3 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{selectedLog.body || '-'}</pre>
                </div>
              </div>

              {selectedLog.failure_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive font-medium">Failure Reason:</p>
                  <p className="text-sm text-destructive">{selectedLog.failure_reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Trigger Source</p>
                  <p>{selectedLog.trigger_source || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent At</p>
                  <p>{selectedLog.sent_at ? formatAuditDateTime(selectedLog.sent_at, true) : '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationLogs;
