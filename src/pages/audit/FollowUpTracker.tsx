import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, CheckCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAFollowUps, useIAFollowUpMutations, useIADepartments } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function FollowUpTracker() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [viewFollowUp, setViewFollowUp] = useState<any>(null);
  const [updateFollowUp, setUpdateFollowUp] = useState<any>(null);
  const [updateComment, setUpdateComment] = useState('');
  const [updateStatus, setUpdateStatusVal] = useState('');

  const { data: followUps = [], isLoading } = useIAFollowUps();
  const { data: departments = [] } = useIADepartments();
  const { update } = useIAFollowUpMutations();

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date();

  const filteredFollowUps = followUps.filter((fu: any) => {
    const matchesSearch = (fu.action_required || '').toLowerCase().includes(searchTerm.toLowerCase()) || (fu.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' ? true :
      filters.status === 'Overdue' ? (fu.status !== 'Resolved' && isOverdue(fu.due_date)) :
      fu.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const overdueTasks = followUps.filter((fu: any) => fu.status !== 'Resolved' && isOverdue(fu.due_date));
  const openTasks = followUps.filter((fu: any) => fu.status === 'Open');
  const inProgressTasks = followUps.filter((fu: any) => fu.status === 'In Progress');
  const resolvedTasks = followUps.filter((fu: any) => fu.status === 'Resolved');

  const handleUpdateSubmit = () => {
    if (!updateFollowUp) return;
    update.mutate({
      id: updateFollowUp.id,
      status: updateStatus || updateFollowUp.status,
      ...(updateStatus === 'Resolved' ? { resolved_date: new Date().toISOString() } : {}),
    });
    setUpdateFollowUp(null);
    setUpdateComment('');
  };

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' }, { value: 'Open', label: 'Open' }, { value: 'In Progress', label: 'In Progress' },
      { value: 'Resolved', label: 'Resolved' }, { value: 'Overdue', label: 'Overdue' },
    ]},
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'action_required', header: 'Action Required', render: (fu) => (
      <div><div className="font-medium">{fu.action_required}</div>{fu.description && <div className="text-xs text-muted-foreground">{fu.description}</div>}</div>
    )},
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'due_date', header: 'Due Date', render: (fu) => (
      <div className={isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'text-destructive font-medium' : ''}>
        {fu.due_date ? new Date(fu.due_date).toLocaleDateString() : '-'}
        {isOverdue(fu.due_date) && fu.status !== 'Resolved' && <div className="text-xs text-destructive font-semibold">OVERDUE</div>}
      </div>
    )},
    { key: 'status', header: 'Status', render: (fu) => <StatusBadge status={isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'Overdue' : fu.status} /> },
    { key: 'priority', header: 'Priority', render: (fu) => <StatusBadge status={fu.priority || 'Medium'} /> },
  ];

  const statCards = [
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'In Progress', value: inProgressTasks.length, icon: Clock, color: 'text-orange-600' },
    { label: 'Open', value: openTasks.length, icon: Clock, color: 'text-blue-600' },
    { label: 'Resolved', value: resolvedTasks.length, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <PageShell
      title="Follow-Up Tracker"
      subtitle="Track corrective actions and follow-ups from findings"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Follow-Up Tracker' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('manage_audit_followups')}
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search actions or responsible person..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredFollowUps}
            emptyMessage="No follow-up actions found"
            rowClassName={(fu) => isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'bg-destructive/5' : ''}
            renderActions={(fu) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewFollowUp(fu)}><Eye className="h-4 w-4" /></Button>
                {fu.status !== 'Resolved' && (
                  <Select defaultValue={fu.status} onValueChange={v => { update.mutate({ id: fu.id, status: v, ...(v === 'Resolved' ? { resolved_date: new Date().toISOString() } : {}) }); }}>
                    <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* View Follow-Up */}
      <EntityModal open={!!viewFollowUp} onOpenChange={() => setViewFollowUp(null)} title="Follow-Up Details" mode="view">
        {viewFollowUp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Action Required</Label><p className="font-medium">{viewFollowUp.action_required}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewFollowUp.status} /></div></div>
              <div><Label className="text-muted-foreground">Responsible</Label><p>{viewFollowUp.responsible_person || '-'}</p></div>
              <div><Label className="text-muted-foreground">Due Date</Label><p>{viewFollowUp.due_date ? new Date(viewFollowUp.due_date).toLocaleDateString() : '-'}</p></div>
              <div><Label className="text-muted-foreground">Priority</Label><div className="mt-1"><StatusBadge status={viewFollowUp.priority || 'Medium'} /></div></div>
            </div>
            {viewFollowUp.description && <div><Label className="text-muted-foreground">Description</Label><p>{viewFollowUp.description}</p></div>}
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
