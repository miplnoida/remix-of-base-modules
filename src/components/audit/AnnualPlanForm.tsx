import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

interface AnnualPlanFormProps {
  plan?: any;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (data: any) => Promise<any>;
  onUpdate?: (data: any) => Promise<any>;
}

function deriveRiskLevel(score: number) {
  if (score >= 16) return 'Critical';
  if (score >= 11) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

export function AnnualPlanForm({ plan, onClose, onSuccess, onCreate, onUpdate }: AnnualPlanFormProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [isSaving, setIsSaving] = useState(false);

  const { data: departments = [] } = useIADepartments();
  const { data: assessments = [] } = useIARiskAssessments();

  const [formData, setFormData] = useState({
    fiscalYear: plan?.fiscal_year || `${currentYear}-${currentYear + 1}`,
    title: plan?.title || `Annual Internal Audit Plan ${currentYear}-${currentYear + 1}`,
    departmentId: plan?.department_id || '',
    objective: plan?.objective || '',
    scope: plan?.scope || '',
    auditScope: plan?.audit_scope || '',
    methodology: plan?.methodology || '',
    plannedStartDate: plan?.planned_start_date || '',
    plannedEndDate: plan?.planned_end_date || '',
    riskLevel: plan?.risk_level || '',
    assignedAuditor: plan?.assigned_auditor || '',
  });

  // Selected functions to include in the plan
  const [selectedFunctions, setSelectedFunctions] = useState<Array<{ function_id: string; risk_score: number; risk_level: string; priority: string }>>([]);

  // Cascading: selected department → its functions
  const { data: deptFunctions = [] } = useIADepartmentFunctions(formData.departmentId || undefined);

  // Build function risk map from assessments
  const functionRiskMap = useMemo(() => {
    const map: Record<string, { score: number; level: string }> = {};
    (assessments || []).forEach((a: any) => {
      const score = Number(a.overall_risk_score) || (Number(a.impact_score) || 0) * (Number(a.likelihood_score) || 0);
      map[a.function_id] = { score, level: a.risk_level || deriveRiskLevel(score) };
    });
    return map;
  }, [assessments]);

  // Auto-suggest high/critical risk functions
  const suggestedFunctions = useMemo(() => {
    return (deptFunctions || []).filter((fn: any) => {
      const risk = functionRiskMap[fn.id];
      return risk && ['High', 'Critical'].includes(risk.level);
    });
  }, [deptFunctions, functionRiskMap]);

  const addFunction = (functionId: string) => {
    if (selectedFunctions.some(f => f.function_id === functionId)) return;
    const risk = functionRiskMap[functionId] || { score: 0, level: 'Low' };
    setSelectedFunctions(prev => [...prev, {
      function_id: functionId,
      risk_score: risk.score,
      risk_level: risk.level,
      priority: ['High', 'Critical'].includes(risk.level) ? 'High' : 'Normal',
    }]);
  };

  const removeFunction = (functionId: string) => {
    setSelectedFunctions(prev => prev.filter(f => f.function_id !== functionId));
  };

  const getFunctionName = (fid: string) => (deptFunctions || []).find((f: any) => f.id === fid)?.function_name || fid.slice(0, 8);

  const mapToDbPayload = (status: string) => {
    const payload: any = {
      fiscal_year: formData.fiscalYear,
      title: formData.title,
      department_id: formData.departmentId || null,
      objective: formData.objective,
      scope: formData.scope,
      audit_scope: formData.auditScope,
      methodology: formData.methodology,
      planned_start_date: formData.plannedStartDate || null,
      planned_end_date: formData.plannedEndDate || null,
      risk_level: formData.riskLevel || null,
      assigned_auditor: formData.assignedAuditor || null,
      status,
    };
    if (status === 'Submitted') {
      payload.submitted_date = new Date().toISOString();
    }
    // Attach selected functions as metadata (will be inserted separately)
    payload._selectedFunctions = selectedFunctions;
    return payload;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = mapToDbPayload('Draft');
      const funcs = payload._selectedFunctions;
      delete payload._selectedFunctions;
      if (plan && onUpdate) {
        await onUpdate({ id: plan.id, ...payload });
      } else if (onCreate) {
        await onCreate(payload);
      }
      toast({
        title: "Draft Saved",
        description: plan ? "Annual audit plan has been updated." : "Annual audit plan has been saved as draft."
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      toast({ title: "Save Failed", description: error?.message || "Could not save the plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.objective || !formData.scope) {
      toast({ title: "Validation Error", description: "Please fill objective and scope.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = mapToDbPayload('Submitted');
      const funcs = payload._selectedFunctions;
      delete payload._selectedFunctions;
      if (plan && onUpdate) {
        await onUpdate({ id: plan.id, ...payload });
      } else if (onCreate) {
        await onCreate(payload);
      }
      toast({
        title: plan ? "Plan Updated" : "Plan Submitted",
        description: plan ? "Annual audit plan has been updated." : "Annual audit plan has been submitted for review."
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit plan:', error);
      toast({ title: "Submit Failed", description: error?.message || "Could not submit the plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const functionColumns: DataTableColumn<any>[] = [
    { key: 'function_id', header: 'Function', render: (r) => getFunctionName(r.function_id) },
    { key: 'risk_score', header: 'Risk Score', render: (r) => r.risk_score || '—' },
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level || 'Low'} /> },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority || 'Normal'} /> },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Annual Plan Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year *</Label>
              <Select value={formData.fiscalYear} onValueChange={(value) => setFormData({ ...formData, fiscalYear: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={`${currentYear-1}-${currentYear}`}>{currentYear-1}-{currentYear}</SelectItem>
                  <SelectItem value={`${currentYear}-${currentYear+1}`}>{currentYear}-{currentYear+1}</SelectItem>
                  <SelectItem value={`${currentYear+1}-${currentYear+2}`}>{currentYear+1}-{currentYear+2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
          </div>

          {/* Department Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select value={formData.riskLevel} onValueChange={v => setFormData({ ...formData, riskLevel: v })}>
                <SelectTrigger><SelectValue placeholder="Select risk level" /></SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High', 'Critical'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Planned Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start Date</Label>
              <Input type="date" value={formData.plannedStartDate} onChange={e => setFormData({ ...formData, plannedStartDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Planned End Date</Label>
              <Input type="date" value={formData.plannedEndDate} onChange={e => setFormData({ ...formData, plannedEndDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Overall Audit Objective *</Label>
            <Textarea placeholder="Enter the overall objective..." value={formData.objective} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Audit Scope *</Label>
            <Textarea placeholder="Define the scope..." value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Methodology</Label>
            <Textarea placeholder="Describe the audit methodology..." value={formData.methodology} onChange={(e) => setFormData({ ...formData, methodology: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Functions to Include */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Functions Included in Plan</CardTitle>
            {formData.departmentId && (
              <Select onValueChange={addFunction}>
                <SelectTrigger className="w-[250px]"><SelectValue placeholder="Add function..." /></SelectTrigger>
                <SelectContent>
                  {(deptFunctions || []).filter((fn: any) => !selectedFunctions.some(sf => sf.function_id === fn.id)).map((fn: any) => {
                    const risk = functionRiskMap[fn.id];
                    return <SelectItem key={fn.id} value={fn.id}>{fn.function_name} {risk ? `(${risk.level})` : ''}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {suggestedFunctions.length > 0 && selectedFunctions.length === 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Suggested High/Critical Risk Functions:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedFunctions.map((fn: any) => (
                  <Button key={fn.id} size="sm" variant="outline" onClick={() => addFunction(fn.id)}>
                    <Plus className="h-3 w-3 mr-1" />{fn.function_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedFunctions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {formData.departmentId ? 'No functions selected. Add functions from the dropdown above.' : 'Select a department first to add functions.'}
            </p>
          ) : (
            <DataTable
              columns={functionColumns}
              data={selectedFunctions}
              renderActions={(row) => (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFunction(row.function_id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit for Review
        </Button>
      </div>
    </div>
  );
}
