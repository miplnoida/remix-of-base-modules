import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { departments, auditors } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

const DEPARTMENT_FUNCTIONS: Record<string, string[]> = {
  'Benefits': ['Claims Processing', 'Eligibility Verification', 'Payment Authorization', 'Appeals Management', 'Benefit Calculations'],
  'Contributions': ['Employer Compliance', 'Payment Processing', 'Contribution Verification', 'Arrears Management', 'Reconciliation'],
  'Finance': ['Accounting Operations', 'Budget Management', 'Financial Reporting', 'Audit Coordination', 'Cash Management'],
  'IT': ['System Maintenance', 'Data Security', 'System Development', 'User Support', 'Backup & Recovery'],
  'HR': ['Recruitment', 'Performance Management', 'Training & Development', 'Employee Relations', 'Payroll Administration']
};

interface DepartmentAuditFormProps {
  annualPlanId: string;
  departmentAudit?: any;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (data: any) => void;
  onUpdate?: (data: any) => void;
}

export function DepartmentAuditForm({ annualPlanId, departmentAudit, onClose, onSuccess, onCreate, onUpdate }: DepartmentAuditFormProps) {
  const { toast } = useToast();
  
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

  const selectedDepartment = departments.find(d => d.id === formData.departmentId);
  const deptName = selectedDepartment?.name.replace('Department of ', '');
  const availableFunctions = deptName ? DEPARTMENT_FUNCTIONS[deptName] || [] : [];

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

  const handleSave = () => {
    if (!formData.departmentId || !formData.monthYear || formData.selectedFunctions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and select at least one function.",
        variant: "destructive"
      });
      return;
    }

    const deptObj = departments.find(d => d.id === formData.departmentId);
    const payload: any = {
      annual_plan_id: annualPlanId,
      department_id: formData.departmentId,
      department_name: deptObj?.name || '',
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
    };

    if (departmentAudit && onUpdate) {
      onUpdate({ id: departmentAudit.id, ...payload });
    } else if (onCreate) {
      onCreate(payload);
    } else {
      toast({
        title: departmentAudit ? "Audit Updated" : "Department Audit Saved",
        description: departmentAudit ? "Department audit plan has been updated successfully." : "Department audit plan has been added to the annual plan."
      });
    }
    onSuccess?.();
    onClose();
  };

  return (
    <div className="space-y-6">
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
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                      {dept.riskRating && ` (${dept.riskRating} Risk)`}
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

      {availableFunctions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Functions to Audit *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {availableFunctions.map((func) => (
                <div key={func} className="flex items-center space-x-2">
                  <Checkbox 
                    id={func}
                    checked={formData.selectedFunctions.includes(func)}
                    onCheckedChange={() => toggleFunction(func)}
                  />
                  <Label htmlFor={func} className="cursor-pointer text-sm">
                    {func}
                  </Label>
                </div>
              ))}
            </div>
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
                {auditors.filter(a => a.employmentStatus === 'Active').map(auditor => (
                  <SelectItem key={auditor.id} value={auditor.id}>
                    {auditor.name} ({auditor.seniorityLevel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team Members</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {auditors.filter(a => a.employmentStatus === 'Active' && a.id !== formData.leadAuditor).map(auditor => (
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
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Add Department Audit</Button>
      </div>
    </div>
  );
}
