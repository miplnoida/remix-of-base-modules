import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPin, User, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAActivities, useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { ActivityScheduleForm } from '@/components/audit/ActivityScheduleForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageShell, FilterBar, DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

export default function ActivityCalendar() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<Record<string, string>>({ auditor: 'all', status: 'all' });
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const { data: activities = [], isLoading } = useIAActivities();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();

  const filteredActivities = activities.filter((a: any) => {
    const matchesAuditor = filters.auditor === 'all' || a.auditor_id === filters.auditor;
    const matchesStatus = filters.status === 'all' || a.status === filters.status;
    return matchesAuditor && matchesStatus;
  });

  const todaysActivities = filteredActivities.filter((a: any) => a.scheduled_date && new Date(a.scheduled_date).toDateString() === new Date().toDateString());
  const upcomingActivities = filteredActivities.filter((a: any) => {
    if (!a.scheduled_date) return false;
    const d = new Date(a.scheduled_date);
    const today = new Date();
    const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
    return d > today && d <= nextWeek;
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Activity', render: (row) => <div><div className="font-medium">{row.title}</div><div className="text-sm text-muted-foreground">{row.description}</div></div> },
    { key: 'activity_type', header: 'Type' },
    { key: 'scheduled_date', header: 'Date', render: (row) => row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString() : '-' },
    { key: 'auditor_id', header: 'Auditor', render: (row) => auditors.find((a: any) => a.id === row.auditor_id)?.name || '-' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const filterFields = [
    { key: 'auditor', label: 'Auditor', type: 'select' as const, options: [{ value: 'all', label: 'All Auditors' }, ...auditors.map((a: any) => ({ value: a.id, label: a.name }))] },
    { key: 'status', label: 'Status', type: 'select' as const, options: [{ value: 'all', label: 'All Statuses' }, { value: 'Planned', label: 'Planned' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }] },
  ];

  return (
    <PageShell
      title="Activity Calendar"
      subtitle="Schedule and manage audit activities"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Activity Calendar' }]}
      isLoading={isLoading}
      actions={hasPermission('execute_audit_activities') ? <Button onClick={() => setIsScheduleDialogOpen(!isScheduleDialogOpen)}><Plus className="w-4 h-4 mr-2" />Schedule Activity</Button> : undefined}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center"><CalendarDays className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">Today's Activities</p><p className="text-2xl font-bold">{todaysActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><Clock className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">This Week</p><p className="text-2xl font-bold">{upcomingActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><User className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">In Progress</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'In Progress').length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><MapPin className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">Completed</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'Completed').length}</p></div></div></CardContent></Card>
      </div>

      <FilterBar
        filters={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ auditor: 'all', status: 'all' })}
      />

      <DataTable columns={columns} data={filteredActivities} emptyMessage="No activities found." />

      {!isMobile && isScheduleDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule New Activity</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsScheduleDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent><ActivityScheduleForm onClose={() => setIsScheduleDialogOpen(false)} /></CardContent>
        </Card>
      )}
    </PageShell>
  );
}
