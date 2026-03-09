import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ClipboardCheck, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAQualityReviews, useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIAAuditors } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const REVIEW_TYPES = ['Post-Engagement', 'In-Progress', 'Peer Review', 'External'];
const RATINGS = ['Excellent', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory'];
const DISPOSITIONS = ['Pending', 'Accepted', 'Rework Required', 'Closed'];
const emptyForm = { engagement_id: '', reviewer_id: '', review_date: new Date().toISOString().slice(0, 10), review_type: 'Post-Engagement', quality_rating: 'Satisfactory', observations: '', required_rework: false, final_disposition: 'Pending' };

export default function QualityReview() {
  const { data = [], isLoading, isError, create, update } = useIAQualityReviews();
  const { data: engagements = [] } = useIAEngagements();
  const { data: auditors = [] } = useIAAuditors();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ rating: 'all', disposition: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const getEngagementName = (id: string) => engagements?.find((e: any) => e.id === id)?.engagement_name || id;
  const getAuditorName = (id: string) => auditors?.find((a: any) => a.id === id)?.name || id;

  const filtered = data.filter((r: any) => {
    const engName = getEngagementName(r.engagement_id);
    const revName = getAuditorName(r.reviewer_id);
    return (!searchTerm || engName.toLowerCase().includes(searchTerm.toLowerCase()) || revName.toLowerCase().includes(searchTerm.toLowerCase())) && (filters.rating === 'all' || r.quality_rating === filters.rating) && (filters.disposition === 'all' || r.final_disposition === filters.disposition);
  });
  const stats = { total: data.length, excellent: data.filter((d: any) => d.quality_rating === 'Excellent' || d.quality_rating === 'Satisfactory').length, rework: data.filter((d: any) => d.required_rework).length, pending: data.filter((d: any) => d.final_disposition === 'Pending').length };

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => { setForm({ engagement_id: r.engagement_id || '', reviewer_id: r.reviewer_id || '', review_date: r.review_date || '', review_type: r.review_type || 'Post-Engagement', quality_rating: r.quality_rating || 'Satisfactory', observations: r.observations || '', required_rework: r.required_rework || false, final_disposition: r.final_disposition || 'Pending' }); setModalState({ mode: 'edit', record: r }); };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };
  const handleSave = () => {
    const payload = { ...form, engagement_id: form.engagement_id || null, reviewer_id: form.reviewer_id || null };
    if (modalState.mode === 'create') create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    else if (modalState.mode === 'edit' && modalState.record) update.mutate({ id: modalState.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'review_date', header: 'Date' },
    { key: 'engagement_id', header: 'Engagement', render: (r) => r.engagement_id ? getEngagementName(r.engagement_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'review_type', header: 'Type' },
    { key: 'reviewer_id', header: 'Reviewer', render: (r) => r.reviewer_id ? getAuditorName(r.reviewer_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'quality_rating', header: 'Rating', render: (r) => <StatusBadge status={r.quality_rating} /> },
    { key: 'final_disposition', header: 'Disposition', render: (r) => <StatusBadge status={r.final_disposition} /> },
  ];
  const filterFields: StandardFilterField[] = [
    { key: 'rating', label: 'Rating', type: 'select', options: [{ label: 'All', value: 'all' }, ...RATINGS.map(r => ({ label: r, value: r }))] },
    { key: 'disposition', label: 'Disposition', type: 'select', options: [{ label: 'All', value: 'all' }, ...DISPOSITIONS.map(d => ({ label: d, value: d }))] },
  ];
  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Quality Assurance Review" subtitle="Independent review of completed audits before plan closeout"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Quality Review' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Review</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Reviews" value={stats.total} icon={ClipboardCheck} variant="info" />
        <MetricCard title="Satisfactory+" value={stats.excellent} icon={Star} variant="success" />
        <MetricCard title="Rework Required" value={stats.rework} icon={AlertTriangle} variant="error" />
        <MetricCard title="Pending" value={stats.pending} icon={CheckCircle} variant="warning" />
      </div>
      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search reviews..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ rating: 'all', disposition: 'all' }); }} />
      </CardContent></Card>
      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onView={openView}
          renderActions={(row) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>} />
      </CardContent></Card>
      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'New Quality Review' : modalState.mode === 'edit' ? 'Edit Review' : 'View Review'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Engagement</Label>
              <Select value={form.engagement_id} onValueChange={v => setForm(f => ({ ...f, engagement_id: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select engagement" /></SelectTrigger>
                <SelectContent>{engagements.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.engagement_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Review Date</Label><Input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Review Type</Label><Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))} disabled={isReadOnly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REVIEW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Quality Rating</Label><Select value={form.quality_rating} onValueChange={v => setForm(f => ({ ...f, quality_rating: v }))} disabled={isReadOnly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Reviewer</Label>
            <Select value={form.reviewer_id} onValueChange={v => setForm(f => ({ ...f, reviewer_id: v }))} disabled={isReadOnly}>
              <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
              <SelectContent>{(auditors || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Observations</Label><Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Disposition</Label><Select value={form.final_disposition} onValueChange={v => setForm(f => ({ ...f, final_disposition: v }))} disabled={isReadOnly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DISPOSITIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}