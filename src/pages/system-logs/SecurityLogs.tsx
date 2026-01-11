import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Download, Shield, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface SecurityLog {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  user_id: string | null;
  user_name: string | null;
  event_type: string | null;
  ip_address: string | null;
  device_info: string | null;
  success: boolean | null;
}

const PAGE_SIZE = 20;

const SecurityLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-logs', page, dateFrom, dateTo, eventTypeFilter, userFilter],
    queryFn: async () => {
      let query = supabase
        .from('system_security_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (eventTypeFilter !== 'all') query = query.eq('event_type', eventTypeFilter);
      if (userFilter) query = query.ilike('user_name', `%${userFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as SecurityLog[], count: count || 0 };
    }
  });

  const getEventBadge = (eventType: string | null) => {
    switch (eventType) {
      case 'login': return <Badge className="bg-green-500">Login</Badge>;
      case 'logout': return <Badge className="bg-blue-500">Logout</Badge>;
      case 'password_change': return <Badge className="bg-purple-500">Password Change</Badge>;
      case 'permission_denied': return <Badge variant="destructive">Permission Denied</Badge>;
      case 'role_change': return <Badge className="bg-orange-500">Role Change</Badge>;
      case 'failed_login': return <Badge variant="destructive">Failed Login</Badge>;
      default: return <Badge variant="secondary">{eventType || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Logs
          </h1>
          <p className="text-muted-foreground">Monitor authentication and security events</p>
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
              <Label>Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="password_change">Password Change</SelectItem>
                  <SelectItem value="permission_denied">Permission Denied</SelectItem>
                  <SelectItem value="role_change">Role Change</SelectItem>
                  <SelectItem value="failed_login">Failed Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>User</Label>
              <Input placeholder="Search user..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
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
                    <TableHead>User</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.user_name || log.user_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{getEventBadge(log.event_type)}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" /> Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" /> Failed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{log.ip_address || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.device_info || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No security logs found
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
    </div>
  );
};

export default SecurityLogs;
