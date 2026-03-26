import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap } from 'lucide-react';
import { useIADepartments, useIAActiveAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';

interface DepartmentAuditFormProps {
  annualPlanId?: string;
  departmentAudit?: any;
  isAdHoc?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (data: any) => Promise<any>;
  onUpdate?: (data: any) => Promise<any>;
}

export function DepartmentAuditForm({ annualPlanId, departmentAudit, isAdHoc = false, onClose, onSuccess, onCreate, onUpdate }: DepartmentAuditFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: departments = [] } = useIADepartments();
  const { data: activeAuditors = [] } = useIAActiveAuditors();
  
  const [formData, setFormData] = useState({
    departmentId: departmentAudit?.department_id || '',
    period: (departmentAudit?.period || 'Q1') as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Monthly',
    monthYear: departmentAudit?.month_year || '',
    selectedFunctions: departmentAudit?.functions || [] as string[],
    objective: departmentAudit?.objective || '',
    scope: departmentAudit?.scope || '',
    riskRating: (departmentAudit?.risk_rating || 'Medium') as 'Low' | 'Medium' | 'High',
    leadAuditor: departmentAudit?.lead_auditor_id || '',
    teamMembers: departmentAudit?.team_member_ids || [] as string[],
    plannedStart: departmentAudit?.planned_start || '',
    plannedEnd: departmentAudit?.planned_end || ''
  });

  const { data: departmentFunctions = [] } = useIADepartmentFunctions(formData.departmentId || undefined);

  const selectedDepartment = departments.find((d: any) => d.id === formData.departmentId);

  const toggleFunction = (func: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFunctions: prev.selectedFunctions.includes(func)
        ? prev.selectedFunctions.filter((f: string) => f !== func)
        : [...prev.selectedFunctions, func]
    }));
  };

  const toggleAuditor = (auditorId: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(auditorId)
        ? prev.teamMembers.filter((id: string) => id !== auditorId)
        : [...prev.teamMembers, auditorId]
    }));
  };

  const handleSave = async () => {
    if (!formData.departmentId || !formData.monthYear || formData.selectedFunctions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and select at least one function.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        department_id: formData.departmentId,
        department_name: selectedDepartment?.name || '',
        period: formData.period,
        month_year: formData.monthYear,
        functions: formData.selectedFunctions,
        objective: formData.objective,
        scope: formData.scope,
        risk_rating: formData.riskRating,
        lead_auditor_id: formData.leadAuditor || null,
        team_member_ids: formData.teamMembers,
        planned_start: formData.plannedStart || null,
        planned_end: formData.plannedEnd || null,
        status: 'Draft',
        audit_type: isAdHoc ? 'ad_hoc' : 'planned',
      };

      // Only set annual_plan_id for planned audits
      if (!isAdHoc && annualPlanId) {
        payload.annual_plan_id = annualPlanId;
      }

      if (departmentAudit && onUpdate) {
        await onUpdate({ id: departmentAudit.id, ...payload });
      } else if (onCreate) {
        await onCreate(payload);
      }
      toast({
        title: departmentAudit ? "Audit Updated" : (isAdHoc ? "Ad-Hoc Audit Created" : "Department Audit Saved"),
        description: departmentAudit 
          ? "Department audit plan has been updated successfully." 
          : (isAdHoc 
            ? "Ad-hoc audit has been created successfully."
            : "Department audit plan has been added to the annual plan.")
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save department audit:', error);
      toast({
        title: "Save Failed",
        description: error?.message || "Could not save the department audit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAdHoc && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Ad-Hoc Audit</span>
          <Badge variant="secondary" className="ml-auto">No Annual Plan Required</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Department & Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={formData.departmentId} onValueChange={(value) => setFormData({ ...formData, departmentId: value, selectedFunctions: [] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                      {dept.risk_rating && ` (${dept.risk_rating} Risk)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period *</Label>
              <Select value={formData.period} onValueChange={(value: any) => setFormData({ ...formData, period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Quarter 1 (Jan-Mar)</SelectItem>
                  <SelectItem value="Q2">Quarter 2 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q3">Quarter 3 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q4">Quarter 4 (Oct-Dec)</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month/Year *</Label>
              <Input
                type="month"
                value={formData.monthYear}
                onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Rating</Label>
              <Select value={formData.riskRating} onValueChange={(value: any) => setFormData({ ...formData, riskRating: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {departmentFunctions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Functions to Audit *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {departmentFunctions.map((func: any) => (
                <div key={func.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={func.id}
                    checked={formData.selectedFunctions.includes(func.function_name)}
                    onCheckedChange={() => toggleFunction(func.function_name)}
                  />
                  <Label htmlFor={func.id} className="cursor-pointer text-sm">
                    {func.function_name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {formData.departmentId && departmentFunctions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No functions configured for this department. Please add functions in the Department Functions module first.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audit Objective</Label>
            <Textarea
              placeholder="Enter specific audit objective for this department..."
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Audit Scope</Label>
            <Textarea
              placeholder="Define the scope for this department audit..."
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Team Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lead Auditor</Label>
            <Select value={formData.leadAuditor} onValueChange={(value) => setFormData({ ...formData, leadAuditor: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select lead auditor" />
              </SelectTrigger>
              <SelectContent>
                {activeAuditors.map((auditor: any) => (
                  <SelectItem key={auditor.id} value={auditor.id}>
                    {auditor.name} {auditor.seniority_level ? `(${auditor.seniority_level})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team Members</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {activeAuditors.filter((a: any) => a.id !== formData.leadAuditor).map((auditor: any) => (
                <div key={auditor.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`auditor-${auditor.id}`}
                    checked={formData.teamMembers.includes(auditor.id)}
                    onCheckedChange={() => toggleAuditor(auditor.id)}
                  />
                  <Label htmlFor={`auditor-${auditor.id}`} className="cursor-pointer text-sm">
                    {auditor.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start Date</Label>
              <Input
                type="date"
                value={formData.plannedStart}
                onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Planned End Date</Label>
              <Input
                type="date"
                value={formData.plannedEnd}
                onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isAdHoc ? 'Create Ad-Hoc Audit' : (departmentAudit ? 'Update Audit' : 'Add Department Audit')}
        </Button>
      </div>
    </div>
  );
}
