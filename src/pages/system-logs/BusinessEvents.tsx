import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Download, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface BusinessEvent {
  id: string;
  timestamp: string;
  correlation_id: string | null;
  user_id: string | null;
  module: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  performed_by: string | null;
  description: string | null;
}

const PAGE_SIZE = 20;

const BusinessEvents: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['business-events', page, dateFrom, dateTo, moduleFilter, userFilter, entityTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('system_business_events')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      if (moduleFilter !== 'all') query = query.eq('module', moduleFilter);
      if (userFilter) query = query.eq('user_id', userFilter);
      if (entityTypeFilter) query = query.ilike('entity_type', `%${entityTypeFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { events: data as BusinessEvent[], count: count || 0 };
    }
  });

  const getActionBadge = (action: string | null) => {
    switch (action?.toLowerCase()) {
      case 'create': return <Badge className="bg-green-500">Create</Badge>;
      case 'update': return <Badge className="bg-blue-500">Update</Badge>;
      case 'delete': return <Badge variant="destructive">Delete</Badge>;
      case 'approve': return <Badge className="bg-purple-500">Approve</Badge>;
      case 'reject': return <Badge className="bg-orange-500">Reject</Badge>;
      default: return <Badge variant="secondary">{action || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Business Events
          </h1>
          <p className="text-muted-foreground">Track business operations and actions</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="roles">Roles</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="claims">Claims</SelectItem>
                  <SelectItem value="employers">Employers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity Type</Label>
              <Input placeholder="Entity type..." value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} />
            </div>
            <div>
              <Label>User ID</Label>
              <Input placeholder="User ID..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
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
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Module</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>{event.entity_type || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{event.entity_id?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{getActionBadge(event.action)}</TableCell>
                      <TableCell>{event.performed_by || '-'}</TableCell>
                      <TableCell>{event.module || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.events || data.events.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No business events found
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

export default BusinessEvents;
