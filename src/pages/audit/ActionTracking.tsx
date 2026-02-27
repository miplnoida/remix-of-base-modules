import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useIAActionTracking, useIAActionTrackingMutations, useIAFindings } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function ActionTracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const { data: actions = [], isLoading } = useIAActionTracking();
  const { data: findings = [] } = useIAFindings();
  const { update } = useIAActionTrackingMutations();

  const filteredActions = actions.filter((a: any) => {
    const matchesStatus = filters.status === 'all' || a.status === filters.status;
    const matchesSearch = !searchTerm || (a.action_description || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update.mutate({ id, status: newStatus, ...(newStatus === 'Verified' ? { verified_date: new Date().toISOString() } : {}) });
  };

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'Not Started', label: 'Not Started' },
      { value: 'In Progress', label: 'In Progress' },
      { value: 'Implemented', label: 'Implemented' },
      { value: 'Verified', label: 'Verified' },
      { value: 'Closed', label: 'Closed' },
    ]},
  ];

  const statCards = [
    { label: 'Not Started', value: actions.filter((a: any) => a.status === 'Not Started').length, color: 'text-muted-foreground' },
    { label: 'In Progress', value: actions.filter((a: any) => a.status === 'In Progress').length, color: 'text-blue-600' },
    { label: 'Implemented', value: actions.filter((a: any) => a.status === 'Implemented').length, color: 'text-orange-600' },
    { label: 'Verified', value: actions.filter((a: any) => a.status === 'Verified').length, color: 'text-green-600' },
    { label: 'Closed', value: actions.filter((a: any) => a.status === 'Closed').length, color: 'text-purple-600' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (a) => {
      const finding = findings.find((f: any) => f.id === a.finding_id);
      return <span className="font-medium">{finding?.title || '-'}</span>;
    }},
    { key: 'action_description', header: 'Action', className: 'max-w-md', render: (a) => <span className="text-sm">{a.action_description}</span> },
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'target_date', header: 'Target Date', render: (a) => a.target_date ? new Date(a.target_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <PageShell
      title="Action Tracking"
      subtitle="Track corrective actions"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Action Tracking' }]}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search actions..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Corrective Actions ({filteredActions.length})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredActions}
            emptyMessage="No corrective actions found"
            renderActions={(action) => (
              <Select defaultValue={action.status} onValueChange={v => handleUpdateStatus(action.id, v)}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Not Started','In Progress','Implemented','Verified','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
