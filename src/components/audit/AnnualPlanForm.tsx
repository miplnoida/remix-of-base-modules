import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    methodology: plan?.methodology || ''
  });

  const mapToDbPayload = (status: string) => {
    const payload: any = {
      fiscal_year: formData.fiscalYear,
      title: formData.title,
      objective: formData.objective,
      scope: formData.scope,
      methodology: formData.methodology,
      status,
    };
    if (status === 'Submitted') {
      payload.submitted_date = new Date().toISOString();
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = mapToDbPayload('Draft');
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
      toast({
        title: "Save Failed",
        description: error?.message || "Could not save the plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.objective || !formData.scope || !formData.methodology) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = mapToDbPayload('Submitted');
      if (plan && onUpdate) {
        await onUpdate({ id: plan.id, ...payload });
      } else if (onCreate) {
        await onCreate(payload);
      }
      toast({
        title: plan ? "Plan Updated" : "Plan Submitted",
        description: plan ? "Annual audit plan has been updated successfully." : "Annual audit plan has been submitted for review."
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit plan:', error);
      toast({
        title: "Submit Failed",
        description: error?.message || "Could not submit the plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Annual Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year *</Label>
              <Select value={formData.fiscalYear} onValueChange={(value) => setFormData({ ...formData, fiscalYear: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={`${currentYear-1}-${currentYear}`}>{currentYear-1}-{currentYear}</SelectItem>
                  <SelectItem value={`${currentYear}-${currentYear+1}`}>{currentYear}-{currentYear+1}</SelectItem>
                  <SelectItem value={`${currentYear+1}-${currentYear+2}`}>{currentYear+1}-{currentYear+2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="objective">Overall Audit Objective *</Label>
            <Textarea
              id="objective"
              placeholder="Enter the overall objective for the annual internal audit plan..."
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scope">Audit Scope *</Label>
            <Textarea
              id="scope"
              placeholder="Define the scope of the annual audit plan..."
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="methodology">Methodology *</Label>
            <Textarea
              id="methodology"
              placeholder="Describe the audit methodology and approach..."
              value={formData.methodology}
              onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
