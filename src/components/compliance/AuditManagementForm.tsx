import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CHECKLIST_ITEMS = [
  { key: 'contributionRemittances', label: 'Contribution Remittances' },
  { key: 'employeeRegistration', label: 'Employee Registration Records' },
  { key: 'wageDocumentation', label: 'Wage Documentation' },
  { key: 'benefitClaims', label: 'Benefit Claims Processing' },
  { key: 'complianceRecords', label: 'Compliance Records' },
  { key: 'financialStatements', label: 'Financial Statements' },
];

type ChecklistKey = typeof CHECKLIST_ITEMS[number]['key'];
type ChecklistState = Record<ChecklistKey, boolean>;

const INITIAL_CHECKLIST: ChecklistState = CHECKLIST_ITEMS.reduce((acc, i) => {
  acc[i.key] = false;
  return acc;
}, {} as ChecklistState);

export const AuditManagementForm = () => {
  const queryClient = useQueryClient();
  const [auditData, setAuditData] = useState({
    employerId: '',
    employerName: '',
    auditType: '',
    auditDate: '',
    auditor: '',
    auditorName: '',
    checklist: INITIAL_CHECKLIST,
    findings: '',
    recommendations: '',
  });

  const handleChecklistChange = (item: string, checked: boolean) => {
    setAuditData((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [item]: checked },
    }));
  };

  const createInspection = useMutation({
    mutationFn: async () => {
      const inspectionNumber = `INS-${Date.now()}`;
      const checklistChecked = Object.entries(auditData.checklist)
        .filter(([, v]) => v)
        .map(([k]) => CHECKLIST_ITEMS.find((i) => i.key === k)?.label)
        .filter(Boolean)
        .join('; ');

      const findingsSummary = [
        auditData.findings && `FINDINGS: ${auditData.findings}`,
        auditData.recommendations && `RECOMMENDATIONS: ${auditData.recommendations}`,
        checklistChecked && `CHECKLIST: ${checklistChecked}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const { data, error } = await supabase
        .from('ce_inspections')
        .insert({
          inspection_number: inspectionNumber,
          employer_id: auditData.employerId,
          employer_name: auditData.employerName || null,
          inspection_type: auditData.auditType || null,
          inspector_id: auditData.auditor || null,
          inspector_name: auditData.auditorName || null,
          scheduled_date: auditData.auditDate || null,
          findings_summary: findingsSummary || null,
          status: 'SCHEDULED',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Audit scheduled', { description: 'Inspection has been created.' });
      queryClient.invalidateQueries({ queryKey: ['ce_inspections'] });
      setAuditData({
        employerId: '',
        employerName: '',
        auditType: '',
        auditDate: '',
        auditor: '',
        auditorName: '',
        checklist: INITIAL_CHECKLIST,
        findings: '',
        recommendations: '',
      });
    },
    onError: (err: any) => {
      toast.error('Failed to create audit', { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditData.employerId || !auditData.auditDate) {
      toast.error('Please provide Employer ID and Audit Date');
      return;
    }
    createInspection.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Management Form
        </CardTitle>
        <CardDescription>Schedule and conduct comprehensive compliance audits</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employerId">Employer ID</Label>
              <Input
                id="employerId"
                value={auditData.employerId}
                onChange={(e) => setAuditData((p) => ({ ...p, employerId: e.target.value }))}
                placeholder="Enter employer ID..."
                required
              />
            </div>
            <div>
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                value={auditData.employerName}
                onChange={(e) => setAuditData((p) => ({ ...p, employerName: e.target.value }))}
                placeholder="Employer name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="auditType">Audit Type</Label>
              <Select
                value={auditData.auditType}
                onValueChange={(v) => setAuditData((p) => ({ ...p, auditType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine Audit</SelectItem>
                  <SelectItem value="RISK_BASED">Risk-Based Audit</SelectItem>
                  <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow-up Audit</SelectItem>
                  <SelectItem value="SPECIAL">Special Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="auditDate">Audit Date</Label>
              <Input
                id="auditDate"
                type="date"
                value={auditData.auditDate}
                onChange={(e) => setAuditData((p) => ({ ...p, auditDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="auditor">Inspector ID</Label>
              <Input
                id="auditor"
                value={auditData.auditor}
                onChange={(e) => setAuditData((p) => ({ ...p, auditor: e.target.value }))}
                placeholder="e.g. INSP001"
              />
            </div>
            <div>
              <Label htmlFor="auditorName">Inspector Name</Label>
              <Input
                id="auditorName"
                value={auditData.auditorName}
                onChange={(e) => setAuditData((p) => ({ ...p, auditorName: e.target.value }))}
                placeholder="Full name"
              />
            </div>
          </div>

          <div>
            <Label>Audit Checklist</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.key}
                    checked={auditData.checklist[item.key as ChecklistKey]}
                    onCheckedChange={(c) => handleChecklistChange(item.key, c as boolean)}
                  />
                  <Label htmlFor={item.key} className="text-sm">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="findings">Audit Findings</Label>
            <Textarea
              id="findings"
              placeholder="Document audit findings and observations..."
              value={auditData.findings}
              onChange={(e) => setAuditData((p) => ({ ...p, findings: e.target.value }))}
              className="min-h-32"
            />
          </div>

          <div>
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              placeholder="Provide recommendations for improvement..."
              value={auditData.recommendations}
              onChange={(e) => setAuditData((p) => ({ ...p, recommendations: e.target.value }))}
              className="min-h-32"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={createInspection.isPending}>
              {createInspection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Schedule Audit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
