import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageSquare, Send } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAAuditQueries, useIAAuditQueryMutations } from '@/hooks/useAuditQueries';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments } from '@/hooks/useAuditData';
import { useUserCode } from '@/hooks/useUserCode';
import { formatDateForDisplay } from '@/lib/format-config';
import { EngagementFilterBanner, useEngagementFilter } from '@/components/audit/EngagementFilterBanner';

export default function AuditQueries() {
  const { userCode } = useUserCode();
  const { engagementId } = useEngagementFilter();
  const { data: queries = [], isLoading } = useIAAuditQueries(engagementId || undefined);
  const { create, update } = useIAAuditQueryMutations();
  const { data: engagements = [] } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [respondItem, setRespondItem] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [form, setForm] = useState({ engagement_id: '', department_id: '', question: '', requested_document: '' });

  const engagementMap = useMemo(() => Object.fromEntries((engagements || []).map((e: any) => [e.id, e])), [engagements]);
  const deptMap = useMemo(() => Object.fromEntries((departments || []).map((d: any) => [d.id, d])), [departments]);

  const filteredQueries = useMemo(() => {
    return queries.filter((q: any) => {
      const matchesSearch = (q.question || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || q.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [queries, searchTerm, filters]);

  const handleCreate = () => {
    if (!form.question || !form.engagement_id) return;
    create.mutate({
      engagement_id: form.engagement_id,
      department_id: form.department_id || undefined,
      question: form.question,
      requested_document: form.requested_document || undefined,
      requested_by: userCode || undefined,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setForm({ engagement_id: '', department_id: '', question: '', requested_document: '' });
      },
    });
  };

  const handleRespond = () => {
    if (!respondItem || !responseText) return;
    update.mutate({
      id: respondItem.id,
      response: responseText,
      response_by: userCode || null,
      response_date: new Date().toISOString(),
      status: 'Responded',
    }, {
      onSuccess: () => { setRespondItem(null); setResponseText(''); },
    });
  };

  const handleClose = (queryItem: any) => {
    update.mutate({ id: queryItem.id, status: 'Closed' });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'engagement', header: 'Audit', render: (r) => engagementMap[r.engagement_id]?.engagement_name || r.engagement_id?.slice(0, 8) },
    { key: 'department', header: 'Department', render: (r) => deptMap[r.department_id]?.name || '—' },
    { key: 'question', header: 'Question', className: 'max-w-xs truncate' },
    { key: 'requested_document', header: 'Requested Document', render: (r) => r.requested_document || '—' },
    { key: 'requested_by', header: 'Requested By' },
    { key: 'requested_date', header: 'Date', render: (r) => r.requested_date ? formatDateForDisplay(r.requested_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Pending'} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'Pending', label: 'Pending' }, { value: 'Responded', label: 'Responded' }, { value: 'Closed', label: 'Closed' }] },
  ];

  return (
    <PageShell
      title="Audit Queries"
      subtitle="Communication between audit team and departments"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Queries' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Query</Button>}
    >
      <EngagementFilterBanner />

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search queries..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredQueries}
            emptyMessage="No audit queries found."
            onView={(r) => setViewItem(r)}
            renderActions={(row) => (
              <div className="flex gap-1">
                {row.status === 'Pending' && (
                  <Button size="sm" variant="outline" onClick={() => { setRespondItem(row); setResponseText(''); }}>
                    <MessageSquare className="w-3 h-3 mr-1" />Respond
                  </Button>
                )}
                {row.status === 'Responded' && (
                  <Button size="sm" variant="outline" onClick={() => handleClose(row)}>Close</Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create Query Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={setIsCreateOpen} title="New Audit Query" mode="create" onSave={handleCreate} saveLabel="Send Query" isSaving={create.isPending}>
        <div className="space-y-4">
          <div>
            <Label>Audit Engagement *</Label>
            <Select value={form.engagement_id} onValueChange={v => {
              const eng = engagementMap[v];
              setForm(f => ({ ...f, engagement_id: v, department_id: eng?.department_id || '' }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select audit" /></SelectTrigger>
              <SelectContent>{(engagements || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.engagement_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Auto-populated from audit" /></SelectTrigger>
              <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Question *</Label><Textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter your question for the department..." rows={3} /></div>
          <div><Label>Requested Document</Label><Input value={form.requested_document} onChange={e => setForm(f => ({ ...f, requested_document: e.target.value }))} placeholder="e.g. Policy manual, Payroll records" /></div>
        </div>
      </EntityModal>

      {/* View Query */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Query Details" mode="view">
        {viewItem && (
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Audit</Label><p className="font-medium">{engagementMap[viewItem.engagement_id]?.engagement_name || '—'}</p></div>
            <div><Label className="text-muted-foreground">Department</Label><p>{deptMap[viewItem.department_id]?.name || '—'}</p></div>
            <div><Label className="text-muted-foreground">Question</Label><p className="whitespace-pre-wrap">{viewItem.question}</p></div>
            {viewItem.requested_document && <div><Label className="text-muted-foreground">Requested Document</Label><p>{viewItem.requested_document}</p></div>}
            <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
            {viewItem.response && (
              <div className="border-t pt-3 mt-3">
                <Label className="text-muted-foreground">Response</Label>
                <p className="whitespace-pre-wrap">{viewItem.response}</p>
                <p className="text-xs text-muted-foreground mt-1">By {viewItem.response_by || '—'} on {viewItem.response_date ? formatDateForDisplay(viewItem.response_date) : '—'}</p>
              </div>
            )}
          </div>
        )}
      </EntityModal>

      {/* Respond Modal */}
      <EntityModal open={!!respondItem} onOpenChange={() => setRespondItem(null)} title="Respond to Query" mode="edit" saveLabel="Submit Response" onSave={handleRespond} isSaving={update.isPending}>
        {respondItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Question</Label><p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{respondItem.question}</p></div>
            {respondItem.requested_document && <div><Label className="text-muted-foreground">Requested Document</Label><p className="text-sm">{respondItem.requested_document}</p></div>}
            <div><Label>Response *</Label><Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Enter your response..." rows={4} /></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
