import React, { useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Shield, User, Calendar, Briefcase, Loader2,
  Plus, Trash2, CheckCircle, XCircle, MinusCircle, ClipboardCheck, Lock,
  Upload, FileText, Download, Send, AlertTriangle, MessageSquare, Eye, Mail, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions, useIAFindings, useIAFindingMutations, useIAActionTracking, useIAActionTrackingMutations, useIAManagementResponses, useIAManagementResponseMutations } from '@/hooks/useAuditData';
import { useIAAuditQueries, useIAAuditQueryMutations } from '@/hooks/useAuditQueries';
import { useIAAuditReports, useIAAuditReportMutations } from '@/hooks/useAuditReports';
import { useAuditChecklists } from '@/hooks/useAuditChecklists';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { formatDateForDisplay } from '@/lib/format-config';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { supabase } from '@/integrations/supabase/client';
import { notifyManagementResponseSubmitted, notifyActionAssigned, notifyReportGenerated } from '@/services/auditNotificationService';
import { CommunicationTimeline } from '@/components/audit/CommunicationTimeline';
import { ClosureGatePanel } from '@/components/audit/ClosureGatePanel';
import { NotificationLogViewer } from '@/components/audit/NotificationLogViewer';
import { useCanCloseEngagement } from '@/hooks/useAuditCommunicationStages';
import { ExecutionLifecycleStepper } from '@/components/audit/ExecutionLifecycleStepper';
import { LaunchReadinessPanel } from '@/components/audit/LaunchReadinessPanel';
import { ExecutionAuditTrail } from '@/components/audit/ExecutionAuditTrail';
import { DocumentRequestsTab } from '@/components/audit/DocumentRequestsTab';
import { useTransitionExecutionStatus, type ExecutionStatus } from '@/hooks/useEngagementExecution';

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value || '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value ?? '—'}</span>
    </div>
  );
}

// ===== File Upload Helper =====
async function uploadFile(file: File, folder: string): Promise<string | null> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return null;
  if (file.size > MAX_FILE_SIZE) return null;
  const path = `${folder}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('audit-attachments').upload(path, file);
  if (error) { console.error('Upload error:', error); return null; }
  return path;
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('audit-attachments').getPublicUrl(path);
  return data?.publicUrl || '#';
}

// ===== Checklist Tab =====
function ChecklistTab({ auditId }: { auditId: string }) {
  const { data: items = [], isLoading, create, update, archive } = useAuditChecklists(auditId);
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    create.mutate({ question: newQuestion.trim(), description: newDescription.trim() || null, response: 'Not Assessed', status: 'Pending', sort_order: items.length }, {
      onSuccess: () => { setNewQuestion(''); setNewDescription(''); },
    });
  };

  const handleResponse = (id: string, response: string) => {
    update.mutate({ id, response, status: response === 'Not Assessed' ? 'Pending' : 'Completed' });
  };

  const responseIcon = (response: string) => {
    if (response === 'Compliant') return <CheckCircle className="h-4 w-4 text-primary" />;
    if (response === 'Non-Compliant') return <XCircle className="h-4 w-4 text-destructive" />;
    if (response === 'Not Applicable') return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    return <ClipboardCheck className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Add Checklist Question</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Question</Label><Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Enter audit checklist question" /></div>
          <div><Label>Description (optional)</Label><Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Additional details" className="min-h-[60px]" /></div>
          <Button onClick={handleAdd} disabled={!newQuestion.trim() || create.isPending} size="sm"><Plus className="h-4 w-4 mr-1" />Add Question</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Compliant</p><p className="text-xl font-bold text-primary">{items.filter((i: any) => i.response === 'Compliant').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Non-Compliant</p><p className="text-xl font-bold text-destructive">{items.filter((i: any) => i.response === 'Non-Compliant').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Not Assessed</p><p className="text-xl font-bold text-muted-foreground">{items.filter((i: any) => i.response === 'Not Assessed').length}</p></CardContent></Card>
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No checklist items yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item: any, idx: number) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{responseIcon(item.response)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{idx + 1}. {item.question}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    {item.remarks && <p className="text-xs text-muted-foreground mt-1 italic">Remarks: {item.remarks}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={item.response || 'Not Assessed'} onValueChange={(v) => handleResponse(item.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Assessed">Not Assessed</SelectItem>
                        <SelectItem value="Compliant">Compliant</SelectItem>
                        <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                        <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => archive.mutate(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Findings Tab =====
function FindingsTab({ auditId, auditFindings, auditResponses, departmentId }: { auditId: string; auditFindings: any[]; auditResponses: any[]; departmentId?: string }) {
  const { create } = useIAFindingMutations();
  const { getCreateFields } = useAuditFields();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: 'Medium', recommendation: '' });

  const handleCreate = () => {
    if (!form.title || !form.condition) {
      toast({ title: 'Validation', description: 'Title and Condition are required', variant: 'destructive' });
      return;
    }
    const findingId = `FND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      ...form, finding_id: findingId, engagement_id: auditId, department_id: departmentId || null,
      activity_id: null, annual_plan_id: null, status: 'Draft', ...getCreateFields(),
    } as any, {
      onSuccess: () => { setShowForm(false); setForm({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: 'Medium', recommendation: '' }); },
    });
  };

  const getResponseStatus = (findingId: string) => {
    const resp = auditResponses.find((r: any) => r.finding_id === findingId);
    return resp?.status || 'No Response';
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.finding_id || r.id?.slice(0, 8)}</span> },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.risk_rating || 'Medium'} /> },
    { key: 'recommendation', header: 'Recommendation', render: (r) => <span className="text-xs max-w-[200px] truncate block">{r.recommendation || '—'}</span> },
    { key: 'response_status', header: 'Mgmt Response', render: (r) => <StatusBadge status={getResponseStatus(r.id)} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Draft'} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{auditFindings.length} finding(s)</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />New Finding</Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Risk Rating</Label>
                <Select value={form.risk_rating} onValueChange={v => setForm(f => ({ ...f, risk_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Critical', 'High', 'Medium', 'Low'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Condition *</Label><Textarea value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} /></div>
            <div><Label>Criteria</Label><Textarea value={form.criteria} onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} /></div>
            <div><Label>Cause</Label><Textarea value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} /></div>
            <div><Label>Effect</Label><Textarea value={form.effect} onChange={e => setForm(f => ({ ...f, effect: e.target.value }))} /></div>
            <div><Label>Recommendation</Label><Textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} /></div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending}>Create Finding</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="pt-4">
        <DataTable columns={columns} data={auditFindings} emptyMessage="No findings for this audit yet." />
      </CardContent></Card>
    </div>
  );
}

// ===== Management Responses Tab =====
function ResponsesTab({ auditId, auditFindings, auditResponses, departmentId, leadAuditorId }: {
  auditId: string; auditFindings: any[]; auditResponses: any[]; departmentId?: string; leadAuditorId?: string;
}) {
  const { create, update } = useIAManagementResponseMutations();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ finding_id: '', response_text: '', action_plan: '', target_date: '' });
  const [uploading, setUploading] = useState(false);

  const getResponseForFinding = (fid: string) => auditResponses.find((r: any) => r.finding_id === fid);

  const handleSubmitResponse = async () => {
    if (!form.finding_id || !form.response_text) {
      toast({ title: 'Validation', description: 'Finding and response text are required', variant: 'destructive' });
      return;
    }
    let attachmentPath: string | null = null;
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      setUploading(true);
      attachmentPath = await uploadFile(fileInput.files[0], `responses/${auditId}`);
      setUploading(false);
      if (!attachmentPath) {
        toast({ title: 'Upload Failed', description: 'Invalid file type or size exceeds 20MB', variant: 'destructive' });
        return;
      }
    }
    create.mutate({
      finding_id: form.finding_id, engagement_id: auditId,
      response_text: form.response_text, action_plan: form.action_plan || null,
      target_date: form.target_date || null, status: 'Submitted',
      submitted_by: userCode || null, submitted_date: new Date().toISOString(),
      supporting_docs: attachmentPath ? [attachmentPath] : null, created_by: userCode || null,
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ finding_id: '', response_text: '', action_plan: '', target_date: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        notifyManagementResponseSubmitted(form.finding_id, leadAuditorId);
      },
    });
  };

  const handleUpdateStatus = (responseId: string, newStatus: string) => {
    update.mutate({ id: responseId, status: newStatus, updated_by: userCode || null } as any);
  };

  const findingsWithoutResponse = auditFindings.filter(f => !getResponseForFinding(f.id));

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => {
      const finding = auditFindings.find((f: any) => f.id === r.finding_id);
      return <span className="font-medium text-sm">{finding?.title || r.finding_id?.slice(0, 8)}</span>;
    }},
    { key: 'risk', header: 'Risk', render: (r) => {
      const finding = auditFindings.find((f: any) => f.id === r.finding_id);
      return <StatusBadge status={finding?.risk_rating || 'Medium'} />;
    }},
    { key: 'response_text', header: 'Response', render: (r) => <span className="text-xs max-w-[200px] truncate block">{r.response_text || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Pending'} /> },
    { key: 'submitted_by', header: 'Responded By', render: (r) => r.submitted_by || '—' },
    { key: 'submitted_date', header: 'Date', render: (r) => r.submitted_date ? formatDateForDisplay(r.submitted_date) : '—' },
    { key: 'attachment', header: 'Attachment', render: (r) => {
      const docs = r.supporting_docs as string[] | null;
      if (!docs?.length) return <span className="text-muted-foreground text-xs">None</span>;
      return <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open(getPublicUrl(docs[0]), '_blank')}><FileText className="h-3 w-3 mr-1" />View</Button>;
    }},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{auditResponses.length} response(s) | {findingsWithoutResponse.length} awaiting response</p>
        {findingsWithoutResponse.length > 0 && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Submit Response</Button>
        )}
      </div>
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Finding *</Label>
              <Select value={form.finding_id} onValueChange={v => setForm(f => ({ ...f, finding_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select finding" /></SelectTrigger>
                <SelectContent>
                  {findingsWithoutResponse.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.title} ({f.risk_rating})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Management Response *</Label><Textarea value={form.response_text} onChange={e => setForm(f => ({ ...f, response_text: e.target.value }))} placeholder="Provide management response..." rows={3} /></div>
            <div><Label>Action Plan</Label><Textarea value={form.action_plan} onChange={e => setForm(f => ({ ...f, action_plan: e.target.value }))} placeholder="Planned corrective actions..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></div>
              <div><Label>Supporting Document</Label>
                <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="text-xs" />
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, PNG, JPG — max 20MB</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmitResponse} disabled={create.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</> : 'Submit Response'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="pt-4">
        <DataTable columns={columns} data={auditResponses} emptyMessage="No management responses submitted yet."
          renderActions={(row) => (
            <div className="flex gap-1">
              {row.status === 'Submitted' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(row.id, 'Accepted')}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(row.id, 'Rejected')}>Reject</Button>
                </>
              )}
            </div>
          )}
        />
      </CardContent></Card>
    </div>
  );
}

// ===== Actions Tab =====
function ActionsTab({ auditId, auditFindings, auditActions }: { auditId: string; auditFindings: any[]; auditActions: any[] }) {
  const { create } = useIAActionTrackingMutations();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ finding_id: '', action_description: '', responsible_person: '', target_date: '' });

  const handleCreate = () => {
    if (!form.finding_id || !form.action_description) {
      toast({ title: 'Validation', description: 'Finding and action description are required', variant: 'destructive' });
      return;
    }
    create.mutate({
      finding_id: form.finding_id, engagement_id: auditId,
      action_description: form.action_description,
      responsible_person: form.responsible_person || null,
      target_date: form.target_date || null, status: 'Open', created_by: userCode || null,
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ finding_id: '', action_description: '', responsible_person: '', target_date: '' });
        if (form.responsible_person) notifyActionAssigned(form.action_description, form.responsible_person, form.target_date);
      },
    });
  };

  const isOverdue = (action: any) => {
    if (!action.target_date) return false;
    if (['Completed', 'Closed'].includes(action.status || '')) return false;
    return new Date(action.target_date) < new Date();
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => {
      const finding = auditFindings.find((f: any) => f.id === r.finding_id);
      return <span className="text-sm">{finding?.title || r.finding_id?.slice(0, 8)}</span>;
    }},
    { key: 'action_description', header: 'Action', render: (r) => <span className="text-sm max-w-[200px] truncate block">{r.action_description || '—'}</span> },
    { key: 'responsible_person', header: 'Assigned To', render: (r) => r.responsible_person || '—' },
    { key: 'target_date', header: 'Due Date', render: (r) => r.target_date ? formatDateForDisplay(r.target_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => (
      <div className="flex items-center gap-1">
        <StatusBadge status={r.status || 'Open'} />
        {isOverdue(r) && <StatusBadge status="Overdue" />}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {auditActions.length} action(s) | {auditActions.filter(isOverdue).length} overdue
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />New Action</Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Finding *</Label>
              <Select value={form.finding_id} onValueChange={v => setForm(f => ({ ...f, finding_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select finding" /></SelectTrigger>
                <SelectContent>
                  {auditFindings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Action Description *</Label><Textarea value={form.action_description} onChange={e => setForm(f => ({ ...f, action_description: e.target.value }))} placeholder="Describe the corrective action..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assigned To</Label><Input value={form.responsible_person} onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))} placeholder="Person responsible" /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending}>Create Action</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="pt-4">
        <DataTable columns={columns} data={auditActions} emptyMessage="No corrective actions assigned yet."
          rowClassName={(row) => isOverdue(row) ? 'bg-destructive/5 border-l-2 border-l-destructive' : ''}
        />
      </CardContent></Card>
    </div>
  );
}

// ===== Queries Tab =====
function QueriesTab({ auditId, departmentId }: { auditId: string; departmentId?: string }) {
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
      setUploading(true);
      attachmentPath = await uploadFile(fileInput.files[0], `queries/${auditId}`);
      setUploading(false);
      if (!attachmentPath) {
        toast({ title: 'Upload Failed', description: 'Invalid file type or size exceeds 20MB', variant: 'destructive' });
        return;
      }
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
    { key: 'requested_document', header: 'Requested Doc', render: (r) => r.requested_document || '—' },
    { key: 'requested_by', header: 'By' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Pending'} /> },
    { key: 'response', header: 'Response', render: (r) => <span className="text-xs max-w-[150px] truncate block">{r.response || '—'}</span> },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{queries.length} query(ies)</p>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}><Plus className="h-4 w-4 mr-1" />New Query</Button>
      </div>
      {showCreateForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Question *</Label><Textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter your question..." rows={3} /></div>
            <div><Label>Requested Document</Label><Input value={form.requested_document} onChange={e => setForm(f => ({ ...f, requested_document: e.target.value }))} placeholder="e.g. Policy manual" /></div>
            <div className="flex gap-2">
              <Button onClick={handleCreateQuery} disabled={create.isPending}><Send className="h-4 w-4 mr-1" />Send Query</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {respondingTo && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="bg-muted p-3 rounded-md"><p className="text-xs text-muted-foreground mb-1">Question:</p><p className="text-sm">{respondingTo.question}</p></div>
            <div><Label>Response *</Label><Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Enter your response..." rows={3} /></div>
            <div><Label>Supporting Document</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRespond} disabled={update.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</> : 'Submit Response'}
              </Button>
              <Button variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="pt-4">
        <DataTable columns={columns} data={queries} emptyMessage="No queries for this audit."
          renderActions={(row) => (
            <div className="flex gap-1">
              {row.status === 'Pending' && (
                <Button size="sm" variant="outline" onClick={() => { setRespondingTo(row); setResponseText(''); }}>
                  <MessageSquare className="w-3 h-3 mr-1" />Respond
                </Button>
              )}
              {row.status === 'Responded' && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: row.id, status: 'Closed' })}>Close</Button>
              )}
            </div>
          )}
        />
      </CardContent></Card>
    </div>
  );
}

// ===== Reports Tab =====
function ReportsTab({ auditId, audit, auditFindings, auditResponses, auditActions, getDeptName, getAuditorName }: {
  auditId: string; audit: any; auditFindings: any[]; auditResponses: any[]; auditActions: any[];
  getDeptName: (id: string) => string; getAuditorName: (id: string) => string;
}) {
  const { create } = useIAAuditReportMutations();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);

  const buildReportContent = () => {
    const findingsSummary = auditFindings.map(f => `• ${f.title} (${f.risk_rating}): ${f.condition || ''}`).join('\n');
    const recommendationsSummary = auditFindings.filter(f => f.recommendation).map(f => `• ${f.title}: ${f.recommendation}`).join('\n');
    const responsesSummary = auditResponses.map(r => {
      const finding = auditFindings.find(f => f.id === r.finding_id);
      return `• ${finding?.title || 'N/A'}: ${r.response_text || 'No response'} (${r.status})`;
    }).join('\n');
    const actionsSummary = auditActions.map(a => {
      const finding = auditFindings.find(f => f.id === a.finding_id);
      return `• ${finding?.title || 'N/A'}: ${a.action_description || ''} — ${a.responsible_person || 'Unassigned'} (${a.status})`;
    }).join('\n');
    const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    auditFindings.forEach(f => { if (f.risk_rating && riskCounts[f.risk_rating as keyof typeof riskCounts] !== undefined) riskCounts[f.risk_rating as keyof typeof riskCounts]++; });

    return {
      executive_summary: `This audit report covers the ${audit.engagement_name || 'audit engagement'} conducted for ${audit.department_id ? getDeptName(audit.department_id) : 'the organization'}. A total of ${auditFindings.length} finding(s) were identified with ${auditResponses.length} management response(s) received and ${auditActions.length} corrective action(s) assigned.`,
      audit_objective: audit.objectives || 'To evaluate the effectiveness of internal controls and compliance with established policies and procedures.',
      audit_scope: audit.scope || 'The audit covered the period and operations as defined in the engagement letter.',
      methodology: audit.methodology || 'The audit was conducted in accordance with the International Standards for the Professional Practice of Internal Auditing.',
      findings_summary: findingsSummary || 'No findings recorded.',
      risk_summary: `Critical: ${riskCounts.Critical}, High: ${riskCounts.High}, Medium: ${riskCounts.Medium}, Low: ${riskCounts.Low}`,
      recommendations: recommendationsSummary || 'No recommendations.',
      management_responses: responsesSummary || 'No management responses received.',
      corrective_actions: actionsSummary || 'No corrective actions assigned.',
    };
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    const content = buildReportContent();
    const reportNumber = `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      title: `Audit Report — ${audit.engagement_name}`,
      report_type: 'Engagement Report', engagement_id: auditId,
      department_id: audit.department_id || null,
      fiscal_year: audit.planned_start_date ? new Date(audit.planned_start_date).getFullYear().toString() : new Date().getFullYear().toString(),
      period: `${audit.planned_start_date || ''} to ${audit.planned_end_date || ''}`,
      report_number: reportNumber, executive_summary: content.executive_summary,
      audit_objective: content.audit_objective, audit_scope: content.audit_scope,
      methodology: content.methodology, recommendations: content.recommendations,
      risk_rating: content.risk_summary, overall_assessment: content.findings_summary,
      prepared_by: userCode || null, status: 'Draft',
      generated_on: new Date().toISOString(), created_by: userCode || null,
    } as any, {
      onSuccess: () => {
        setGenerating(false);
        toast({ title: 'Report Generated', description: 'The audit report has been created successfully.' });
        notifyReportGenerated(audit.engagement_name, audit.department_id);
      },
      onError: () => setGenerating(false),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setPreviewContent(buildReportContent())} variant="outline"><Eye className="h-4 w-4 mr-1" />Preview Report</Button>
        <Button onClick={handleGenerateReport} disabled={generating}>
          {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</> : <><FileText className="h-4 w-4 mr-1" />Generate Audit Report</>}
        </Button>
      </div>
      {previewContent && (
        <div className="space-y-4">
          {[
            { title: '1. Executive Summary', content: previewContent.executive_summary },
            { title: '2. Audit Objective', content: previewContent.audit_objective },
            { title: '3. Audit Scope', content: previewContent.audit_scope },
            { title: '4. Methodology', content: previewContent.methodology },
            { title: '5. Findings Summary', content: previewContent.findings_summary },
            { title: '6. Risk Rating', content: previewContent.risk_summary },
            { title: '7. Recommendations', content: previewContent.recommendations },
            { title: '8. Management Responses', content: previewContent.management_responses },
            { title: '9. Corrective Actions', content: previewContent.corrective_actions },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{section.content}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Closure Tab =====
function ClosureTab({ audit, findingsCount, openFindingsCount, actionsCount, responsesCount, onClose }: {
  audit: any; findingsCount: number; openFindingsCount: number; actionsCount: number; responsesCount: number; onClose: () => void;
}) {
  const [closureNotes, setClosureNotes] = useState(audit.closure_notes || '');
  const isClosed = audit.status === 'Closed' || audit.execution_status === 'Closed';
  const canClose = openFindingsCount === 0;

  const checks = [
    { label: 'All checklist items assessed', ok: true },
    { label: `All findings resolved (${openFindingsCount} open)`, ok: openFindingsCount === 0 },
    { label: `Management responses received (${responsesCount})`, ok: findingsCount === 0 || responsesCount >= findingsCount },
    { label: `Actions assigned (${actionsCount})`, ok: findingsCount === 0 || actionsCount > 0 },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Closure Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {check.ok ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
              <span className={`text-sm ${check.ok ? 'text-foreground' : 'text-destructive'}`}>{check.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {isClosed ? (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2 text-primary"><Lock className="h-4 w-4" /><span className="font-medium">Audit Closed</span></div>
            {audit.closure_date && <p className="text-sm text-muted-foreground">Closed on: {formatDateForDisplay(audit.closure_date)}</p>}
            {audit.closed_by && <p className="text-sm text-muted-foreground">Closed by: {audit.closed_by}</p>}
            {audit.closure_notes && <p className="text-sm mt-2">{audit.closure_notes}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div><Label>Closure Notes</Label><Textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)} placeholder="Final remarks..." /></div>
            <Button onClick={() => onClose()} disabled={!canClose}>
              {canClose ? 'Close Audit' : 'Cannot close — resolve open findings first'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== Smart Alerts Banner =====
function SmartAlertsBanner({ audit, auditFindings, auditResponses, auditActions }: {
  audit: any; auditFindings: any[]; auditResponses: any[]; auditActions: any[];
}) {
  const alerts: { type: 'warning' | 'info' | 'error'; message: string }[] = [];
  const execStatus = audit.execution_status || 'Planned';

  // Near start date but not launched
  if ((execStatus === 'Planned' || execStatus === 'Ready for Launch') && audit.planned_start_date) {
    const daysUntilStart = Math.ceil((new Date(audit.planned_start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilStart <= 7 && daysUntilStart > 0) {
      alerts.push({ type: 'warning', message: `Planned start in ${daysUntilStart} day(s) — engagement not yet launched.` });
    } else if (daysUntilStart <= 0) {
      alerts.push({ type: 'error', message: 'Planned start date has passed — engagement not yet launched.' });
    }
  }

  // Overdue management responses
  const pendingResponses = auditFindings.filter(f =>
    !auditResponses.find(r => r.finding_id === f.id) && f.status !== 'Closed'
  );
  if (pendingResponses.length > 0 && execStatus === 'Management Response Pending') {
    alerts.push({ type: 'warning', message: `${pendingResponses.length} finding(s) awaiting management response.` });
  }

  // Overdue actions
  const overdueActions = auditActions.filter(a =>
    a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date()
  );
  if (overdueActions.length > 0) {
    alerts.push({ type: 'error', message: `${overdueActions.length} overdue action item(s).` });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => (
        <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
          alert.type === 'error' ? 'bg-destructive/10 text-destructive' :
          alert.type === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
          'bg-primary/10 text-primary'
        }`}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {alert.message}
        </div>
      ))}
    </div>
  );
}

// ===== Main Component =====
export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const transitionMutation = useTransitionExecutionStatus();

  const { data: engagements = [], isLoading, update: updateAudit } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAAuditors();
  const audit = useMemo(() => engagements.find((e: any) => e.id === id), [engagements, id]);
  const { data: deptFunctions = [] } = useIADepartmentFunctions(audit?.department_id || undefined);

  const { data: allFindings = [] } = useIAFindings();
  const { data: allActions = [] } = useIAActionTracking();
  const { data: allResponses = [] } = useIAManagementResponses();

  const auditFindings = useMemo(() => allFindings.filter((f: any) => f.engagement_id === id), [allFindings, id]);
  const auditActions = useMemo(() => allActions.filter((a: any) => a.engagement_id === id), [allActions, id]);
  const auditResponses = useMemo(() => {
    const findingIds = auditFindings.map((f: any) => f.id);
    return allResponses.filter((r: any) => r.engagement_id === id || findingIds.includes(r.finding_id));
  }, [allResponses, auditFindings, id]);

  const openFindings = auditFindings.filter((f: any) => !['Closed', 'Resolved'].includes(f.status || ''));

  const getDeptName = (did: string) => departments?.find((d: any) => d.id === did)?.name || '—';
  const getDeptObj = (did: string) => departments?.find((d: any) => d.id === did);
  const getFunctionName = (fid: string) => deptFunctions?.find((f: any) => f.id === fid)?.function_name || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';
  const getPlanTitle = (pid: string) => plans?.find((p: any) => p.id === pid)?.title || '—';

  // Build engagement context for communication dialog
  const engagementContext = useMemo(() => {
    if (!audit) return undefined;
    const dept = getDeptObj(audit.department_id);
    return {
      engagement_name: audit.engagement_name || '',
      department_name: dept?.name || '',
      department_head: dept?.head || '',
      department_email: dept?.email || '',
      lead_auditor_name: getAuditorName(audit.lead_auditor_id),
      planned_start_date: audit.planned_start_date || '',
      planned_end_date: audit.planned_end_date || '',
      objectives: audit.objectives || '',
      scope: audit.scope || '',
      function_name: getFunctionName(audit.function_id),
    };
  }, [audit, departments, auditors, deptFunctions]);

  const handleCloseAudit = () => {
    if (!id) return;
    transitionMutation.mutate({ engagementId: id, newStatus: 'Closed', notes: 'Engagement closed' });
    updateAudit.mutate({ id, status: 'Closed', closure_date: new Date().toISOString().split('T')[0], closure_notes: '' } as any);
  };

  const handleStatusTransition = (newStatus: ExecutionStatus) => {
    if (!id) return;
    transitionMutation.mutate({ engagementId: id, newStatus });
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
  if (!audit) return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" onClick={() => navigate('/audit/audits')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
      <p className="text-muted-foreground">Audit not found.</p>
    </div>
  );

  const execStatus = audit.execution_status || 'Planned';
  const isPreLaunch = execStatus === 'Planned' || execStatus === 'Ready for Launch';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/audit/audits')}><ArrowLeft className="h-5 w-5" /></Button>
          <PageHeader
            title={audit.engagement_name || 'Untitled Audit'}
            breadcrumbs={[
              { label: 'Internal Audit', href: '/audit/dashboard' },
              { label: 'Engagements', href: '/audit/audits' },
              { label: audit.engagement_code || 'Detail' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={audit.status} />
          <StatusBadge status={execStatus} />
        </div>
      </div>

      {/* Execution Lifecycle Stepper */}
      <Card>
        <CardContent className="py-3 px-4">
          <ExecutionLifecycleStepper
            currentStatus={execStatus}
            onTransition={handleStatusTransition}
            isTransitioning={transitionMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Smart Alerts */}
      <SmartAlertsBanner audit={audit} auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard icon={Building2} label="Department" value={audit.department_id ? getDeptName(audit.department_id) : '—'} />
        <SummaryCard icon={Briefcase} label="Function" value={audit.function_id ? getFunctionName(audit.function_id) : '—'} />
        <SummaryCard icon={User} label="Lead Auditor" value={audit.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—'} />
        <SummaryCard icon={Calendar} label="Start Date" value={audit.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—'} />
        <SummaryCard icon={Calendar} label="End Date" value={audit.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—'} />
        <SummaryCard icon={Shield} label="Findings" value={`${auditFindings.length} (${openFindings.length} open)`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communications">Notifications & Communications</TabsTrigger>
          <TabsTrigger value="requests">Requests & Documents</TabsTrigger>
          <TabsTrigger value="fieldwork">Fieldwork</TabsTrigger>
          <TabsTrigger value="findings">Findings ({auditFindings.length})</TabsTrigger>
          <TabsTrigger value="responses">Mgmt Responses ({auditResponses.length})</TabsTrigger>
          <TabsTrigger value="reports">Final Report</TabsTrigger>
          <TabsTrigger value="followup">Follow-up / Actions ({auditActions.length})</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW ===== */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Engagement Information</CardTitle></CardHeader>
                <CardContent>
                  <DetailRow label="Title" value={audit.engagement_name} />
                  <DetailRow label="Code" value={audit.engagement_code} />
                  <DetailRow label="Type" value={audit.engagement_type || 'Planned Audit'} />
                  <DetailRow label="Status" value={audit.status} />
                  <DetailRow label="Execution Status" value={execStatus} />
                  <DetailRow label="Risk Rating" value={audit.engagement_risk_rating} />
                  <DetailRow label="Annual Plan" value={audit.annual_plan_id ? getPlanTitle(audit.annual_plan_id) : 'Ad-hoc'} />
                  <DetailRow label="Launched" value={audit.launched_at ? `${formatDateForDisplay(audit.launched_at)} by ${audit.launched_by || '—'}` : 'Not yet'} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Assignment & Team</CardTitle></CardHeader>
                <CardContent>
                  <DetailRow label="Department" value={audit.department_id ? getDeptName(audit.department_id) : '—'} />
                  <DetailRow label="Function" value={audit.function_id ? getFunctionName(audit.function_id) : '—'} />
                  <DetailRow label="Lead Auditor" value={audit.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—'} />
                  <DetailRow label="Reviewer" value={audit.reviewer_id ? getAuditorName(audit.reviewer_id) : '—'} />
                  <DetailRow label="Auditee Contact" value={audit.auditee_contact || (audit.primary_auditee_contact_id ? 'Assigned' : '—')} />
                  <DetailRow label="Planned Start" value={audit.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—'} />
                  <DetailRow label="Planned End" value={audit.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—'} />
                  <DetailRow label="Actual Start" value={audit.actual_start_date ? formatDateForDisplay(audit.actual_start_date) : '—'} />
                  <DetailRow label="Estimated Days" value={audit.estimated_days || '—'} />
                </CardContent>
              </Card>
              {(audit.scope || audit.objectives || audit.methodology) && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Scope & Objectives</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {audit.objectives && <div><Label className="text-muted-foreground text-xs">Objectives</Label><p className="text-sm whitespace-pre-wrap">{audit.objectives}</p></div>}
                    {audit.scope && <div><Label className="text-muted-foreground text-xs">Scope</Label><p className="text-sm whitespace-pre-wrap">{audit.scope}</p></div>}
                    {audit.methodology && <div><Label className="text-muted-foreground text-xs">Methodology</Label><p className="text-sm whitespace-pre-wrap">{audit.methodology}</p></div>}
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Sidebar: Launch Readiness */}
            <div className="space-y-4">
              <LaunchReadinessPanel
                engagementId={id!}
                currentExecutionStatus={execStatus}
              />
              {/* Quick stats */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Execution Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <DetailRow label="Findings" value={auditFindings.length} />
                  <DetailRow label="Open Findings" value={openFindings.length} />
                  <DetailRow label="Responses" value={auditResponses.length} />
                  <DetailRow label="Actions" value={auditActions.length} />
                  <DetailRow label="Overdue Actions" value={auditActions.filter(a => a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date()).length} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===== COMMUNICATIONS ===== */}
        <TabsContent value="communications" className="space-y-4">
          <CommunicationTimeline engagementId={id!} engagementName={audit.engagement_name} />
          <NotificationLogViewer engagementId={id!} />
        </TabsContent>

        {/* ===== REQUESTS & DOCUMENTS ===== */}
        <TabsContent value="requests">
          <div className="space-y-6">
            <DocumentRequestsTab engagementId={id!} />
            <QueriesTab auditId={id!} departmentId={audit.department_id} />
          </div>
        </TabsContent>

        {/* ===== FIELDWORK ===== */}
        <TabsContent value="fieldwork">
          <div className="space-y-4">
            <ChecklistTab auditId={id!} />
          </div>
        </TabsContent>

        {/* ===== FINDINGS ===== */}
        <TabsContent value="findings">
          <FindingsTab auditId={id!} auditFindings={auditFindings} auditResponses={auditResponses} departmentId={audit.department_id} />
        </TabsContent>

        {/* ===== MANAGEMENT RESPONSES ===== */}
        <TabsContent value="responses">
          <ResponsesTab auditId={id!} auditFindings={auditFindings} auditResponses={auditResponses} departmentId={audit.department_id} leadAuditorId={audit.lead_auditor_id} />
        </TabsContent>

        {/* ===== FINAL REPORT ===== */}
        <TabsContent value="reports">
          <ReportsTab auditId={id!} audit={audit} auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions} getDeptName={getDeptName} getAuditorName={getAuditorName} />
        </TabsContent>

        {/* ===== FOLLOW-UP / ACTIONS ===== */}
        <TabsContent value="followup">
          <div className="space-y-6">
            <ActionsTab auditId={id!} auditFindings={auditFindings} auditActions={auditActions} />
            <ClosureTab audit={audit} findingsCount={auditFindings.length} openFindingsCount={openFindings.length} actionsCount={auditActions.length} responsesCount={auditResponses.length} onClose={handleCloseAudit} />
          </div>
        </TabsContent>

        {/* ===== AUDIT TRAIL ===== */}
        <TabsContent value="audit-trail">
          <ExecutionAuditTrail engagementId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
