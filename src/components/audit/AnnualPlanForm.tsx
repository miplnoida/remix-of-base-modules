import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AnnualPlanFormProps {
  plan?: any;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (data: any) => Promise<any>;
  onUpdate?: (data: any) => Promise<any>;
}

export function AnnualPlanForm({ plan, onClose, onSuccess, onCreate, onUpdate }: AnnualPlanFormProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fiscalYear: plan?.fiscal_year || `${currentYear}-${currentYear + 1}`,
    title: plan?.title || `Annual Internal Audit Plan ${currentYear}-${currentYear + 1}`,
    objective: plan?.objective || '',
    scope: plan?.scope || '',
    auditScope: plan?.audit_scope || '',
    methodology: plan?.methodology || '',
    // Planning narrative
    executiveSummary: plan?.executive_summary || '',
    planningAssumptions: plan?.planning_assumptions || '',
    exclusions: plan?.exclusions || '',
    resourceConstraints: plan?.resource_constraints || '',
    planOwner: plan?.plan_owner || '',
    preparedBy: plan?.prepared_by || '',
    // Resource summary
    totalAvailableHours: plan?.total_available_hours || '',
    plannedHours: plan?.planned_hours || '',
    contingencyHours: plan?.contingency_hours || '',
    outsourcedSupportNotes: plan?.outsourced_support_notes || '',
    skillsConstraints: plan?.skills_constraints || '',
    // Governance
    boardCommitteeName: plan?.board_committee_name || '',
    approvalNote: plan?.approval_note || '',
    minutesReference: plan?.minutes_reference || '',
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
      plan_owner: formData.planOwner,
      prepared_by: formData.preparedBy,
      total_available_hours: formData.totalAvailableHours ? Number(formData.totalAvailableHours) : null,
      planned_hours: formData.plannedHours ? Number(formData.plannedHours) : null,
      contingency_hours: formData.contingencyHours ? Number(formData.contingencyHours) : null,
      outsourced_support_notes: formData.outsourcedSupportNotes,
      skills_constraints: formData.skillsConstraints,
      board_committee_name: formData.boardCommitteeName,
      approval_note: formData.approvalNote,
      minutes_reference: formData.minutesReference,
      status,
    };
    if (status === 'Submitted') {
      payload.submitted_date = new Date().toISOString();
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Validation Error', description: 'Plan title is required.', variant: 'destructive' });
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

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <Accordion type="multiple" defaultValue={['header', 'narrative']} className="space-y-2">
        {/* A. Plan Header */}
        <AccordionItem value="header" className="border rounded-lg">
          <AccordionTrigger className="px-4 text-sm font-semibold">Plan Header</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fiscal Year *</Label>
                <Select value={formData.fiscalYear} onValueChange={v => set('fiscalYear', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={`${currentYear - 1}-${currentYear}`}>{currentYear - 1}-{currentYear}</SelectItem>
                    <SelectItem value={`${currentYear}-${currentYear + 1}`}>{currentYear}-{currentYear + 1}</SelectItem>
                    <SelectItem value={`${currentYear + 1}-${currentYear + 2}`}>{currentYear + 1}-{currentYear + 2}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Title *</Label>
                <Input value={formData.title} onChange={e => set('title', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Owner</Label>
                <Input value={formData.planOwner} onChange={e => set('planOwner', e.target.value)} placeholder="Chief Audit Executive" />
              </div>
              <div className="space-y-2">
                <Label>Prepared By</Label>
                <Input value={formData.preparedBy} onChange={e => set('preparedBy', e.target.value)} placeholder="Audit Manager" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* B. Planning Narrative */}
        <AccordionItem value="narrative" className="border rounded-lg">
          <AccordionTrigger className="px-4 text-sm font-semibold">Planning Narrative</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label>Executive Summary</Label>
              <Textarea placeholder="High-level summary of the annual audit plan for board presentation..." value={formData.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Overall Audit Objective</Label>
              <Textarea placeholder="Enter the overall audit objective for the fiscal year..." value={formData.objective} onChange={e => set('objective', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Audit Universe / Scope</Label>
              <Textarea placeholder="Define the audit universe and scope coverage..." value={formData.scope} onChange={e => set('scope', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Methodology</Label>
              <Textarea placeholder="Describe the overall audit methodology..." value={formData.methodology} onChange={e => set('methodology', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Planning Assumptions</Label>
              <Textarea placeholder="Key assumptions underpinning the plan..." value={formData.planningAssumptions} onChange={e => set('planningAssumptions', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Exclusions</Label>
              <Textarea placeholder="Areas explicitly excluded from coverage..." value={formData.exclusions} onChange={e => set('exclusions', e.target.value)} rows={2} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* C. Resource Summary */}
        <AccordionItem value="resources" className="border rounded-lg">
          <AccordionTrigger className="px-4 text-sm font-semibold">Resource Summary</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Available Hours</Label>
                <Input type="number" value={formData.totalAvailableHours} onChange={e => set('totalAvailableHours', e.target.value)} placeholder="e.g. 5000" />
              </div>
              <div className="space-y-2">
                <Label>Planned Hours</Label>
                <Input type="number" value={formData.plannedHours} onChange={e => set('plannedHours', e.target.value)} placeholder="e.g. 4200" />
              </div>
              <div className="space-y-2">
                <Label>Contingency Hours</Label>
                <Input type="number" value={formData.contingencyHours} onChange={e => set('contingencyHours', e.target.value)} placeholder="e.g. 800" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resource Constraints</Label>
              <Textarea placeholder="Known resource constraints and mitigation strategies..." value={formData.resourceConstraints} onChange={e => set('resourceConstraints', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Outsourced / Co-sourced Support</Label>
              <Textarea placeholder="External resource arrangements..." value={formData.outsourcedSupportNotes} onChange={e => set('outsourcedSupportNotes', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Skills & Competency Constraints</Label>
              <Textarea placeholder="Gaps in skills or certifications..." value={formData.skillsConstraints} onChange={e => set('skillsConstraints', e.target.value)} rows={2} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* D. Governance */}
        <AccordionItem value="governance" className="border rounded-lg">
          <AccordionTrigger className="px-4 text-sm font-semibold">Governance</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Board / Committee Name</Label>
                <Input value={formData.boardCommitteeName} onChange={e => set('boardCommitteeName', e.target.value)} placeholder="Audit & Risk Committee" />
              </div>
              <div className="space-y-2">
                <Label>Minutes Reference</Label>
                <Input value={formData.minutesReference} onChange={e => set('minutesReference', e.target.value)} placeholder="e.g. ARC-2026-03" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Approval Note</Label>
              <Textarea placeholder="Any notes related to governance approval..." value={formData.approvalNote} onChange={e => set('approvalNote', e.target.value)} rows={2} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end space-x-4 pt-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {plan ? 'Update Plan' : 'Create Plan'}
        </Button>
      </div>
    </div>
  );
}
