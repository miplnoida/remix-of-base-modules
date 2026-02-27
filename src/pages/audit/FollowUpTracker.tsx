import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAFollowUps, useIAFollowUpMutations } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { Link } from 'react-router-dom';

export default function FollowUpTracker() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });

  const { data: followUps = [], isLoading } = useIAFollowUps();
  const { update } = useIAFollowUpMutations();

  const filteredFollowUps = followUps.filter((fu: any) => {
    const matchesSearch = (fu.action_required || '').toLowerCase().includes(searchTerm.toLowerCase()) || (fu.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || fu.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date();

  const handleUpdate = (id: string, status: string) => {
    update.mutate({ id, status, ...(status === 'Resolved' ? { resolved_date: new Date().toISOString() } : {}) });
  };

  const overdueTasks = filteredFollowUps.filter((fu: any) => fu.status !== 'Resolved' && isOverdue(fu.due_date));

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'Open', label: 'Open' },
      { value: 'In Progress', label: 'In Progress' },
      { value: 'Resolved', label: 'Resolved' },
    ]},
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'action_required', header: 'Action Required', render: (fu) => (
      <div><div className="font-medium">{fu.action_required}</div><div className="text-sm text-muted-foreground">{fu.description}</div></div>
    )},
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'due_date', header: 'Due Date', render: (fu) => (
      <div className={isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'text-destructive font-medium' : ''}>
        {fu.due_date ? new Date(fu.due_date).toLocaleDateString() : '-'}
        {isOverdue(fu.due_date) && fu.status !== 'Resolved' && <div className="text-xs text-destructive">OVERDUE</div>}
      </div>
    )},
    { key: 'status', header: 'Status', render: (fu) => <StatusBadge status={fu.status} /> },
    { key: 'priority', header: 'Priority', render: (fu) => <StatusBadge status={fu.priority || 'Medium'} /> },
  ];

  const statCards = [
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'In Progress', value: filteredFollowUps.filter((fu: any) => fu.status === 'In Progress').length, icon: Clock, color: 'text-orange-600' },
    { label: 'Open', value: filteredFollowUps.filter((fu: any) => fu.status === 'Open').length, icon: Clock, color: 'text-blue-600' },
    { label: 'Resolved', value: filteredFollowUps.filter((fu: any) => fu.status === 'Resolved').length, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <PageShell
      title="Follow-Up Tracker"
      subtitle="Track corrective actions and follow-ups"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Follow-Up Tracker' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('manage_audit_followups')}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <div className="ml-2">
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search actions or responsible person..." />
            <FilterBar
              filters={filterFields}
              values={filters}
              onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              onReset={() => setFilters({ status: 'all' })}
            />
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
              <Select defaultValue={fu.status} onValueChange={v => handleUpdate(fu.id, v)}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
