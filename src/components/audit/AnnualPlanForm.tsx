import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AnnualPlanFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnnualPlanForm({ onClose, onSuccess }: AnnualPlanFormProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    fiscalYear: `${currentYear}-${currentYear + 1}`,
    title: `Annual Internal Audit Plan ${currentYear}-${currentYear + 1}`,
    objective: '',
    scope: '',
    methodology: ''
  });

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Annual audit plan has been saved as draft."
    });
    onSuccess?.();
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.objective || !formData.scope || !formData.methodology) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Plan Submitted",
      description: "Annual audit plan has been submitted for review."
    });
    onSuccess?.();
    onClose();
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
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        <Button onClick={handleSubmit}>Submit for Review</Button>
      </div>
    </div>
  );
}
