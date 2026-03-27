import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, ShieldCheck, Info, Save } from 'lucide-react';
import { useIADepartments, useIADepartmentFunctions, useIAActiveAuditors } from '@/hooks/useAuditData';
import { useResolvedEngagementRisk } from '@/hooks/useEngagementRisk';
import { StatusBadge } from '@/components/common';
import { useToast } from '@/hooks/use-toast';

const ENGAGEMENT_TYPES = ['Planned Audit', 'Ad-hoc Audit', 'Management Requested Audit', 'Special Investigation', 'Follow-up Audit'];
const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low'];
const COVERAGE_CATEGORIES = ['Compliance', 'Financial', 'Operational', 'IT', 'Governance', 'Special'];
const ENGAGEMENT_STATUSES = ['Draft', 'Planned', 'Ready', 'In Preparation', 'In Progress', 'Completed', 'Closed', 'Cancelled'];

const RISK_SOURCE_LABELS: Record<string, string> = {
  risk_assessment_function: 'Function Risk Assessment',
  function_risk_rating: 'Function Risk Rating',
  department_risk_rating: 'Department Risk Rating',
  default: 'Default (no risk data available)',
};

interface EditEngagementDialogProps {
  open: boolean;
  onClose: () => void;
  engagement: any | null; // null = add mode
  planId: string;
  planFiscalYear?: string;
  onSave: (payload: any) => void;
  isSaving?: boolean;
  isApprovedPlan?: boolean;
}

export function EditEngagementDialog({
  open, onClose, engagement, planId, planFiscalYear, onSave, isSaving, isApprovedPlan
}: EditEngagementDialogProps) {
  const { toast } = useToast();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAActiveAuditors();
  const isEditMode = !!engagement;

  const [dirty, setDirty] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [form, setForm] = useState({
    engagement_name: '',
    department_id: '',
    function_id: '',
    engagement_type: 'Planned Audit',
    engagement_risk_rating: 'Medium',
    risk_override: false,
    risk_override_reason: '',
    derived_risk_rating: '',
    planned_start_date: '',
    planned_end_date: '',
    lead_auditor_id: '',
    supportive_auditor_ids: [] as string[],
    reviewer_id: '',
    scope: '',
    objectives: '',
    quarter: '',
    month: '',
    estimated_hours: '',
    estimated_days: '',
    inclusion_rationale: '',
    coverage_category: '',
    board_priority_flag: false,
    is_adhoc: false,
    status: 'Planned',
    expected_deliverable: '',
    dependencies: '',
    scheduling_notes: '',
    auditee_contact: '',
    auditable_area_summary: '',
    sequence_no: '',
  });

  // Load engagement data when editing
  useEffect(() => {
    if (engagement && open) {
      setForm({
        engagement_name: engagement.engagement_name || '',
        department_id: engagement.department_id || '',
        function_id: engagement.function_id || '',
        engagement_type: engagement.engagement_type || 'Planned Audit',
        engagement_risk_rating: engagement.engagement_risk_rating || 'Medium',
        risk_override: false,
        risk_override_reason: '',
        derived_risk_rating: '',
        planned_start_date: engagement.planned_start_date || '',
        planned_end_date: engagement.planned_end_date || '',
        lead_auditor_id: engagement.lead_auditor_id || '',
        supportive_auditor_ids: Array.isArray(engagement.supportive_auditor_ids) ? engagement.supportive_auditor_ids : [],
        reviewer_id: engagement.reviewer_id || '',
        scope: engagement.scope || '',
        objectives: engagement.objectives || '',
        quarter: engagement.quarter || '',
        month: engagement.month || '',
        estimated_hours: engagement.estimated_hours?.toString() || '',
        estimated_days: engagement.estimated_days?.toString() || '',
        inclusion_rationale: engagement.inclusion_rationale || '',
        coverage_category: engagement.coverage_category || '',
        board_priority_flag: engagement.board_priority_flag || false,
        is_adhoc: engagement.is_adhoc || false,
        status: engagement.status || 'Planned',
        expected_deliverable: engagement.expected_deliverable || '',
        dependencies: engagement.dependencies || '',
        scheduling_notes: engagement.scheduling_notes || '',
        auditee_contact: engagement.auditee_contact || '',
        auditable_area_summary: engagement.auditable_area_summary || '',
        sequence_no: engagement.sequence_no?.toString() || '',
      });
      setDirty(false);
    } else if (!engagement && open) {
      // Reset for add mode
      setForm({
        engagement_name: '', department_id: '', function_id: '', engagement_type: 'Planned Audit',
        engagement_risk_rating: 'Medium', risk_override: false, risk_override_reason: '', derived_risk_rating: '',
        planned_start_date: '', planned_end_date: '', lead_auditor_id: '', supportive_auditor_ids: [],
        reviewer_id: '', scope: '', objectives: '', quarter: '', month: '', estimated_hours: '', estimated_days: '',
        inclusion_rationale: '', coverage_category: '', board_priority_flag: false, is_adhoc: false, status: 'Planned',
        expected_deliverable: '', dependencies: '', scheduling_notes: '', auditee_contact: '',
        auditable_area_summary: '', sequence_no: '',
      });
      setDirty(false);
    }
  }, [engagement, open]);

  const { data: deptFunctions = [] } = useIADepartmentFunctions(form.department_id || undefined);
  const { data: resolvedRisk, isLoading: riskLoading } = useResolvedEngagementRisk(
    form.department_id || undefined,
    form.function_id || undefined
  );

  useEffect(() => {
    if (resolvedRisk && !form.risk_override && !isEditMode) {
      updateField('engagement_risk_rating', resolvedRisk.risk_rating);
      updateField('derived_risk_rating', resolvedRisk.risk_rating);
    }
  }, [resolvedRisk, form.risk_override]);

  const mappedAuditors = (auditors || []).filter((a: any) => a.profile_id || a.user_id);
  const unmappedAuditors = (auditors || []).filter((a: any) => !a.profile_id && !a.user_id);

  const updateField = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const toggleAuditor = (id: string) => {
    setForm(f => ({
      ...f,
      supportive_auditor_ids: f.supportive_auditor_ids.includes(id)
        ? f.supportive_auditor_ids.filter(x => x !== id)
        : [...f.supportive_auditor_ids, id],
    }));
    setDirty(true);
  };

  const handleClose = () => {
    if (dirty) {
      if (!confirm('You have unsaved changes. Discard?')) return;
    }
    onClose();
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.engagement_name.trim()) errors.push('Engagement title is required');
    if (!form.department_id) errors.push('Department is required');
    if (!form.function_id) errors.push('Business function is required');
    if (!form.lead_auditor_id) errors.push('Lead auditor is required');
    if (!form.quarter) errors.push('Quarter is required');
    if (!form.estimated_hours) errors.push('Estimated hours is required');
    if (form.planned_start_date && form.planned_end_date && form.planned_start_date > form.planned_end_date) {
      errors.push('Planned start date must be before end date');
    }
    return errors;
  };

  const generateCode = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `ENG-${dateStr}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  };

  const handleSubmit = () => {
    const errors = validate();
    if (errors.length > 0) {
      toast({ title: 'Validation Errors', description: errors[0], variant: 'destructive' });
      return;
    }

    const payload: any = {
      engagement_name: form.engagement_name,
      annual_plan_id: planId,
      department_id: form.department_id || null,
      function_id: form.function_id || null,
      engagement_type: form.engagement_type,
      engagement_risk_rating: form.engagement_risk_rating || 'Medium',
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      lead_auditor_id: form.lead_auditor_id || null,
      supportive_auditor_ids: form.supportive_auditor_ids,
      reviewer_id: form.reviewer_id || null,
      scope: form.scope || null,
      objectives: form.objectives || null,
      status: form.status || 'Planned',
      quarter: form.quarter || null,
      month: form.month || null,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      estimated_days: form.estimated_days ? Number(form.estimated_days) : null,
      inclusion_rationale: form.inclusion_rationale || null,
      coverage_category: form.coverage_category || null,
      board_priority_flag: form.board_priority_flag,
      is_adhoc: form.is_adhoc,
      expected_deliverable: form.expected_deliverable || null,
      dependencies: form.dependencies || null,
      scheduling_notes: form.scheduling_notes || null,
      auditee_contact: form.auditee_contact || null,
      auditable_area_summary: form.auditable_area_summary || null,
      sequence_no: form.sequence_no ? Number(form.sequence_no) : null,
    };

    if (isEditMode) {
      payload.id = engagement.id;
    } else {
      payload.engagement_code = generateCode();
    }

    if (form.risk_override && form.risk_override_reason) {
      payload.risk_override_reason = form.risk_override_reason;
      payload.derived_risk_rating = form.derived_risk_rating;
    }

    onSave(payload);
  };

  const confirmOverride = (selectedRisk: string) => {
    if (!overrideReason.trim()) return;
    setForm(f => ({
      ...f,
      engagement_risk_rating: selectedRisk,
      risk_override: true,
      risk_override_reason: overrideReason.trim(),
    }));
    setDirty(true);
    setShowOverrideDialog(false);
  };

  const clearOverride = () => {
    if (resolvedRisk) {
      setForm(f => ({
        ...f,
        engagement_risk_rating: resolvedRisk.risk_rating,
        risk_override: false,
        risk_override_reason: '',
      }));
      setDirty(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? 'Edit Engagement' : 'Add Engagement to Plan'}
            {isApprovedPlan && isEditMode && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Amendment Required</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="identity" className="mt-2">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="identity">Identity & Coverage</TabsTrigger>
            <TabsTrigger value="planning">Planning Narrative</TabsTrigger>
            <TabsTrigger value="team">Team & Ownership</TabsTrigger>
            <TabsTrigger value="schedule">Schedule & Resources</TabsTrigger>
          </TabsList>

          {/* Identity & Coverage */}
          <TabsContent value="identity" className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Engagement Title *</Label>
                <Input value={form.engagement_name} onChange={e => updateField('engagement_name', e.target.value)} placeholder="e.g. IT Security Audit" />
              </div>
              <div>
                <Label>Engagement Type</Label>
                <Select value={form.engagement_type} onValueChange={v => updateField('engagement_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENGAGEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department *</Label>
                <Select value={form.department_id} onValueChange={v => { updateField('department_id', v); updateField('function_id', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Business Function *</Label>
                <Select value={form.function_id} onValueChange={v => updateField('function_id', v)} disabled={!form.department_id}>
                  <SelectTrigger><SelectValue placeholder={form.department_id ? 'Select function' : 'Select department first'} /></SelectTrigger>
                  <SelectContent>{deptFunctions.map((fn: any) => <SelectItem key={fn.id} value={fn.id}>{fn.function_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Risk */}
            <div className="rounded-md border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Risk Rating</Label>
                </div>
                {form.risk_override ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearOverride}>Reset to Auto</Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setOverrideReason(''); setShowOverrideDialog(true); }} disabled={!form.department_id}>Override</Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {riskLoading ? (
                  <span className="text-xs text-muted-foreground">Resolving risk...</span>
                ) : (
                  <>
                    <StatusBadge status={form.engagement_risk_rating || 'Medium'} />
                    {resolvedRisk && (
                      <span className="text-xs text-muted-foreground">
                        Source: {RISK_SOURCE_LABELS[resolvedRisk.source] || resolvedRisk.source}
                      </span>
                    )}
                  </>
                )}
              </div>
              {form.risk_override && (
                <div className="flex items-start gap-2 mt-1 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium text-destructive">Manual Override</span>
                    <span className="text-muted-foreground"> — Auto-derived was </span>
                    <StatusBadge status={form.derived_risk_rating} />
                    <p className="text-muted-foreground mt-0.5">Reason: {form.risk_override_reason}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Coverage Category</Label>
                <Select value={form.coverage_category} onValueChange={v => updateField('coverage_category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{COVERAGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENGAGEMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inclusion Rationale</Label>
                <Input value={form.inclusion_rationale} onChange={e => updateField('inclusion_rationale', e.target.value)} placeholder="Why this audit is included in the plan" />
              </div>
              <div>
                <Label>Sequence No.</Label>
                <Input type="number" value={form.sequence_no} onChange={e => updateField('sequence_no', e.target.value)} placeholder="e.g. 1" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.board_priority_flag} onCheckedChange={(c) => { updateField('board_priority_flag', !!c); }} />
                Board Priority
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.is_adhoc} onCheckedChange={(c) => { updateField('is_adhoc', !!c); }} />
                Ad-hoc Audit
              </label>
            </div>
          </TabsContent>

          {/* Planning Narrative */}
          <TabsContent value="planning" className="space-y-4 mt-3">
            <div>
              <Label>Objective</Label>
              <Textarea value={form.objectives} onChange={e => updateField('objectives', e.target.value)} placeholder="What this engagement aims to achieve..." rows={3} />
            </div>
            <div>
              <Label>Scope</Label>
              <Textarea value={form.scope} onChange={e => updateField('scope', e.target.value)} placeholder="What areas/processes will be reviewed..." rows={3} />
            </div>
            <div>
              <Label>Auditable Area Summary</Label>
              <Textarea value={form.auditable_area_summary} onChange={e => updateField('auditable_area_summary', e.target.value)} placeholder="Key areas to be audited..." rows={2} />
            </div>
            <div>
              <Label>Expected Deliverable</Label>
              <Input value={form.expected_deliverable} onChange={e => updateField('expected_deliverable', e.target.value)} placeholder="e.g. Audit Report, Management Letter" />
            </div>
            <div>
              <Label>Dependencies / Preconditions</Label>
              <Textarea value={form.dependencies} onChange={e => updateField('dependencies', e.target.value)} placeholder="Any prerequisites or dependencies..." rows={2} />
            </div>
          </TabsContent>

          {/* Team & Ownership */}
          <TabsContent value="team" className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead Auditor *</Label>
                <Select value={form.lead_auditor_id} onValueChange={v => updateField('lead_auditor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
                  <SelectContent>
                    {mappedAuditors.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} — {a.role}</SelectItem>
                    ))}
                    {unmappedAuditors.length > 0 && (
                      <div className="px-2 py-1.5 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />{unmappedAuditors.length} auditor(s) hidden — not linked to system users
                        </p>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reviewer</Label>
                <Select value={form.reviewer_id} onValueChange={v => updateField('reviewer_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {mappedAuditors.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} — {a.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Support Auditor(s)</Label>
              <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1 bg-background">
                {mappedAuditors.filter((a: any) => a.id !== form.lead_auditor_id).map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <Checkbox checked={form.supportive_auditor_ids.includes(a.id)} onCheckedChange={() => toggleAuditor(a.id)} />
                    {a.name} <span className="text-xs text-muted-foreground">({a.role})</span>
                  </label>
                ))}
                {mappedAuditors.filter((a: any) => a.id !== form.lead_auditor_id).length === 0 && (
                  <p className="text-xs text-muted-foreground p-1">No mapped auditors available</p>
                )}
              </div>
            </div>

            <div>
              <Label>Auditee Contact</Label>
              <Input value={form.auditee_contact} onChange={e => updateField('auditee_contact', e.target.value)} placeholder="Name of the auditee contact" />
            </div>
          </TabsContent>

          {/* Schedule & Resources */}
          <TabsContent value="schedule" className="space-y-4 mt-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quarter *</Label>
                <Select value={form.quarter} onValueChange={v => updateField('quarter', v)}>
                  <SelectTrigger><SelectValue placeholder="Select quarter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Month</Label>
                <Select value={form.month} onValueChange={v => updateField('month', v)}>
                  <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Hours *</Label>
                <Input type="number" value={form.estimated_hours} onChange={e => updateField('estimated_hours', e.target.value)} placeholder="e.g. 120" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Planned Start Date</Label>
                <Input type="date" value={form.planned_start_date} onChange={e => updateField('planned_start_date', e.target.value)} />
              </div>
              <div>
                <Label>Planned End Date</Label>
                <Input type="date" value={form.planned_end_date} onChange={e => updateField('planned_end_date', e.target.value)} />
              </div>
              <div>
                <Label>Estimated Days</Label>
                <Input type="number" value={form.estimated_days} onChange={e => updateField('estimated_days', e.target.value)} placeholder="e.g. 15" />
              </div>
            </div>
            <div>
              <Label>Scheduling Notes</Label>
              <Textarea value={form.scheduling_notes} onChange={e => updateField('scheduling_notes', e.target.value)} placeholder="Any scheduling considerations..." rows={2} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Engagement'}
          </Button>
        </DialogFooter>

        {/* Risk Override Sub-Dialog */}
        {showOverrideDialog && (
          <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />Override Risk Rating
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="text-muted-foreground">Auto-derived risk:</p>
                  <StatusBadge status={form.derived_risk_rating || 'Medium'} />
                </div>
                <div>
                  <Label>New Risk Rating *</Label>
                  <Select onValueChange={v => updateField('engagement_risk_rating', v)}>
                    <SelectTrigger><SelectValue placeholder="Select new risk level" /></SelectTrigger>
                    <SelectContent>
                      {RISK_RATINGS.filter(r => r !== form.derived_risk_rating).map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Override Reason *</Label>
                  <Textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain the override..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>Cancel</Button>
                <Button onClick={() => confirmOverride(form.engagement_risk_rating)} disabled={!overrideReason.trim()}>
                  Confirm Override
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
