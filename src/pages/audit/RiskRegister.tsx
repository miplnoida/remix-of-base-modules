import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield, AlertTriangle, Eye, Edit, Trash2, Link2, Clock } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTablePagination } from '@/hooks/useTablePagination';
import { useActiveAuditUniverse } from '@/hooks/useAuditUniverse';
import {
  useRiskRegister, useRiskRegisterMutations,
  useRiskMitigationActions, useRiskMitigationMutations,
  useRiskReviews, useRiskReviewMutations,
  useDuplicateRiskCheck,
  RISK_CATEGORIES, RISK_STATUSES, CONTROL_EFFECTIVENESS,
  MITIGATION_STATUSES, MITIGATION_PRIORITIES,
  calculateRiskLevel, getRiskLevelVariant,
} from '@/hooks/useRiskRegister';
import { RISK_REGISTER_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { formatDateForDisplay } from '@/lib/format-config';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const exportColumns = toExportColumns(RISK_REGISTER_SCHEMA);

const emptyRisk = {
  audit_universe_id: '',
  risk_title: '',
  risk_description: '',
  risk_category: 'Operational',
  inherent_likelihood: 3,
  inherent_impact: 3,
  residual_likelihood: 2,
  residual_impact: 2,
  control_effectiveness: 'Moderate',
  risk_owner: '',
  review_date: '',
  due_date: '',
  status: 'Open',
  fiscal_year: new Date().getFullYear().toString(),
  linked_risk_id: '',
  notes: '',
};

const emptyAction = {
  action_title: '',
  action_description: '',
  assigned_to: '',
  due_date: '',
  status: 'Planned',
  priority: 'Medium',
  evidence_notes: '',
};

export default function RiskRegister() {
  const { data: universeEntities = [] } = useActiveAuditUniverse();
  const [entityFilter, setEntityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: risks = [], isLoading } = useRiskRegister();
  const { create, update, remove } = useRiskRegisterMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRisk);
  const [detailRisk, setDetailRisk] = useState<any>(null);

  // Duplicate check
  const { data: dupes = [] } = useDuplicateRiskCheck(form.audit_universe_id, form.risk_title, form.risk_category);
  const showDupeWarning = !editingId && dupes.length > 0;

  const filtered = useMemo(() => {
    return risks.filter((r: any) => {
      if (entityFilter !== 'all' && r.audit_universe_id !== entityFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.risk_category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (r.risk_title?.toLowerCase().includes(s) || r.risk_owner?.toLowerCase().includes(s) || r.ia_audit_universe?.entity_name?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [risks, entityFilter, statusFilter, categoryFilter, search]);

  const { paginatedData, pagination, goToPage } = useTablePagination(filtered, 15);

  const openCount = risks.filter((r: any) => r.status === 'Open').length;
  const criticalCount = risks.filter((r: any) => r.inherent_risk_level === 'Critical' || r.residual_risk_level === 'Critical').length;

  const openCreate = () => { setForm(emptyRisk); setEditingId(null); setModalOpen(true); };
  const openEdit = (row: any) => {
    setForm({
      audit_universe_id: row.audit_universe_id || '',
      risk_title: row.risk_title || '',
      risk_description: row.risk_description || '',
      risk_category: row.risk_category || 'Operational',
      inherent_likelihood: row.inherent_likelihood || 3,
      inherent_impact: row.inherent_impact || 3,
      residual_likelihood: row.residual_likelihood || 2,
      residual_impact: row.residual_impact || 2,
      control_effectiveness: row.control_effectiveness || 'Moderate',
      risk_owner: row.risk_owner || '',
      review_date: row.review_date || '',
      due_date: row.due_date || '',
      status: row.status || 'Open',
      fiscal_year: row.fiscal_year || '',
      linked_risk_id: row.linked_risk_id || '',
      notes: row.notes || '',
    });
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.risk_title.trim() || !form.audit_universe_id) return;
    const payload = { ...form, linked_risk_id: form.linked_risk_id || null };
    if (editingId) {
      update.mutate({ id: editingId, ...payload }, { onSuccess: () => setModalOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  };

  const columns: DataTableColumn[] = [
    { key: 'risk_title', header: 'Risk Title', render: (v: string, row: any) => (
      <button className="text-left text-primary hover:underline font-medium" onClick={() => setDetailRisk(row)}>{v}</button>
    )},
    { key: 'ia_audit_universe', header: 'Entity', render: (v: any) => v?.entity_name || '—' },
    { key: 'risk_category', header: 'Category', render: (v: string) => <Badge variant="outline">{v}</Badge> },
    { key: 'inherent_risk_score', header: 'Inherent', render: (v: number, row: any) => (
      <Badge variant={getRiskLevelVariant(row.inherent_risk_level)}>{v} ({row.inherent_risk_level})</Badge>
    )},
    { key: 'residual_risk_score', header: 'Residual', render: (v: number, row: any) => (
      <Badge variant={getRiskLevelVariant(row.residual_risk_level)}>{v} ({row.residual_risk_level})</Badge>
    )},
    { key: 'risk_owner', header: 'Owner' },
    { key: 'status', header: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', header: 'Actions', render: (_: any, row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'entity', label: 'Entity', type: 'select', options: [{ label: 'All Entities', value: 'all' }, ...universeEntities.map((e: any) => ({ label: e.entity_name, value: e.id }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_STATUSES.map(s => ({ label: s, value: s }))] },
    { key: 'category', label: 'Category', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_CATEGORIES.map(c => ({ label: c, value: c }))] },
  ];

  const iScore = (form.inherent_likelihood || 0) * (form.inherent_impact || 0);
  const rScore = (form.residual_likelihood || 0) * (form.residual_impact || 0);

  return (
    <PageShell title="Risk Register" subtitle="Manage risks across the audit universe">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Risks" value={risks.length} icon={Shield} />
        <MetricCard title="Open Risks" value={openCount} icon={AlertTriangle} />
        <MetricCard title="Critical" value={criticalCount} icon={AlertTriangle} />
        <MetricCard title="Entities Covered" value={new Set(risks.map((r: any) => r.audit_universe_id)).size} icon={Eye} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Risk Register</CardTitle>
          <div className="flex gap-2">
            <ExportDropdown data={filtered.map((r: any) => ({ ...r, entity_name: r.ia_audit_universe?.entity_name || '' }))} columns={exportColumns} fileName="risk-register" title="Risk Register" />
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Risk</Button>
          </div>
        </CardHeader>
        <CardContent>
          <StandardSearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search risks..."
            filterFields={filterFields}
            filterValues={{ entity: entityFilter, status: statusFilter, category: categoryFilter }}
            onFilterChange={(k, v) => {
              if (k === 'entity') setEntityFilter(v);
              if (k === 'status') setStatusFilter(v);
              if (k === 'category') setCategoryFilter(v);
            }}
          />
          <DataTable columns={columns} data={paginatedData} isLoading={isLoading} emptyMessage="No risks found." />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE/EDIT MODAL */}
      <StandardModal open={modalOpen} onOpenChange={setModalOpen} title={editingId ? 'Edit Risk' : 'Add Risk'} size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={create.isPending || update.isPending}>{editingId ? 'Update' : 'Create'}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Entity *</Label>
            <Select value={form.audit_universe_id} onValueChange={v => setForm(f => ({ ...f, audit_universe_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select entity..." /></SelectTrigger>
              <SelectContent>{universeEntities.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.entity_name} ({e.entity_type})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Risk Title *</Label>
            <Input value={form.risk_title} onChange={e => setForm(f => ({ ...f, risk_title: e.target.value }))} />
          </div>
          {showDupeWarning && (
            <div className="md:col-span-2 p-3 border border-amber-300 bg-amber-50 dark:bg-amber-950 rounded-md">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Similar risks found on this entity:</p>
              <ul className="mt-1 space-y-1">
                {dupes.map((d: any) => (
                  <li key={d.id} className="text-sm flex items-center justify-between">
                    <span>{d.risk_title} ({d.status})</span>
                    <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, linked_risk_id: d.id }))}><Link2 className="h-3 w-3 mr-1" />Link</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.risk_description} onChange={e => setForm(f => ({ ...f, risk_description: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.risk_category} onValueChange={v => setForm(f => ({ ...f, risk_category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Control Effectiveness</Label>
            <Select value={form.control_effectiveness} onValueChange={v => setForm(f => ({ ...f, control_effectiveness: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTROL_EFFECTIVENESS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Inherent Risk */}
          <div className="space-y-2">
            <Label>Inherent Likelihood (1-5)</Label>
            <Select value={String(form.inherent_likelihood)} onValueChange={v => setForm(f => ({ ...f, inherent_likelihood: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Inherent Impact (1-5)</Label>
            <Select value={String(form.inherent_impact)} onValueChange={v => setForm(f => ({ ...f, inherent_impact: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Residual Risk */}
          <div className="space-y-2">
            <Label>Residual Likelihood (1-5)</Label>
            <Select value={String(form.residual_likelihood)} onValueChange={v => setForm(f => ({ ...f, residual_likelihood: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Residual Impact (1-5)</Label>
            <Select value={String(form.residual_impact)} onValueChange={v => setForm(f => ({ ...f, residual_impact: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Score preview */}
          <div className="md:col-span-2 flex gap-4">
            <div className="flex-1 p-3 rounded-md bg-muted text-center">
              <p className="text-xs text-muted-foreground">Inherent Risk</p>
              <Badge variant={getRiskLevelVariant(calculateRiskLevel(iScore))} className="mt-1">{iScore} — {calculateRiskLevel(iScore)}</Badge>
            </div>
            <div className="flex-1 p-3 rounded-md bg-muted text-center">
              <p className="text-xs text-muted-foreground">Residual Risk</p>
              <Badge variant={getRiskLevelVariant(calculateRiskLevel(rScore))} className="mt-1">{rScore} — {calculateRiskLevel(rScore)}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Risk Owner</Label>
            <Input value={form.risk_owner} onChange={e => setForm(f => ({ ...f, risk_owner: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Review Date</Label>
            <Input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Fiscal Year</Label>
            <Input value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Linked Risk</Label>
            <Input value={form.linked_risk_id} onChange={e => setForm(f => ({ ...f, linked_risk_id: e.target.value }))} placeholder="UUID of linked risk (optional)" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
      </StandardModal>

      {/* DETAIL PANEL */}
      {detailRisk && (
        <RiskDetailPanel risk={detailRisk} onClose={() => setDetailRisk(null)} />
      )}
    </PageShell>
  );
}

// ============= RISK DETAIL PANEL =============
function RiskDetailPanel({ risk, onClose }: { risk: any; onClose: () => void }) {
  const { data: actions = [] } = useRiskMitigationActions(risk.id);
  const { data: reviews = [] } = useRiskReviews(risk.id);
  const mitigationMut = useRiskMitigationMutations();
  const reviewMut = useRiskReviewMutations();
  const { userCode } = useAuditFields();

  const [actionForm, setActionForm] = useState({ action_title: '', action_description: '', assigned_to: '', due_date: '', status: 'Planned', priority: 'Medium', evidence_notes: '' });
  const [showActionForm, setShowActionForm] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const handleAddAction = () => {
    if (!actionForm.action_title.trim()) return;
    mitigationMut.create.mutate({ ...actionForm, risk_id: risk.id }, { onSuccess: () => { setShowActionForm(false); setActionForm({ action_title: '', action_description: '', assigned_to: '', due_date: '', status: 'Planned', priority: 'Medium', evidence_notes: '' }); } });
  };

  const handleAddReview = () => {
    if (!reviewComment.trim()) return;
    reviewMut.create.mutate({
      risk_id: risk.id,
      reviewed_by: userCode || 'SYSTEM',
      previous_risk_level: risk.residual_risk_level,
      new_risk_level: risk.residual_risk_level,
      previous_score: risk.residual_risk_score,
      new_score: risk.residual_risk_score,
      comments: reviewComment,
    }, { onSuccess: () => setReviewComment('') });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> {risk.risk_title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-muted-foreground">Entity:</span> {risk.ia_audit_universe?.entity_name || '—'}</div>
          <div><span className="text-muted-foreground">Category:</span> {risk.risk_category}</div>
          <div><span className="text-muted-foreground">Owner:</span> {risk.risk_owner || '—'}</div>
          <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={risk.status} /></div>
          <div><span className="text-muted-foreground">Inherent:</span> <Badge variant={getRiskLevelVariant(risk.inherent_risk_level)}>{risk.inherent_risk_score} ({risk.inherent_risk_level})</Badge></div>
          <div><span className="text-muted-foreground">Residual:</span> <Badge variant={getRiskLevelVariant(risk.residual_risk_level)}>{risk.residual_risk_score} ({risk.residual_risk_level})</Badge></div>
          <div><span className="text-muted-foreground">Control:</span> {risk.control_effectiveness}</div>
          <div><span className="text-muted-foreground">Fiscal Year:</span> {risk.fiscal_year || '—'}</div>
        </div>
        {risk.risk_description && <p className="text-sm mb-4">{risk.risk_description}</p>}

        <Tabs defaultValue="mitigations">
          <TabsList>
            <TabsTrigger value="mitigations">Mitigations ({actions.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mitigations" className="space-y-3">
            {actions.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{a.action_title}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{a.priority}</Badge>
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                  {a.action_description && <p className="text-xs text-muted-foreground mt-1">{a.action_description}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    <span>Assigned: {a.assigned_to || '—'}</span>
                    <span>Due: {a.due_date ? formatDateForDisplay(a.due_date) : '—'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!showActionForm ? (
              <Button variant="outline" size="sm" onClick={() => setShowActionForm(true)}><Plus className="h-3 w-3 mr-1" />Add Mitigation</Button>
            ) : (
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Title *</Label>
                      <Input value={actionForm.action_title} onChange={e => setActionForm(f => ({ ...f, action_title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Assigned To</Label>
                      <Input value={actionForm.assigned_to} onChange={e => setActionForm(f => ({ ...f, assigned_to: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={actionForm.due_date} onChange={e => setActionForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <Select value={actionForm.priority} onValueChange={v => setActionForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MITIGATION_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={actionForm.status} onValueChange={v => setActionForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MITIGATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddAction} disabled={mitigationMut.create.isPending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowActionForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 text-sm border-l-2 border-primary pl-3 py-1">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{r.comments}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reviewed_by} • {r.review_date ? formatDateForDisplay(r.review_date) : '—'}
                    {r.previous_risk_level !== r.new_risk_level && (
                      <span> • {r.previous_risk_level} → {r.new_risk_level}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add review comment..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleAddReview} disabled={reviewMut.create.isPending || !reviewComment.trim()}>Add Review</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
