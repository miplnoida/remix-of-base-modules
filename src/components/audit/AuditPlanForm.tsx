import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { departments, auditors } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

const DEPARTMENT_FUNCTIONS = {
  'Benefits': ['Claims Processing', 'Eligibility Verification', 'Payment Authorization', 'Appeals Management'],
  'Contributions': ['Employer Compliance', 'Payment Processing', 'Contribution Verification', 'Arrears Management'],
  'Finance': ['Accounting Operations', 'Budget Management', 'Financial Reporting', 'Audit Coordination'],
  'IT': ['System Maintenance', 'Data Security', 'System Development', 'User Support'],
  'HR': ['Recruitment', 'Performance Management', 'Training & Development', 'Employee Relations']
};

interface AuditPlanFormProps {
  plan?: any;
  onClose: () => void;
}

export function AuditPlanForm({ plan, onClose }: AuditPlanFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    period: plan?.period || 'Monthly',
    monthYear: plan?.monthYear || '',
    selectedDepartments: plan?.departments || [] as string[],
    objective: plan?.objective || '',
    scope: plan?.scope || '',
    methodology: plan?.methodology || ''
  });

  const [departmentAssignments, setDepartmentAssignments] = useState<any[]>([]);

  const handleDepartmentToggle = (deptId: string) => {
    const isSelected = formData.selectedDepartments.includes(deptId);
    if (isSelected) {
      setFormData({
        ...formData,
        selectedDepartments: formData.selectedDepartments.filter(id => id !== deptId)
      });
      setDepartmentAssignments(prev => prev.filter(a => a.department.id !== deptId));
    } else {
      const dept = departments.find(d => d.id === deptId);
      if (dept) {
        setFormData({
          ...formData,
          selectedDepartments: [...formData.selectedDepartments, deptId]
        });
        const deptName = dept.name.replace('Department of ', '');
        const functions = DEPARTMENT_FUNCTIONS[deptName as keyof typeof DEPARTMENT_FUNCTIONS] || [];
        setDepartmentAssignments([...departmentAssignments, {
          department: dept,
          functions: [],
          riskRating: 'Medium',
          scope: '',
          auditor: '',
          availableFunctions: functions
        }]);
      }
    }
  };

  const updateAssignment = (deptId: string, field: string, value: any) => {
    setDepartmentAssignments(prev => 
      prev.map(assignment => 
        assignment.department.id === deptId 
          ? { ...assignment, [field]: value }
          : assignment
      )
    );
  };

  const toggleFunction = (deptId: string, func: string) => {
    setDepartmentAssignments(prev =>
      prev.map(assignment => {
        if (assignment.department.id === deptId) {
          const functions = assignment.functions.includes(func)
            ? assignment.functions.filter((f: string) => f !== func)
            : [...assignment.functions, func];
          return { ...assignment, functions };
        }
        return assignment;
      })
    );
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Audit plan has been saved as draft."
    });
    onClose();
  };

  const handleSubmit = () => {
    if (formData.selectedDepartments.length === 0 || !formData.monthYear) {
      toast({
        title: "Validation Error",
        description: "Please select at least one department and fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Plan Submitted",
      description: "Audit plan has been submitted for approval."
    });
    onClose();
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'High': 'bg-red-500'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period Type</Label>
              <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthYear">Month/Year</Label>
              <Input
                id="monthYear"
                type="month"
                value={formData.monthYear.replace(' ', '-')}
                onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective">Audit Objective</Label>
            <Textarea
              id="objective"
              placeholder="Enter audit objective..."
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">Audit Scope</Label>
            <Textarea
              id="scope"
              placeholder="Enter audit scope..."
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="methodology">Methodology</Label>
            <Textarea
              id="methodology"
              placeholder="Enter audit methodology..."
              value={formData.methodology}
              onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Select Departments */}
      <Card>
        <CardHeader>
          <CardTitle>Select Departments for Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map(dept => (
              <Card 
                key={dept.id} 
                className={`cursor-pointer transition-all ${
                  formData.selectedDepartments.includes(dept.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleDepartmentToggle(dept.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      checked={formData.selectedDepartments.includes(dept.id)}
                      onCheckedChange={() => handleDepartmentToggle(dept.id)}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{dept.name}</h4>
                      <p className="text-sm text-muted-foreground">Head: {dept.head}</p>
                      <p className="text-sm text-muted-foreground">{dept.location}</p>
                      {dept.riskRating && (
                        <Badge className={`mt-2 ${
                          dept.riskRating === 'High' ? 'bg-red-500' : 
                          dept.riskRating === 'Medium' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}>
                          {dept.riskRating} Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Assignments */}
      {departmentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Audit Details ({departmentAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {departmentAssignments.map((assignment) => (
              <Card key={assignment.department.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{assignment.department.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Risk Rating</Label>
                      <Select 
                        value={assignment.riskRating} 
                        onValueChange={(value) => updateAssignment(assignment.department.id, 'riskRating', value)}
                      >
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
                    <div>
                      <Label>Lead Auditor</Label>
                      <Select 
                        value={assignment.auditor} 
                        onValueChange={(value) => updateAssignment(assignment.department.id, 'auditor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select auditor" />
                        </SelectTrigger>
                        <SelectContent>
                          {auditors.filter(a => a.employmentStatus === 'Active').map(auditor => (
                            <SelectItem key={auditor.id} value={auditor.id}>{auditor.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Functions to Audit</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {assignment.availableFunctions.map((func: string) => (
                        <div key={func} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`${assignment.department.id}-${func}`}
                            checked={assignment.functions.includes(func)}
                            onCheckedChange={() => toggleFunction(assignment.department.id, func)}
                          />
                          <Label htmlFor={`${assignment.department.id}-${func}`} className="cursor-pointer text-sm">
                            {func}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Scope Description</Label>
                    <Textarea
                      placeholder="Enter specific scope for this department..."
                      value={assignment.scope}
                      onChange={(e) => updateAssignment(assignment.department.id, 'scope', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        <Button onClick={handleSubmit}>Submit for Approval</Button>
      </div>
    </div>
  );
}