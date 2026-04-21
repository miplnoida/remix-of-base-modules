import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditManagementForm } from '@/components/compliance/AuditManagementForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Users, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  COMPLETED: 'default',
  IN_PROGRESS: 'secondary',
  SCHEDULED: 'outline',
  CANCELLED: 'destructive',
};

const AuditManagement = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['compliance-audit-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspections')
        .select('id, inspection_number, employer_id, employer_name, inspection_type, scheduled_date, status, inspector_name, findings_summary')
        .order('scheduled_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return inspections.filter((a: any) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (typeFilter !== 'all' && a.inspection_type !== typeFilter) return false;
      if (fromDate && a.scheduled_date && a.scheduled_date < fromDate) return false;
      if (toDate && a.scheduled_date && a.scheduled_date > toDate) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.employer_name || '').toLowerCase().includes(q) ||
          (a.inspection_number || '').toLowerCase().includes(q) ||
          (a.employer_id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inspections, statusFilter, typeFilter, fromDate, toDate, search]);

  const metrics = useMemo(() => ([
    { label: 'Scheduled Audits', value: inspections.filter((a: any) => a.status === 'SCHEDULED').length, icon: Calendar },
    { label: 'In Progress', value: inspections.filter((a: any) => a.status === 'IN_PROGRESS').length, icon: FileText },
    { label: 'Completed', value: inspections.filter((a: any) => a.status === 'COMPLETED').length, icon: Users },
    { label: 'Cancelled', value: inspections.filter((a: any) => a.status === 'CANCELLED').length, icon: AlertTriangle },
  ]), [inspections]);

  const types = useMemo(() => Array.from(new Set(inspections.map((a: any) => a.inspection_type).filter(Boolean))), [inspections]);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/compliance/dashboard")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />Back to Compliance
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Compliance & Audit</span>
                <span>/</span>
                <span className="text-foreground font-medium">Audit Management</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Audit Management</h1>
          <p className="text-muted-foreground">Schedule, conduct, and track compliance audits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '—' : metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule">Audit Schedule</TabsTrigger>
            <TabsTrigger value="create">Create Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Schedule</CardTitle>
                <CardDescription>View and manage all scheduled audits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Search by employer, ID or audit #"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {types.map((t: any) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    {inspections.length === 0 ? 'No audits on file' : 'No audits match the selected filters'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Audit #</TableHead>
                          <TableHead>Employer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Inspector</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((audit: any) => (
                          <TableRow key={audit.id}>
                            <TableCell className="font-mono text-xs">{audit.inspection_number}</TableCell>
                            <TableCell className="font-medium">
                              <div>{audit.employer_name}</div>
                              <div className="text-xs text-muted-foreground">{audit.employer_id}</div>
                            </TableCell>
                            <TableCell>{audit.inspection_type || '—'}</TableCell>
                            <TableCell>{audit.scheduled_date || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_VARIANTS[audit.status] || 'outline'}>{audit.status}</Badge>
                            </TableCell>
                            <TableCell>{audit.inspector_name || '—'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/compliance/field/audit/${audit.id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <AuditManagementForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuditManagement;
