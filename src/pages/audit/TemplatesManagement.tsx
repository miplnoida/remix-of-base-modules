import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useIADocumentTemplates, useIADocumentTemplateMutations } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { Badge } from '@/components/ui/badge';

const TEMPLATE_TYPES = ['Letter', 'Report', 'Notice', 'Memo', 'Certificate'];
const TEMPLATE_CATEGORIES = ['Engagement', 'Notification', 'Report', 'Follow-Up', 'General'];

export default function TemplatesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ type: 'all', category: 'all' });
  const { data: templates = [], isLoading } = useIADocumentTemplates();
  const { create, update } = useIADocumentTemplateMutations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const emptyForm = { name: '', type: '', category: '', content: '', merge_fields: '' };
  const [formData, setFormData] = useState(emptyForm);
  const resetForm = () => setFormData(emptyForm);

  const filteredTemplates = templates.filter((t: any) => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filters.type === 'all' || t.type === filters.type;
    const matchesCategory = filters.category === 'all' || t.category === filters.category;
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleCreate = () => {
    if (!formData.name || !formData.type) return;
    const mergeFields = formData.merge_fields ? formData.merge_fields.split(',').map(s => s.trim()).filter(Boolean) : [];
    create.mutate({ name: formData.name, type: formData.type, category: formData.category || null, content: formData.content || null, merge_fields: mergeFields.length > 0 ? mergeFields : null }, {
      onSuccess: () => { setIsCreateOpen(false); resetForm(); }
    });
  };

  const handleEdit = () => {
    if (!editItem || !formData.name || !formData.type) return;
    const mergeFields = formData.merge_fields ? formData.merge_fields.split(',').map(s => s.trim()).filter(Boolean) : [];
    update.mutate({ id: editItem.id, name: formData.name, type: formData.type, category: formData.category || null, content: formData.content || null, merge_fields: mergeFields.length > 0 ? mergeFields : null }, {
      onSuccess: () => { setEditItem(null); resetForm(); }
    });
  };

  const openEdit = (t: any) => {
    setFormData({ name: t.name || '', type: t.type || '', category: t.category || '', content: t.content || '', merge_fields: (t.merge_fields || []).join(', ') });
    setEditItem(t);
  };

  const filterFields: StandardFilterField[] = [
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, ...TEMPLATE_TYPES.map(t => ({ value: t, label: t }))] },
    { key: 'category', label: 'Category', type: 'select', options: [{ value: 'all', label: 'All Categories' }, ...TEMPLATE_CATEGORIES.map(c => ({ value: c, label: c }))] },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Template Name', render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'type', header: 'Type', render: (t) => <Badge variant="outline">{t.type}</Badge> },
    { key: 'category', header: 'Category', render: (t) => t.category || '-' },
    { key: 'merge_fields', header: 'Merge Fields', render: (t) => (t.merge_fields || []).length > 0 ? <span className="text-xs">{(t.merge_fields || []).join(', ')}</span> : '-' },
    { key: 'updated_at', header: 'Last Updated', render: (t) => t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '-' },
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Template Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Engagement Letter" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Type *</Label>
          <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Category</Label>
          <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Content</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Template content with {{merge_fields}}..." rows={8} /></div>
      <div className="space-y-2"><Label>Merge Fields (comma-separated)</Label><Input value={formData.merge_fields} onChange={e => setFormData({...formData, merge_fields: e.target.value})} placeholder="e.g. department_name, fiscal_year, auditor_name" /></div>
    </div>
  );

  return (
    <PageShell
      title="Document Templates"
      subtitle="Manage reusable document templates for letters, reports, and notices"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Templates' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" />New Template</Button>}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search templates..."
        filters={filterFields as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ type: 'all', category: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredTemplates} emptyMessage="No templates found" onView={(t) => setViewItem(t)} onEdit={(t) => openEdit(t)} />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Document Template" mode="create" onSave={handleCreate} saveLabel="Create Template" isSaving={create.isPending} maxWidth="max-w-3xl">
        {formFields}
      </EntityModal>

      {/* Edit Modal */}
      <EntityModal open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); resetForm(); } }} title="Edit Template" mode="edit" onSave={handleEdit} saveLabel="Save Changes" isSaving={update.isPending} maxWidth="max-w-3xl">
        {formFields}
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Template Details" mode="view" maxWidth="max-w-3xl">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{viewItem.name}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Type</Label><p><Badge variant="outline">{viewItem.type}</Badge></p></div>
              <div><Label className="text-muted-foreground">Category</Label><p>{viewItem.category || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Content</Label><pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded mt-1 max-h-64 overflow-auto">{viewItem.content || '-'}</pre></div>
            <div><Label className="text-muted-foreground">Merge Fields</Label><p>{(viewItem.merge_fields || []).join(', ') || '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
