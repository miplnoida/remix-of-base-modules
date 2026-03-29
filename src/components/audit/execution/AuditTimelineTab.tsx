import React from 'react';
import { ExecutionAuditTrail } from '@/components/audit/ExecutionAuditTrail';
import { useIAAuditQueries, useIAAuditQueryMutations } from '@/hooks/useAuditQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Send, MessageSquare, Loader2, FileText } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef } from 'react';

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface AuditTimelineTabProps {
  auditId: string;
  departmentId?: string;
}

export function AuditTimelineTab({ auditId, departmentId }: AuditTimelineTabProps) {
  return (
    <div className="space-y-6">
      {/* Queries Section */}
      <QueriesSection auditId={auditId} departmentId={departmentId} />
      
      {/* Audit Trail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Execution Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionAuditTrail engagementId={auditId} />
        </CardContent>
      </Card>
    </div>
  );
}

function QueriesSection({ auditId, departmentId }: { auditId: string; departmentId?: string }) {
  const { data: queries = [], isLoading } = useIAAuditQueries(auditId);
  const { create, update } = useIAAuditQueryMutations();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ question: '', requested_document: '' });

  const handleCreateQuery = () => {
    if (!form.question) return;
    create.mutate({
      engagement_id: auditId, department_id: departmentId || undefined,
      question: form.question, requested_document: form.requested_document || undefined,
      requested_by: userCode || undefined,
    }, {
      onSuccess: () => { setShowCreateForm(false); setForm({ question: '', requested_document: '' }); },
    });
  };

  const handleRespond = async () => {
    if (!respondingTo || !responseText) return;
    let attachmentPath: string | null = null;
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      const file = fileInput.files[0];
      if (!ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
        toast({ title: 'Upload Failed', description: 'Invalid file type or size exceeds 20MB', variant: 'destructive' });
        return;
      }
      setUploading(true);
      const path = `queries/${auditId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('audit-attachments').upload(path, file);
      setUploading(false);
      if (error) { toast({ title: 'Upload Failed', variant: 'destructive' }); return; }
      attachmentPath = path;
    }
    update.mutate({
      id: respondingTo.id, response: responseText,
      response_by: userCode || null, response_date: new Date().toISOString(),
      response_attachment: attachmentPath || null, status: 'Responded',
    } as any, {
      onSuccess: () => { setRespondingTo(null); setResponseText(''); if (fileInputRef.current) fileInputRef.current.value = ''; },
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'question', header: 'Question', className: 'max-w-xs', render: (r) => <span className="text-sm truncate block">{r.question}</span> },
    { key: 'requested_document', header: 'Requested Doc', render: (r) => <span className="text-xs">{r.requested_document || '—'}</span> },
    { key: 'requested_by', header: 'By', render: (r) => <span className="text-xs">{r.requested_by || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Pending'} /> },
    { key: 'response', header: 'Response', render: (r) => <span className="text-xs max-w-[150px] truncate block">{r.response || '—'}</span> },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />Audit Queries ({queries.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreateForm(!showCreateForm)}><Plus className="h-3.5 w-3.5 mr-1" />New Query</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreateForm && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <div><Label className="text-xs">Question *</Label><Textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Requested Document</Label><Input value={form.requested_document} onChange={e => setForm(f => ({ ...f, requested_document: e.target.value }))} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateQuery} disabled={create.isPending}><Send className="h-3.5 w-3.5 mr-1" />Send</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {respondingTo && (
          <div className="p-3 rounded-lg border border-primary/20 space-y-3">
            <div className="bg-muted p-2 rounded text-sm">{respondingTo.question}</div>
            <div><Label className="text-xs">Response *</Label><Textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">Supporting Document</Label><Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="text-xs" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRespond} disabled={update.isPending || uploading}>
                {uploading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading...</> : 'Submit'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
            </div>
          </div>
        )}
        {queries.length === 0 && !showCreateForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">No queries yet</p>
        ) : (
          <DataTable columns={columns} data={queries} emptyMessage="No queries."
            renderActions={(row) => (
              <div className="flex gap-1">
                {row.status === 'Pending' && <Button size="sm" variant="outline" onClick={() => { setRespondingTo(row); setResponseText(''); }}>Respond</Button>}
                {row.status === 'Responded' && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: row.id, status: 'Closed' })}>Close</Button>}
              </div>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
