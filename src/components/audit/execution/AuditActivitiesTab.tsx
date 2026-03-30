import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Loader2, Edit, Eye, ClipboardCheck, ChevronDown, ChevronRight,
  FileText, AlertTriangle, Paperclip, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { StatusBadge, StandardModal } from '@/components/common';
import { useEngagementActivities, useEngagementEvidence, useEngagementWorkingPapers } from '@/hooks/useEngagementData';
import { useIAActivityMutations } from '@/hooks/useAuditDataExtended';
import { useIAFindings } from '@/hooks/useAuditData';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ACTIVITY_STATUSES = ['Planned', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
const ACTIVITY_TYPES = ['Document Review', 'Walkthrough', 'Testing', 'Interview', 'Observation', 'Data Analysis', 'Sampling', 'Reconciliation', 'Inspection', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const emptyForm = {
  name: '', title: '', description: '', status: 'Planned', activity_type: '',
  planned_date_from: '', planned_date_to: '', actual_date_from: '', actual_date_to: '',
  control_area: '', function_area: '', location: '', priority: 'Medium',
  auditor_id: '', auditor_name: '',
};

interface AuditActivitiesTabProps {
  auditId: string;
  departmentAuditId?: string;
  auditors?: any[];
}

// ===== Activity Card with inline sub-sections =====
function ActivityCard({ activity, evidence, workingPapers, findings, onEdit, onView }: {
  activity: any; evidence: any[]; workingPapers: any[]; findings: any[];
  onEdit: () => void; onView: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = activity.status === 'Completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
    activity.status === 'In Progress' ? <Clock className="h-4 w-4 text-amber-500" /> :
    activity.status === 'Deferred' || activity.status === 'Cancelled' ? <AlertCircle className="h-4 w-4 text-muted-foreground" /> :
    <Clock className="h-4 w-4 text-muted-foreground" />;

  // Smart guidance: determine what's missing
  const alerts: string[] = [];
  if (evidence.length === 0 && activity.status !== 'Cancelled') alerts.push('No evidence uploaded');
  if (workingPapers.length === 0 && activity.status === 'Completed') alerts.push('No working paper created');
  if (activity.status === 'In Progress' && !activity.actual_date_from) alerts.push('Actual start date not set');

  // Next action suggestion
  let nextAction = '';
  if (activity.status === 'Planned') nextAction = 'Start this activity and begin fieldwork';
  else if (activity.status === 'In Progress' && evidence.length === 0) nextAction = 'Upload supporting evidence';
  else if (activity.status === 'In Progress' && workingPapers.length === 0) nextAction = 'Create a working paper to document analysis';
  else if (activity.status === 'In Progress' && findings.length === 0) nextAction = 'Raise finding if issues identified';
  else if (activity.status === 'In Progress') nextAction = 'Mark as completed when fieldwork is done';

  return (
    <Card className={`transition-all ${expanded ? 'ring-1 ring-primary/20' : ''}`}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {statusIcon}
            <span className="font-medium text-sm">{activity.name || activity.title || 'Untitled Activity'}</span>
            {activity.activity_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activity.activity_type}</Badge>}
            {activity.priority && <StatusBadge status={activity.priority} />}
          </div>
          {activity.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>}
          <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
            {activity.auditor_name && <span>👤 {activity.auditor_name}</span>}
            {(activity.planned_date_from || activity.start_date) && (
              <span>📅 {formatDateForDisplay(activity.planned_date_from || activity.start_date)}
                {(activity.planned_date_to || activity.end_date) ? ` – ${formatDateForDisplay(activity.planned_date_to || activity.end_date)}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Inline counters */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-0.5" title="Evidence">
              <Paperclip className="h-3 w-3" />{evidence.length}
            </span>
            <span className="flex items-center gap-0.5" title="Working Papers">
              <FileText className="h-3 w-3" />{workingPapers.length}
            </span>
            <span className="flex items-center gap-0.5" title="Findings">
              <AlertTriangle className="h-3 w-3" />{findings.length}
            </span>
          </div>
          <StatusBadge status={activity.status || 'Planned'} />
          <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {/* Smart guidance */}
          {nextAction && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 bg-primary/5 text-primary rounded-md border border-primary/10">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span><strong>Next:</strong> {nextAction}</span>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="space-y-1">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-md border border-amber-200/50 dark:border-amber-800/30">
                  <AlertCircle className="h-3 w-3 shrink-0" />{a}
                </div>
              ))}
            </div>
          )}

          {/* Linked Evidence */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Evidence ({evidence.length})
            </p>
            {evidence.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-4">No evidence linked to this activity. Use the Evidence tab to upload and link.</p>
            ) : (
              <div className="space-y-1 pl-4">
                {evidence.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs py-1">
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-muted-foreground">{e.evidence_id || '—'}</span>
                    <span className="truncate">{e.description || e.file_name || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Working Papers */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Working Papers ({workingPapers.length})
            </p>
            {workingPapers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-4">No working papers linked. Use the Working Papers tab to create and link.</p>
            ) : (
              <div className="space-y-1 pl-4">
                {workingPapers.map((wp: any) => (
                  <div key={wp.id} className="flex items-center gap-2 text-xs py-1">
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-muted-foreground">{wp.reference_number || '—'}</span>
                    <span className="truncate">{wp.title || '—'}</span>
                    <StatusBadge status={wp.paper_type || 'Analysis'} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Findings */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Findings ({findings.length})
            </p>
            {findings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-4">No findings raised from this activity yet.</p>
            ) : (
              <div className="space-y-1 pl-4">
                {findings.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs py-1">
                    <AlertTriangle className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{f.title || '—'}</span>
                    <StatusBadge status={f.risk_rating || 'Medium'} />
                    <StatusBadge status={f.status || 'Open'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ===== Main Component =====
export function AuditActivitiesTab({ auditId, departmentAuditId, auditors = [] }: AuditActivitiesTabProps) {
  const { data: activities = [], isLoading } = useEngagementActivities(auditId);
  const { data: allEvidence = [] } = useEngagementEvidence(auditId);
  const { data: allWorkingPapers = [] } = useEngagementWorkingPapers(auditId);
  const { data: allFindings = [] } = useIAFindings();
  const { create, update } = useIAActivityMutations();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const engagementFindings = useMemo(() => allFindings.filter((f: any) => f.engagement_id === auditId), [allFindings, auditId]);

  // Progress stats
  const completedCount = activities.filter((a: any) => a.status === 'Completed').length;
  const inProgressCount = activities.filter((a: any) => a.status === 'In Progress').length;
  const progressPct = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;

  const openCreate = () => { setForm({ ...emptyForm }); setModal({ mode: 'create' }); setAdvancedOpen(false); };
  const openEdit = (r: any) => {
    setForm({
      name: r.name || '', title: r.title || '', description: r.description || '', status: r.status || 'Planned',
      activity_type: r.activity_type || '', planned_date_from: r.planned_date_from || r.start_date || '',
      planned_date_to: r.planned_date_to || r.end_date || '', actual_date_from: r.actual_date_from || '',
      actual_date_to: r.actual_date_to || '', control_area: r.control_area || '', function_area: r.function_area || '',
      location: r.location || '', priority: r.priority || 'Medium', auditor_id: r.auditor_id || '', auditor_name: r.auditor_name || '',
    });
    setModal({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModal({ mode: 'view', record: r }); };

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name, title: form.title || form.name, description: form.description || null,
      status: form.status, activity_type: form.activity_type || null,
      planned_date_from: form.planned_date_from || null, planned_date_to: form.planned_date_to || null,
      actual_date_from: form.actual_date_from || null, actual_date_to: form.actual_date_to || null,
      start_date: form.planned_date_from || null, end_date: form.planned_date_to || null,
      control_area: form.control_area || null, function_area: form.function_area || null,
      location: form.location || null, priority: form.priority || null,
      auditor_id: form.auditor_id || null, auditor_name: form.auditor_name || null,
      engagement_id: auditId, department_audit_id: departmentAuditId || null,
    };
    if (modal.mode === 'create') {
      create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => setModal({ mode: null }) });
    } else if (modal.mode === 'edit' && modal.record) {
      update.mutate({ id: modal.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => setModal({ mode: null }) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Progress Dashboard */}
      {activities.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Fieldwork Progress</span>
                  <span className="text-xs font-bold">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
              <div className="flex gap-4 text-center shrink-0">
                <div>
                  <p className="text-lg font-bold">{activities.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{inProgressCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Active</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{completedCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{allEvidence.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Evidence</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{engagementFindings.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Findings</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activities.length} activit{activities.length === 1 ? 'y' : 'ies'} recorded</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
      </div>

      {activities.length === 0 ? (
        <AuditEmptyState icon={ClipboardCheck} title="No audit activities yet"
          description="Activities represent individual audit tasks — document reviews, walkthroughs, testing, interviews, and observations performed during fieldwork. Each activity acts as a working unit linking evidence, working papers, and findings."
          actionLabel="Add First Activity" onAction={openCreate} />
      ) : (
        <div className="space-y-2">
          {activities.map((activity: any) => {
            const actEvidence = allEvidence.filter((e: any) => e.activity_id === activity.id);
            const actWPs = allWorkingPapers.filter((wp: any) => wp.activity_id === activity.id);
            const actFindings = engagementFindings.filter((f: any) => f.activity_id === activity.id);
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                evidence={actEvidence}
                workingPapers={actWPs}
                findings={actFindings}
                onEdit={() => openEdit(activity)}
                onView={() => openView(activity)}
              />
            );
          })}
        </div>
      )}

      {/* Inline Create / Edit / View Form */}
      {modal.mode !== null && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {modal.mode === 'create' ? 'New Activity' : modal.mode === 'edit' ? 'Edit Activity' : 'Activity Detail'}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setModal({ mode: null })}>✕</Button>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Activity Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Review payroll records" /></div>
              <div><Label>Activity Type</Label>
                <Select value={form.activity_type || '__none__'} onValueChange={v => setForm(f => ({ ...f, activity_type: v === '__none__' ? '' : v }))} disabled={modal.mode === 'view'}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select type</SelectItem>
                    {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} disabled={modal.mode === 'view'} className="text-sm leading-relaxed" /></div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modal.mode === 'view'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))} disabled={modal.mode === 'view'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assigned Auditor</Label>
                {auditors.length > 0 ? (
                  <Select value={form.auditor_id || '__none__'} onValueChange={v => { const a = auditors.find((x: any) => x.id === v); setForm(f => ({ ...f, auditor_id: v === '__none__' ? '' : v, auditor_name: a?.name || '' })); }} disabled={modal.mode === 'view'}>
                    <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select auditor</SelectItem>
                      {auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.auditor_name} onChange={e => setForm(f => ({ ...f, auditor_name: e.target.value }))} disabled={modal.mode === 'view'} placeholder="Auditor name" />
                )}
              </div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Schedule</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Planned Start</Label><Input type="date" value={form.planned_date_from} onChange={e => setForm(f => ({ ...f, planned_date_from: e.target.value }))} disabled={modal.mode === 'view'} /></div>
              <div><Label>Planned End</Label><Input type="date" value={form.planned_date_to} onChange={e => setForm(f => ({ ...f, planned_date_to: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Actual Start</Label><Input type="date" value={form.actual_date_from} onChange={e => setForm(f => ({ ...f, actual_date_from: e.target.value }))} disabled={modal.mode === 'view'} /></div>
              <div><Label>Actual End</Label><Input type="date" value={form.actual_date_to} onChange={e => setForm(f => ({ ...f, actual_date_to: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 cursor-pointer hover:text-foreground transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                Additional Details
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Control Area</Label><Input value={form.control_area} onChange={e => setForm(f => ({ ...f, control_area: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Payroll Controls" /></div>
                  <div><Label>Function Area</Label><Input value={form.function_area} onChange={e => setForm(f => ({ ...f, function_area: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Human Resources" /></div>
                  <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Head Office" /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {modal.mode !== 'view' && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Save Activity</Button>
                <Button variant="outline" onClick={() => setModal({ mode: null })}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
