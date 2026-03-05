import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';
import { useIAEvidence, useIAEvidenceMutations, useIAActivities } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { Badge } from '@/components/ui/badge';

export default function EvidenceManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ type: 'all' });
  const { data: evidenceList = [], isLoading } = useIAEvidence();
  const { data: activities = [] } = useIAActivities();
  const { create } = useIAEvidenceMutations();
  const [formData, setFormData] = useState({ activity_id: '', evidence_type: '', title: '', description: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);

  const filteredEvidence = evidenceList.filter((ev: any) => {
    const matchesSearch = (ev.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (ev.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filters.type === 'all' || ev.evidence_type === filters.type;
    return matchesSearch && matchesType;
  });

  const handleUpload = () => {
    if (!formData.title) { toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' }); return; }
    create.mutate(formData, { onSuccess: () => { setIsDialogOpen(false); setFormData({ activity_id: '', evidence_type: '', title: '', description: '' }); } });
  };

  const statCards = [
    { label: 'Total Evidence', value: evidenceList.length },
    { label: 'This Month', value: evidenceList.filter((ev: any) => { const d = new Date(ev.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length },
    { label: 'Activities', value: new Set(evidenceList.map((ev: any) => ev.activity_id).filter(Boolean)).size },
    { label: 'Types', value: new Set(evidenceList.map((ev: any) => ev.evidence_type).filter(Boolean)).size },
  ];

  const filterFields: FilterField[] = [
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, { value: 'Document', label: 'Document' }, { value: 'Photo', label: 'Photo' }, { value: 'Interview', label: 'Interview Record' }] },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (ev) => <span className="font-medium">{ev.title}</span> },
    { key: 'evidence_type', header: 'Type', render: (ev) => <Badge variant="outline">{ev.evidence_type || '-'}</Badge> },
    { key: 'description', header: 'Description', className: 'max-w-md', render: (ev) => <span className="truncate block max-w-md">{ev.description}</span> },
    { key: 'created_at', header: 'Date', render: (ev) => ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <PageShell
      title="Evidence Management"
      subtitle="Upload and manage audit evidence"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Evidence Management' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsDialogOpen(true)}><Upload className="w-4 h-4 mr-2" />Upload Evidence</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search evidence..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ type: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredEvidence} emptyMessage="No evidence records found" onView={(ev) => setViewItem(ev)} />
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <EntityModal open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Upload Audit Evidence" mode="create" onSave={handleUpload} saveLabel="Upload Evidence" isSaving={create.isPending}>
        <div className="space-y-4">
          <div><Label>Related Activity</Label>
            <Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Evidence title" /></div>
          <div><Label>Type</Label>
            <Select value={formData.evidence_type} onValueChange={v => setFormData({...formData, evidence_type: v})}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent><SelectItem value="Document">Document</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Interview">Interview Record</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the evidence..." rows={3} /></div>
        </div>
      </EntityModal>

      {/* View Dialog */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Evidence Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewItem.title}</p></div>
            <div><Label className="text-muted-foreground">Type</Label><p>{viewItem.evidence_type || '-'}</p></div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewItem.description || '-'}</p></div>
            <div><Label className="text-muted-foreground">Date</Label><p>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString() : '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
