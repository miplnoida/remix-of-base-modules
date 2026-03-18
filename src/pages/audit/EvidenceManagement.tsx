import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Download } from 'lucide-react';
import { useIAEvidence, useIAEvidenceMutations, useIAActivities, useIAAnnualPlans } from '@/hooks/useAuditData';
import { useIADepartmentAudits } from '@/hooks/useAuditDataExtended';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { EVIDENCE_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';

const exportColumns = toExportColumns(EVIDENCE_SCHEMA);

export default function EvidenceManagement() {
  const { toast } = useToast();
  const { getCreateFields } = useAuditFields();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ type: 'all' });
  const { data: evidenceList = [], isLoading } = useIAEvidence();
  const { data: activities = [] } = useIAActivities();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: deptAudits = [] } = useIADepartmentAudits();
  const { create } = useIAEvidenceMutations();
  const [formData, setFormData] = useState({ activity_id: '', evidence_type: '', title: '', description: '', annual_plan_id: '', department_audit_id: '' });
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
      toast({ title: 'Validation Error', description: 'Evidence Title is required', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      if (selectedFile) {
        const filePath = `evidence/${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('ia-evidence').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('ia-evidence').getPublicUrl(filePath);
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
        activity_id: formData.activity_id || null,
        annual_plan_id: formData.annual_plan_id || null,
        department_audit_id: formData.department_audit_id || null,
        ...getCreateFields(),
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ activity_id: '', evidence_type: '', title: '', description: '', annual_plan_id: '', department_audit_id: '' });
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

  const filterFields: StandardFilterField[] = [
    { key: 'type', label: 'Evidence Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, { value: 'Document', label: 'Document' }, { value: 'Photo', label: 'Photo' }, { value: 'Interview', label: 'Interview Record' }] },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Evidence Title', render: (ev) => <span className="font-medium">{ev.title || ev.file_name || '-'}</span> },
    { key: 'evidence_type', header: 'Evidence Type', render: (ev) => <Badge variant="outline">{ev.evidence_type || '-'}</Badge> },
    { key: 'plan', header: 'Audit Plan', render: (ev) => { const p = plans.find((p: any) => p.id === ev.annual_plan_id); return <span className="text-xs">{p?.title || '-'}</span>; }},
    { key: 'file_name', header: 'File Name', render: (ev) => ev.file_name ? <span className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" />{ev.file_name}</span> : <span className="text-muted-foreground">No file</span> },
    { key: 'created_at', header: 'Date', render: (ev) => ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '-' },
  ];

  // Prepare export data with resolved names
  const exportData = filteredEvidence.map((ev: any) => ({
    ...ev,
    plan_name: plans.find((p: any) => p.id === ev.annual_plan_id)?.title || '',
    activity_name: activities.find((a: any) => a.id === ev.activity_id)?.title || '',
  }));

  return (
    <PageShell
      title="Evidence Management"
      subtitle="Upload and manage audit evidence with file attachments"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Evidence Management' }]}
      isLoading={isLoading}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={exportData} columns={exportColumns} fileName={EVIDENCE_SCHEMA.exportFileName} title={EVIDENCE_SCHEMA.exportTitle} />
          <Button onClick={() => setIsDialogOpen(true)}><Upload className="w-4 h-4 mr-2" />Upload Evidence</Button>
        </div>
      }
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

      <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search evidence..." filters={filterFields} filterValues={filters} onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ type: 'all' })} />

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

      <EntityModal open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Upload Audit Evidence" mode="create" onSave={handleUpload} saveLabel="Upload Evidence" isSaving={isUploading || create.isPending}>
        <div className="space-y-4">
          <div><Label>Evidence Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Evidence title" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Related Activity</Label>
              <Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                <SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Evidence Type</Label>
              <Select value={formData.evidence_type} onValueChange={v => setFormData({...formData, evidence_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent><SelectItem value="Document">Document</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Interview">Interview Record</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audit Plan</Label>
              <Select value={formData.annual_plan_id} onValueChange={v => setFormData({...formData, annual_plan_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Dept. Audit</Label>
              <Select value={formData.department_audit_id} onValueChange={v => setFormData({...formData, department_audit_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select dept audit" /></SelectTrigger>
                <SelectContent>{deptAudits.map((da: any) => <SelectItem key={da.id} value={da.id}>{da.department_name || da.id.slice(0,8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Attach File</Label>
            <Input ref={fileInputRef} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="mt-1" />
            {selectedFile && <p className="text-xs text-muted-foreground mt-1">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>}
          </div>
          <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the evidence..." rows={3} /></div>
        </div>
      </EntityModal>

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Evidence Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Evidence Title</Label><p className="font-medium">{viewItem.title || viewItem.file_name || '-'}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Evidence ID</Label><p>{viewItem.evidence_id || '-'}</p></div>
              <div><Label className="text-muted-foreground">Evidence Type</Label><p>{viewItem.evidence_type || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Audit Plan</Label><p>{plans.find((p: any) => p.id === viewItem.annual_plan_id)?.title || '-'}</p></div>
              <div><Label className="text-muted-foreground">Department Audit</Label><p>{deptAudits.find((da: any) => da.id === viewItem.department_audit_id)?.department_name || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Activity</Label><p>{activities.find((a: any) => a.id === viewItem.activity_id)?.title || '-'}</p></div>
              <div><Label className="text-muted-foreground">Created By</Label><p>{viewItem.created_by || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewItem.description || '-'}</p></div>
            {viewItem.file_name && (
              <div><Label className="text-muted-foreground">File Name</Label>
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