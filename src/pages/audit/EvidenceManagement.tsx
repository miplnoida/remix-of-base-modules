import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Download, Eye } from 'lucide-react';
import { useIAEvidence, useIAEvidenceMutations, useIAActivities } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { Badge } from '@/components/ui/badge';

export default function EvidenceManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ type: 'all' });
  const { data: evidenceList = [], isLoading } = useIAEvidence();
  const { data: activities = [] } = useIAActivities();
  const { create } = useIAEvidenceMutations();
  const [formData, setFormData] = useState({ activity_id: '', evidence_type: '', title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);

  const filteredEvidence = evidenceList.filter((ev: any) => {
    const matchesSearch = (ev.title || ev.file_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (ev.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filters.type === 'all' || ev.evidence_type === filters.type;
    return matchesSearch && matchesType;
  });

  const handleUpload = async () => {
    if (!formData.title) {
      toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const filePath = `evidence/${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ia-evidence')
          .upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('ia-evidence')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type;
      }

      const evidenceId = `EV-${Date.now().toString(36).toUpperCase()}`;
      create.mutate({
        ...formData,
        evidence_id: evidenceId,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        file_type: fileType || null,
        upload_date: new Date().toISOString(),
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ activity_id: '', evidence_type: '', title: '', description: '' });
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    } catch (err: any) {
      toast({ title: 'Upload Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const statCards = [
    { label: 'Total Evidence', value: evidenceList.length },
    { label: 'This Month', value: evidenceList.filter((ev: any) => { const d = new Date(ev.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length },
    { label: 'With Files', value: evidenceList.filter((ev: any) => ev.file_url).length },
    { label: 'Types', value: new Set(evidenceList.map((ev: any) => ev.evidence_type).filter(Boolean)).size },
  ];

  const filterFields: FilterField[] = [
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, { value: 'Document', label: 'Document' }, { value: 'Photo', label: 'Photo' }, { value: 'Interview', label: 'Interview Record' }] },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (ev) => <span className="font-medium">{ev.title || ev.file_name || '-'}</span> },
    { key: 'evidence_type', header: 'Type', render: (ev) => <Badge variant="outline">{ev.evidence_type || '-'}</Badge> },
    { key: 'file_name', header: 'File', render: (ev) => ev.file_name ? <span className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" />{ev.file_name}</span> : <span className="text-muted-foreground">No file</span> },
    { key: 'description', header: 'Description', className: 'max-w-md', render: (ev) => <span className="truncate block max-w-md">{ev.description}</span> },
    { key: 'created_at', header: 'Date', render: (ev) => ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <PageShell
      title="Evidence Management"
      subtitle="Upload and manage audit evidence with file attachments"
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
          <DataTable
            columns={columns}
            data={filteredEvidence}
            emptyMessage="No evidence records found"
            onView={(ev) => setViewItem(ev)}
            renderActions={(ev) => ev.file_url ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={ev.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
              </Button>
            ) : null}
          />
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <EntityModal open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Upload Audit Evidence" mode="create" onSave={handleUpload} saveLabel="Upload Evidence" isSaving={isUploading || create.isPending}>
        <div className="space-y-4">
          <div><Label>Related Activity</Label>
            <Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Evidence title" /></div>
          <div><Label>Type</Label>
            <Select value={formData.evidence_type} onValueChange={v => setFormData({...formData, evidence_type: v})}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent><SelectItem value="Document">Document</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Interview">Interview Record</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>Attach File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the evidence..." rows={3} /></div>
        </div>
      </EntityModal>

      {/* View Dialog */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Evidence Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewItem.title || viewItem.file_name || '-'}</p></div>
            <div><Label className="text-muted-foreground">Evidence ID</Label><p>{viewItem.evidence_id || '-'}</p></div>
            <div><Label className="text-muted-foreground">Type</Label><p>{viewItem.evidence_type || '-'}</p></div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewItem.description || '-'}</p></div>
            {viewItem.file_name && (
              <div><Label className="text-muted-foreground">File</Label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4" />
                  <span>{viewItem.file_name}</span>
                  {viewItem.file_size && <span className="text-xs text-muted-foreground">({(viewItem.file_size / 1024).toFixed(1)} KB)</span>}
                  {viewItem.file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={viewItem.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 mr-1" />Download</a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div><Label className="text-muted-foreground">Date</Label><p>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString() : '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
