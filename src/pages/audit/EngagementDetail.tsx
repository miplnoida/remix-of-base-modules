import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Shield, User, Calendar, Briefcase, Loader2,
  Plus, Trash2, CheckCircle, XCircle, MinusCircle, ClipboardCheck, Lock
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
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions, useIAFindings, useIAFindingMutations, useIAActionTracking, useIAManagementResponses } from '@/hooks/useAuditData';
import { useAuditChecklists } from '@/hooks/useAuditChecklists';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { formatDateForDisplay } from '@/lib/format-config';
import { useToast } from '@/hooks/use-toast';

// ===== Summary card =====
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

// ===== Checklist Tab =====
function ChecklistTab({ auditId }: { auditId: string }) {
  const { data: items = [], isLoading, create, update, archive } = useAuditChecklists(auditId);
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    create.mutate({
      question: newQuestion.trim(),
      description: newDescription.trim() || null,
      response: 'Not Assessed',
      status: 'Pending',
      sort_order: items.length,
    }, {
      onSuccess: () => { setNewQuestion(''); setNewDescription(''); },
    });
  };

  const handleResponse = (id: string, response: string) => {
    update.mutate({ id, response, status: response === 'Not Assessed' ? 'Pending' : 'Completed' });
  };

  const responseIcon = (response: string) => {
    if (response === 'Compliant') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (response === 'Non-Compliant') return <XCircle className="h-4 w-4 text-destructive" />;
    if (response === 'Not Applicable') return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    return <ClipboardCheck className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Add new question */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Add Checklist Question</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Question</Label><Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Enter audit checklist question" /></div>
          <div><Label>Description (optional)</Label><Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Additional details" className="min-h-[60px]" /></div>
          <Button onClick={handleAdd} disabled={!newQuestion.trim() || create.isPending} size="sm"><Plus className="h-4 w-4 mr-1" />Add Question</Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Compliant</p><p className="text-xl font-bold text-green-600">{items.filter((i: any) => i.response === 'Compliant').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Non-Compliant</p><p className="text-xl font-bold text-destructive">{items.filter((i: any) => i.response === 'Non-Compliant').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Not Assessed</p><p className="text-xl font-bold text-muted-foreground">{items.filter((i: any) => i.response === 'Not Assessed').length}</p></CardContent></Card>
      </div>

      {/* Checklist items */}
      {items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No checklist items yet. Add questions above to start the audit checklist.</CardContent></Card>
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
function FindingsTab({ auditId, auditFindings, departmentId }: { auditId: string; auditFindings: any[]; departmentId?: string }) {
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
      ...form,
      finding_id: findingId,
      engagement_id: auditId,
      department_id: departmentId || null,
      activity_id: null,
      annual_plan_id: null,
      status: 'Draft',
      ...getCreateFields(),
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: 'Medium', recommendation: '' });
      },
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.finding_id || r.id?.slice(0, 8)}</span> },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.risk_rating || 'Medium'} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Draft'} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{auditFindings.length} finding(s) linked to this audit</p>
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
                  <SelectContent>
                    {['Critical', 'High', 'Medium', 'Low'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Condition * (What was found?)</Label><Textarea value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} /></div>
            <div><Label>Criteria (What should be?)</Label><Textarea value={form.criteria} onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} /></div>
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

// ===== Closure Tab =====
function ClosureTab({ audit, findingsCount, openFindingsCount, actionsCount, responsesCount, onClose }: {
  audit: any; findingsCount: number; openFindingsCount: number; actionsCount: number; responsesCount: number; onClose: () => void;
}) {
  const [closureNotes, setClosureNotes] = useState(audit.closure_notes || '');
  const isClosed = audit.status === 'Closed';
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
              {check.ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
              <span className={`text-sm ${check.ok ? 'text-foreground' : 'text-destructive'}`}>{check.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {isClosed ? (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2 text-green-600"><Lock className="h-4 w-4" /><span className="font-medium">Audit Closed</span></div>
            {audit.closure_date && <p className="text-sm text-muted-foreground">Closed on: {formatDateForDisplay(audit.closure_date)}</p>}
            {audit.closed_by && <p className="text-sm text-muted-foreground">Closed by: {audit.closed_by}</p>}
            {audit.closure_notes && <p className="text-sm mt-2">{audit.closure_notes}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div><Label>Closure Notes</Label><Textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)} placeholder="Final remarks before closing..." /></div>
            <Button onClick={() => onClose()} disabled={!canClose}>
              {canClose ? 'Close Audit' : 'Cannot close — resolve open findings first'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== Main Component =====
export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core data
  const { data: engagements = [], isLoading, update: updateAudit } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const audit = useMemo(() => engagements.find((e: any) => e.id === id), [engagements, id]);
  const { data: deptFunctions = [] } = useIADepartmentFunctions(audit?.department_id || undefined);

  // Related data
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

  // Helpers
  const getDeptName = (did: string) => departments?.find((d: any) => d.id === did)?.name || '—';
  const getFunctionName = (fid: string) => deptFunctions?.find((f: any) => f.id === fid)?.function_name || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';

  const handleCloseAudit = () => {
    if (!id) return;
    updateAudit.mutate({
      id,
      status: 'Closed',
      closure_date: new Date().toISOString().split('T')[0],
      closure_notes: '',
    } as any, {
      onSuccess: () => toast({ title: 'Audit Closed', description: 'The audit has been closed successfully.' }),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
  }
  if (!audit) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/audit/audits')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="text-muted-foreground">Audit not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/audit/audits')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title={audit.engagement_name || 'Untitled Audit'}
            breadcrumbs={[
              { label: 'Internal Audit', href: '/audit/dashboard' },
              { label: 'Audits', href: '/audit/audits' },
              { label: audit.engagement_code || 'Detail' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={audit.status} />
          <StatusBadge status={audit.engagement_risk_rating} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard icon={Building2} label="Department" value={audit.department_id ? getDeptName(audit.department_id) : '—'} />
        <SummaryCard icon={Briefcase} label="Function" value={audit.function_id ? getFunctionName(audit.function_id) : '—'} />
        <SummaryCard icon={User} label="Lead Auditor" value={audit.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—'} />
        <SummaryCard icon={Calendar} label="Start Date" value={audit.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—'} />
        <SummaryCard icon={Calendar} label="End Date" value={audit.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—'} />
        <SummaryCard icon={Shield} label="Findings" value={`${auditFindings.length} (${openFindings.length} open)`} />
      </div>

      {/* Main Tabs — Simplified 4-tab layout */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="findings">Findings ({auditFindings.length})</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Audit Information</CardTitle></CardHeader>
              <CardContent>
                <DetailRow label="Audit Title" value={audit.engagement_name} />
                <DetailRow label="Audit Code" value={audit.engagement_code} />
                <DetailRow label="Type" value={audit.engagement_type || 'Planned Audit'} />
                <DetailRow label="Status" value={audit.status} />
                <DetailRow label="Risk Rating" value={audit.engagement_risk_rating} />
                <DetailRow label="Audit Year" value={audit.planned_start_date ? new Date(audit.planned_start_date).getFullYear() : '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Assignment</CardTitle></CardHeader>
              <CardContent>
                <DetailRow label="Department" value={audit.department_id ? getDeptName(audit.department_id) : '—'} />
                <DetailRow label="Function" value={audit.function_id ? getFunctionName(audit.function_id) : '—'} />
                <DetailRow label="Lead Auditor" value={audit.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—'} />
                <DetailRow label="Planned Start" value={audit.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—'} />
                <DetailRow label="Planned End" value={audit.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—'} />
              </CardContent>
            </Card>

            {(audit.scope || audit.objectives || audit.methodology) && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Scope & Objectives</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {audit.scope && <div><Label className="text-muted-foreground text-xs">Scope</Label><p className="text-sm">{audit.scope}</p></div>}
                  {audit.objectives && <div><Label className="text-muted-foreground text-xs">Objectives</Label><p className="text-sm">{audit.objectives}</p></div>}
                  {audit.methodology && <div><Label className="text-muted-foreground text-xs">Methodology</Label><p className="text-sm">{audit.methodology}</p></div>}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist">
          <ChecklistTab auditId={id!} />
        </TabsContent>

        {/* Findings */}
        <TabsContent value="findings">
          <FindingsTab auditId={id!} auditFindings={auditFindings} departmentId={audit.department_id} />
        </TabsContent>

        {/* Closure */}
        <TabsContent value="closure">
          <ClosureTab
            audit={audit}
            findingsCount={auditFindings.length}
            openFindingsCount={openFindings.length}
            actionsCount={auditActions.length}
            responsesCount={auditResponses.length}
            onClose={handleCloseAudit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
