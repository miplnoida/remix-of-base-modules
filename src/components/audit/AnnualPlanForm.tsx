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

/**
 * Plan Header Form — captures ONLY portfolio-level metadata.
 * Engagement-level data (department, risk, team, dates) is managed
 * separately via the Engagement Builder on the Plan Detail page.
 */
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
  });

  const mapToDbPayload = (status: string) => {
    const payload: any = {
      fiscal_year: formData.fiscalYear,
      title: formData.title,
      objective: formData.objective,
      scope: formData.scope,
      audit_scope: formData.auditScope,
      methodology: formData.methodology,
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
        description: plan ? 'Annual audit plan header updated.' : 'Annual audit plan created as draft. Add engagements from the plan detail page.'
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Annual Plan Header</CardTitle>
          <p className="text-xs text-muted-foreground">
            Define the yearly portfolio metadata. Individual audit engagements are added on the plan detail page.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year *</Label>
              <Select value={formData.fiscalYear} onValueChange={(value) => setFormData({ ...formData, fiscalYear: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={`${currentYear - 1}-${currentYear}`}>{currentYear - 1}-{currentYear}</SelectItem>
                  <SelectItem value={`${currentYear}-${currentYear + 1}`}>{currentYear}-{currentYear + 1}</SelectItem>
                  <SelectItem value={`${currentYear + 1}-${currentYear + 2}`}>{currentYear + 1}-{currentYear + 2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Overall Audit Objective *</Label>
            <Textarea placeholder="Enter the overall audit objective for the fiscal year..." value={formData.objective} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Audit Universe / Scope *</Label>
            <Textarea placeholder="Define the audit universe and scope coverage for this year..." value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Methodology</Label>
            <Textarea placeholder="Describe the overall audit methodology..." value={formData.methodology} onChange={(e) => setFormData({ ...formData, methodology: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {plan ? 'Update Plan Header' : 'Create Plan'}
        </Button>
      </div>
    </div>
  );
}
