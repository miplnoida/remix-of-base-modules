import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useIAManagementResponses, useIAManagementResponseMutations, useIAFindings } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { useState } from 'react';

export default function ManagementResponses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const { data: responses = [], isLoading } = useIAManagementResponses();
  const { data: findings = [] } = useIAFindings();
  const { update } = useIAManagementResponseMutations();
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  const handleAccept = (id: string) => setConfirmAction({ id, action: 'accept' });
  const handleRevise = (id: string) => setConfirmAction({ id, action: 'revise' });

  const executeAction = () => {
    if (!confirmAction) return;
    const status = confirmAction.action === 'accept' ? 'Accepted' : 'Draft';
    update.mutate({ id: confirmAction.id, status });
    setConfirmAction(null);
  };

  const filteredResponses = responses.filter((r: any) => {
    const matchesStatus = filters.status === 'all' || r.status === filters.status;
    const finding = findings.find((f: any) => f.id === r.finding_id);
    const matchesSearch = !searchTerm || (finding?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Submitted', label: 'Submitted' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Draft', label: 'Draft' }] },
  ];

  const statCards = [
    { label: 'Awaiting Response', value: findings.filter((f: any) => f.status === 'For Mgmt Response').length, icon: Clock, color: 'text-orange-600' },
    { label: 'Submitted', value: responses.filter((r: any) => r.status === 'Submitted').length, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Accepted', value: responses.filter((r: any) => r.status === 'Accepted').length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Total', value: responses.length, icon: AlertCircle, color: 'text-muted-foreground' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => {
      const finding = findings.find((f: any) => f.id === r.finding_id);
      return <span className="font-medium">{finding?.title || '-'}</span>;
    }},
    { key: 'response_text', header: 'Response', className: 'max-w-md', render: (r) => <p className="text-sm truncate">{r.response_text}</p> },
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ? new Date(r.target_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageShell
      title="Management Responses"
      subtitle="Department heads respond to audit findings"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Management Responses' }]}
      isLoading={isLoading}
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
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by finding or responsible person..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredResponses}
            emptyMessage="No management responses found"
            renderActions={(response) => response.status === 'Submitted' ? (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleAccept(response.id)}>Accept</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleRevise(response.id)}>Revise</Button>
              </div>
            ) : null}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.action === 'accept' ? 'Accept Response' : 'Request Revision'}
        description={confirmAction?.action === 'accept' ? 'Are you sure you want to accept this management response?' : 'This will send the response back for revision. Continue?'}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={executeAction}
        isLoading={update.isPending}
      />
    </PageShell>
  );
}
