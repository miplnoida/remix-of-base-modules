/**
 * Unauthorized Access Logs Tab
 * Shows all unauthorized route access attempts with filtering.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

const UnauthorizedAccessLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unauthorized-access-logs', page, dateFrom, dateTo, severityFilter, ipFilter, userFilter, moduleFilter],
    queryFn: async () => {
      let query = supabase
        .from('unauthorized_access_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
      if (ipFilter) query = query.ilike('ip_address', `%${ipFilter}%`);
      if (userFilter) query = query.ilike('user_email', `%${userFilter}%`);
      if (moduleFilter) query = query.ilike('module_name', `%${moduleFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], count: count || 0 };
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium': return <Badge className="bg-amber-500 text-white">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>IP Address</Label>
              <Input placeholder="Filter by IP..." value={ipFilter} onChange={(e) => { setIpFilter(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>User</Label>
              <Input placeholder="Filter by user..." value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>Module</Label>
              <Input placeholder="Filter by module..." value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(0); }} />
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
                    <TableHead>Severity</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">{log.route_attempted}</TableCell>
                      <TableCell>{log.module_name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.reason}</TableCell>
                      <TableCell>{log.user_email || log.user_code || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No unauthorized access attempts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(data?.count || 0) > 0 ? page * PAGE_SIZE + 1 : 0} - {Math.min((page + 1) * PAGE_SIZE, data?.count || 0)} of {data?.count || 0}
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

export default UnauthorizedAccessLogs;
