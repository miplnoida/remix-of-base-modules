import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAControlTests } from '@/hooks/useAuditDataPhase2';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { EngagementFilterBanner } from '@/components/audit/EngagementFilterBanner';

const RESULTS = ['Pass', 'Fail', 'Needs Improvement', 'Not Tested'];
const emptyForm = { test_date: new Date().toISOString().slice(0, 10), tested_by: '', sample_size: 0, exceptions_found: 0, result: 'Not Tested', remarks: '' };

export default function ControlTesting() {
  const { data = [], isLoading, isError, create, update } = useIAControlTests();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchParams] = useSearchParams();
  const engagementIdFilter = searchParams.get('engagement_id');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ result: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const matchesEngagement = !engagementIdFilter || r.engagement_id === engagementIdFilter;
    return matchesEngagement && (!s || r.tested_by?.toLowerCase().includes(s) || r.remarks?.toLowerCase().includes(s)) && (filters.result === 'all' || r.result === filters.result);
  });

  const stats = { total: data.length, pass: data.filter((d: any) => d.result === 'Pass').length, fail: data.filter((d: any) => d.result === 'Fail').length, pending: data.filter((d: any) => d.result === 'Not Tested').length };
  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => { setForm({ test_date: r.test_date || '', tested_by: r.tested_by || '', sample_size: r.sample_size || 0, exceptions_found: r.exceptions_found || 0, result: r.result || 'Not Tested', remarks: r.remarks || '' }); setModalState({ mode: 'edit', record: r }); };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };
  const handleSave = () => {
    if (modalState.mode === 'create') create.mutate({ ...form, engagement_id: engagementIdFilter || null, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    else if (modalState.mode === 'edit' && modalState.record) update.mutate({ id: modalState.record.id, ...form, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'test_date', header: 'Test Date' }, { key: 'tested_by', header: 'Tested By' },
    { key: 'sample_size', header: 'Sample Size' }, { key: 'exceptions_found', header: 'Exceptions' },
    { key: 'result', header: 'Result', render: (r) => <StatusBadge status={r.result} /> },
  ];
  const filterFields: StandardFilterField[] = [{ key: 'result', label: 'Result', type: 'select', options: [{ label: 'All', value: 'all' }, ...RESULTS.map(r => ({ label: r, value: r }))] }];
  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Control Testing" subtitle="Test and evaluate control effectiveness"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Control Testing' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Test</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>
      <EngagementFilterBanner />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Tests" value={stats.total} icon={TestTube} variant="info" />
        <MetricCard title="Passed" value={stats.pass} icon={CheckCircle} variant="success" />
        <MetricCard title="Failed" value={stats.fail} icon={XCircle} variant="error" />
        <MetricCard title="Pending" value={stats.pending} icon={AlertTriangle} variant="warning" />
      </div>
      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search tests..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ result: 'all' }); }} />
      </CardContent></Card>
      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onView={openView}
          renderActions={(row) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>} />
      </CardContent></Card>
      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'New Control Test' : modalState.mode === 'edit' ? 'Edit Test' : 'View Test'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Test Date</Label><Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Tested By</Label><Input value={form.tested_by} onChange={e => setForm(f => ({ ...f, tested_by: e.target.value }))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Sample Size</Label><Input type="number" value={form.sample_size} onChange={e => setForm(f => ({ ...f, sample_size: Number(e.target.value) }))} disabled={isReadOnly} /></div>
            <div><Label>Exceptions</Label><Input type="number" value={form.exceptions_found} onChange={e => setForm(f => ({ ...f, exceptions_found: Number(e.target.value) }))} disabled={isReadOnly} /></div>
            <div><Label>Result</Label><Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))} disabled={isReadOnly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
