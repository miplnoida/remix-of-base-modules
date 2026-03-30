import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Trash2, Loader2 } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementWorkingPapers } from '@/hooks/useEngagementData';
import { useIAWorkingPaperMutations } from '@/hooks/useAuditDataExtended';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface AuditWorkingPapersTabProps {
  auditId: string;
}

export function AuditWorkingPapersTab({ auditId }: AuditWorkingPapersTabProps) {
  const { data: papers = [], isLoading } = useEngagementWorkingPapers(auditId);
  const { create, remove } = useIAWorkingPaperMutations();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', reference_number: '', description: '', paper_type: 'Analysis' });

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
      const path = `working-papers/${auditId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('audit-attachments').upload(path, file);
      setUploading(false);
      if (error) { toast({ title: 'Upload Failed', variant: 'destructive' }); return; }
      filePath = path;
    }
    create.mutate({
      title: form.title,
      working_paper_id: form.reference_number || null,
      description: form.description || null,
      audit_area: form.paper_type || 'Analysis',
      engagement_id: auditId,
      status: 'Draft',
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ title: '', reference_number: '', description: '', paper_type: 'Analysis' });
      },
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'working_paper_id', header: 'Ref', render: (r) => <span className="font-mono text-xs">{r.working_paper_id || '—'}</span> },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-sm">{r.title || '—'}</span> },
    { key: 'audit_area', header: 'Area', render: (r) => <StatusBadge status={r.audit_area || 'General'} /> },
    { key: 'description', header: 'Description', render: (r) => <span className="text-xs max-w-[180px] truncate block">{r.description || '—'}</span> },
    { key: 'created_at', header: 'Created', render: (r) => r.created_at ? formatDateForDisplay(r.created_at) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Draft'} /> },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{papers.length} working paper(s)</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Add Working Paper</Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Working paper title" /></div>
              <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="e.g. WP-001" /></div>
              <div><Label>Type</Label><Input value={form.paper_type} onChange={e => setForm(f => ({ ...f, paper_type: e.target.value }))} placeholder="Analysis, Walkthrough, etc." /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Attach File</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</> : 'Add Working Paper'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {papers.length === 0 && !showForm ? (
        <AuditEmptyState icon={FileText} title="No working papers" description="Upload audit analyses, test results, and supporting documentation" actionLabel="Add Working Paper" onAction={() => setShowForm(true)} />
      ) : (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={papers} emptyMessage="No working papers."
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
