import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, FileText, Users, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { cn } from '@/lib/utils';

interface AnnualPlanFormProps {
  plan?: any;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (data: any) => Promise<any>;
  onUpdate?: (data: any) => Promise<any>;
}

const STEPS = [
  { id: 'header', label: 'Plan Details', icon: Calendar, description: 'Fiscal year & title' },
  { id: 'narrative', label: 'Planning Narrative', icon: FileText, description: 'Strategy & methodology' },
  { id: 'resources', label: 'Resource Notes', icon: Users, description: 'Constraints & notes' },
];

export function AnnualPlanForm({ plan, onClose, onSuccess, onCreate, onUpdate }: AnnualPlanFormProps) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const currentYear = new Date().getFullYear();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    fiscalYear: plan?.fiscal_year || `${currentYear}-${currentYear + 1}`,
    title: plan?.title || `Annual Internal Audit Plan ${currentYear}-${currentYear + 1}`,
    executiveSummary: plan?.executive_summary || '',
    objective: plan?.objective || '',
    scope: plan?.scope || '',
    auditScope: plan?.audit_scope || '',
    methodology: plan?.methodology || '',
    planningAssumptions: plan?.planning_assumptions || '',
    exclusions: plan?.exclusions || '',
    resourceConstraints: plan?.resource_constraints || '',
    outsourcedSupportNotes: plan?.outsourced_support_notes || '',
    skillsConstraints: plan?.skills_constraints || '',
    boardCommitteeName: plan?.board_committee_name || '',
  });

  const set = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const mapToDbPayload = (status: string) => {
    const payload: any = {
      fiscal_year: formData.fiscalYear,
      title: formData.title,
      objective: formData.objective,
      scope: formData.scope,
      audit_scope: formData.auditScope,
      methodology: formData.methodology,
      executive_summary: formData.executiveSummary,
      planning_assumptions: formData.planningAssumptions,
      exclusions: formData.exclusions,
      resource_constraints: formData.resourceConstraints,
      outsourced_support_notes: formData.outsourcedSupportNotes,
      skills_constraints: formData.skillsConstraints,
      board_committee_name: formData.boardCommitteeName,
      status,
    };
    if (!plan) {
      payload.created_by = userCode || 'system';
      payload.plan_owner = userCode || 'system';
      payload.prepared_by = userCode || 'system';
    }
    payload.updated_by = userCode || 'system';
    if (status === 'Submitted') {
      payload.submitted_date = new Date().toISOString();
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Validation Error', description: 'Plan title is required.', variant: 'destructive' });
      setCurrentStep(0);
      return;
    }
    if (!formData.fiscalYear.trim()) {
      toast({ title: 'Validation Error', description: 'Fiscal year is required.', variant: 'destructive' });
      setCurrentStep(0);
      return;
    }
    setIsSaving(true);
    try {
      const payload = mapToDbPayload('Draft');
      if (plan && onUpdate) {
        await onUpdate({ id: plan.id, ...payload });
      } else if (onCreate) {
        await onCreate(payload);
      }
      toast({
        title: 'Draft Saved',
        description: plan ? 'Annual audit plan updated.' : 'Annual audit plan created. Add engagements from the plan workspace.'
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error?.message || 'Could not save the plan.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const canGoNext = currentStep < STEPS.length - 1;
  const canGoBack = currentStep > 0;

  return (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-1 pb-5 border-b border-border mb-5">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left flex-1 min-w-0",
                  isActive && "bg-primary/10 ring-1 ring-primary/30",
                  !isActive && !isCompleted && "hover:bg-muted/60",
                  isCompleted && "hover:bg-muted/60"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 hidden md:block">
                  <p className={cn(
                    "text-xs font-medium truncate",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>{step.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Plan Identification</h3>
              <p className="text-xs text-muted-foreground mb-4">Set the fiscal year and plan title. All other details can be added later.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fiscal Year <span className="text-destructive">*</span></Label>
                <Select value={formData.fiscalYear} onValueChange={v => set('fiscalYear', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={`${currentYear - 1}-${currentYear}`}>{currentYear - 1}-{currentYear}</SelectItem>
                    <SelectItem value={`${currentYear}-${currentYear + 1}`}>{currentYear}-{currentYear + 1}</SelectItem>
                    <SelectItem value={`${currentYear + 1}-${currentYear + 2}`}>{currentYear + 1}-{currentYear + 2}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Title <span className="text-destructive">*</span></Label>
                <Input value={formData.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Internal Audit Plan 2026-2027" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Board / Committee Name</Label>
              <Input value={formData.boardCommitteeName} onChange={e => set('boardCommitteeName', e.target.value)} placeholder="e.g. Audit & Risk Committee" />
              <p className="text-[10px] text-muted-foreground">Optional — the oversight body this plan will be presented to.</p>
            </div>
            {plan && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 text-xs border border-border/50">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Created By</span>
                  <span className="font-medium text-foreground">{plan.created_by || plan.plan_owner || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Updated By</span>
                  <span className="font-medium text-foreground">{plan.updated_by || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Created On</span>
                  <span className="font-medium text-foreground">{plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Last Updated</span>
                  <span className="font-medium text-foreground">{plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-primary"><strong>Tip:</strong> You only need the fiscal year and title to create a plan. Resource totals, capacity, and approval details are automatically computed from engagements and the approval workflow.</p>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Planning Narrative</h3>
              <p className="text-xs text-muted-foreground mb-4">Define the strategic context for the annual audit plan. These sections appear in the board pack.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Executive Summary</Label>
                <Textarea placeholder="High-level summary for board presentation..." value={formData.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={3} className="resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Overall Audit Objective</Label>
                  <Textarea placeholder="Primary objective for the fiscal year..." value={formData.objective} onChange={e => set('objective', e.target.value)} rows={3} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Audit Universe / Scope</Label>
                  <Textarea placeholder="Define audit universe and scope coverage..." value={formData.scope} onChange={e => set('scope', e.target.value)} rows={3} className="resize-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Methodology</Label>
                <Textarea placeholder="Describe the audit methodology applied..." value={formData.methodology} onChange={e => set('methodology', e.target.value)} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Planning Assumptions</Label>
                  <Textarea placeholder="Key assumptions underpinning the plan..." value={formData.planningAssumptions} onChange={e => set('planningAssumptions', e.target.value)} rows={2} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Exclusions</Label>
                  <Textarea placeholder="Areas explicitly excluded from coverage..." value={formData.exclusions} onChange={e => set('exclusions', e.target.value)} rows={2} className="resize-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Resource Notes & Constraints</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Capacity totals (days, weeks, utilization) are <strong>auto-calculated</strong> from your engagements. 
                Use this section for qualitative notes only.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">How resource capacity works:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Total Planned Days & Weeks</strong> — summed automatically from all engagements in this plan.</li>
                <li><strong>Available Days</strong> — calculated from the number of auditors in your department × working days in the fiscal year.</li>
                <li><strong>Contingency</strong> — reserved automatically as a percentage of available capacity (configurable in Audit Settings). Default is 10%.</li>
                <li><strong>Utilization %</strong> — shown in the plan Overview once engagements are added.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Resource Constraints</Label>
                <Textarea placeholder="Known resource constraints and mitigation strategies..." value={formData.resourceConstraints} onChange={e => set('resourceConstraints', e.target.value)} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Outsourced / Co-sourced Support</Label>
                  <Textarea placeholder="External resource arrangements..." value={formData.outsourcedSupportNotes} onChange={e => set('outsourcedSupportNotes', e.target.value)} rows={2} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Skills & Competency Constraints</Label>
                  <Textarea placeholder="Gaps in skills or certifications..." value={formData.skillsConstraints} onChange={e => set('skillsConstraints', e.target.value)} rows={2} className="resize-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4 mt-auto flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <div className="flex items-center gap-2">
          {canGoBack && (
            <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
          )}
          {canGoNext && (
            <Button variant="outline" onClick={() => setCurrentStep(s => s + 1)}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {plan ? 'Update Plan' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
