import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCase } from '@/hooks/useLegalCases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Send, Scale, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function LegalIntakeWizard() {
  const navigate = useNavigate();
  const createCase = useCreateCase();

  const [formData, setFormData] = useState({
    title: '',
    case_type: '',
    source: '',
    priority: 'Medium',
    confidential: false,
    summary: '',
    relief_sought: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!formData.title || !formData.case_type || !formData.source) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isDraft && (!formData.summary || formData.summary.length < 20)) {
      toast.error('Summary must be at least 20 characters for submission');
      return;
    }

    setIsSubmitting(true);
    try {
      const caseData = {
        ...formData,
        status: isDraft ? 'Draft' : 'Filed',
      };
      
      const newCase = await createCase.mutateAsync(caseData);
      navigate(`/legal/cases/${newCase.id}`);
    } catch (error: any) {
      toast.error('Failed to create case: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/legal/cases')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">New Legal Case</h1>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Case Basics</CardTitle>
            <CardDescription>Enter the fundamental case information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Case Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Employer Contribution Arrears - XYZ Corp"
              />
            </div>

            {/* Case Type and Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="case_type">Case Type *</Label>
                <Select value={formData.case_type} onValueChange={(v) => handleChange('case_type', v)}>
                  <SelectTrigger id="case_type" className="bg-popover">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Prosecution">Prosecution</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Appeal">Appeal</SelectItem>
                    <SelectItem value="Recovery">Recovery</SelectItem>
                    <SelectItem value="Employer Dispute">Employer Dispute</SelectItem>
                    <SelectItem value="IP Dispute">IP Dispute</SelectItem>
                    <SelectItem value="Garnishment">Garnishment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select value={formData.source} onValueChange={(v) => handleChange('source', v)}>
                  <SelectTrigger id="source" className="bg-popover">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Complaint">Complaint</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                    <SelectItem value="Audit">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority and Confidential */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                  <SelectTrigger id="priority" className="bg-popover">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="confidential"
                  checked={formData.confidential}
                  onCheckedChange={(checked) => handleChange('confidential', checked)}
                />
                <Label htmlFor="confidential" className="cursor-pointer">
                  Mark as Confidential
                </Label>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Summary *</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder="Provide a detailed summary of the case (minimum 20 characters)"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {formData.summary.length} characters
              </p>
            </div>

            {/* Relief Sought */}
            <div className="space-y-2">
              <Label htmlFor="relief_sought">Relief Sought</Label>
              <Textarea
                id="relief_sought"
                value={formData.relief_sought}
                onChange={(e) => handleChange('relief_sought', e.target.value)}
                placeholder="Describe the relief or remedy being sought"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/legal/cases')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
