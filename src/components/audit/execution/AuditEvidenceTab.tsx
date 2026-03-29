import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementEvidence } from '@/hooks/useEngagementData';
import { useIAEvidenceMutations } from '@/hooks/useAuditDataExtended';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface AuditEvidenceTabProps {
  auditId: string;
}

export function AuditEvidenceTab({ auditId }: AuditEvidenceTabProps) {
  const { data: evidence = [], isLoading } = useEngagementEvidence(auditId);
  const { create, remove } = useIAEvidenceMutations();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', evidence_type: 'Document' });

  const handleCreate = async () => {
    if (!form.title) return;
    let filePath: string | null = null;
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      const file = fileInput.files[0];
      if (!ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
        toast({ title: 'Invalid File', description: 'Check file type or size (max 20MB)', variant: 'destructive' });
        return;
      }
      setUploading(true);
      const path = `evidence/${auditId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('audit-attachments').upload(path, file);
      setUploading(false);
      if (error) { toast({ title: 'Upload Failed', variant: 'destructive' }); return; }
      filePath = path;
    }
    create.mutate({
      title: form.title,
      description: form.description || null,
      evidence_type: form.evidence_type,
      file_path: filePath,
      engagement_id: auditId,
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ title: '', description: '', evidence_type: 'Document' });
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-sm">{r.title || '—'}</span> },
    { key: 'evidence_type', header: 'Type', render: (r) => <StatusBadge status={r.evidence_type || 'Document'} /> },
    { key: 'description', header: 'Description', render: (r) => <span className="text-xs max-w-[200px] truncate block">{r.description || '—'}</span> },
    { key: 'created_at', header: 'Added', render: (r) => r.created_at ? formatDateForDisplay(r.created_at) : '—' },
    { key: 'file_path', header: 'File', render: (r) => {
      if (!r.file_path) return <span className="text-muted-foreground text-xs">None</span>;
      const { data } = supabase.storage.from('audit-attachments').getPublicUrl(r.file_path);
      return <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open(data?.publicUrl, '_blank')}><FileText className="h-3 w-3 mr-1" />View</Button>;
    }},
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{evidence.length} evidence item(s)</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Add Evidence</Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Evidence title" /></div>
              <div><Label>Type</Label><Input value={form.evidence_type} onChange={e => setForm(f => ({ ...f, evidence_type: e.target.value }))} placeholder="Document, Interview, etc." /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Attach File</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="text-xs" />
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, PNG, JPG — max 20MB</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</> : 'Add Evidence'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {evidence.length === 0 && !showForm ? (
        <AuditEmptyState icon={FileText} title="No evidence collected" description="Upload documents, interview notes, or other audit evidence" actionLabel="Add Evidence" onAction={() => setShowForm(true)} />
      ) : (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={evidence} emptyMessage="No evidence items."
            renderActions={(row) => (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(row.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          />
        </CardContent></Card>
      )}
    </div>
  );
}
