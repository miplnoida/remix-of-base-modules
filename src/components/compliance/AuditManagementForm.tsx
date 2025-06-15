
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Save, FileText } from 'lucide-react';

export const AuditManagementForm = () => {
  const [auditData, setAuditData] = useState({
    employerId: '',
    auditType: '',
    auditDate: '',
    auditor: '',
    checklist: {
      contributionRemittances: false,
      employeeRegistration: false,
      wageDocumentation: false,
      benefitClaims: false,
      complianceRecords: false,
      financialStatements: false
    },
    findings: '',
    recommendations: '',
    status: 'Scheduled'
  });

  const handleChecklistChange = (item: string, checked: boolean) => {
    setAuditData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [item]: checked
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Audit data submitted:', auditData);
    // Handle form submission
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
                onChange={(e) => setAuditData(prev => ({ ...prev, employerId: e.target.value }))}
                placeholder="Enter employer ID..."
                required
              />
            </div>
            <div>
              <Label htmlFor="auditType">Audit Type</Label>
              <Select onValueChange={(value) => setAuditData(prev => ({ ...prev, auditType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Audit</SelectItem>
                  <SelectItem value="risk-based">Risk-Based Audit</SelectItem>
                  <SelectItem value="investigation">Investigation</SelectItem>
                  <SelectItem value="follow-up">Follow-up Audit</SelectItem>
                  <SelectItem value="special">Special Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="auditDate">Audit Date</Label>
              <Input
                id="auditDate"
                type="date"
                value={auditData.auditDate}
                onChange={(e) => setAuditData(prev => ({ ...prev, auditDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="auditor">Assigned Auditor</Label>
              <Select onValueChange={(value) => setAuditData(prev => ({ ...prev, auditor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select auditor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john-smith">John Smith</SelectItem>
                  <SelectItem value="jane-doe">Jane Doe</SelectItem>
                  <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                  <SelectItem value="sarah-wilson">Sarah Wilson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Audit Checklist</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { key: 'contributionRemittances', label: 'Contribution Remittances' },
                { key: 'employeeRegistration', label: 'Employee Registration Records' },
                { key: 'wageDocumentation', label: 'Wage Documentation' },
                { key: 'benefitClaims', label: 'Benefit Claims Processing' },
                { key: 'complianceRecords', label: 'Compliance Records' },
                { key: 'financialStatements', label: 'Financial Statements' }
              ].map((item) => (
                <div key={item.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.key}
                    checked={auditData.checklist[item.key as keyof typeof auditData.checklist]}
                    onCheckedChange={(checked) => handleChecklistChange(item.key, checked as boolean)}
                  />
                  <Label htmlFor={item.key} className="text-sm">{item.label}</Label>
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
              onChange={(e) => setAuditData(prev => ({ ...prev, findings: e.target.value }))}
              className="min-h-32"
            />
          </div>

          <div>
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              placeholder="Provide recommendations for improvement..."
              value={auditData.recommendations}
              onChange={(e) => setAuditData(prev => ({ ...prev, recommendations: e.target.value }))}
              className="min-h-32"
            />
          </div>

          <div>
            <Label>Supporting Documents</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Upload audit documents and evidence</p>
              <Button variant="outline" className="mt-2" type="button">
                Choose Files
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button">Save Draft</Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Submit Audit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
