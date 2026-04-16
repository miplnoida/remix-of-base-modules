import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, ClipboardCheck } from 'lucide-react';
import { InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkingPapersTabContentProps {
  visit: InspectionVisit;
  planItemId: string;
}

interface WorkingPapers {
  id?: string;
  payroll_reviewed: boolean;
  payroll_notes: string;
  contributions_reviewed: boolean;
  contributions_notes: string;
  employee_sample_size: number;
  employee_sample_notes: string;
  wage_book_reviewed: boolean;
  wage_book_notes: string;
  discrepancies_found: string;
  inspector_observations: string;
  completion_percentage: number;
}

const EMPTY_PAPERS: WorkingPapers = {
  payroll_reviewed: false,
  payroll_notes: '',
  contributions_reviewed: false,
  contributions_notes: '',
  employee_sample_size: 0,
  employee_sample_notes: '',
  wage_book_reviewed: false,
  wage_book_notes: '',
  discrepancies_found: '',
  inspector_observations: '',
  completion_percentage: 0,
};

function calculateCompletion(papers: WorkingPapers): number {
  let total = 0;
  let done = 0;
  // Payroll
  total++;
  if (papers.payroll_reviewed) done++;
  // Contributions
  total++;
  if (papers.contributions_reviewed) done++;
  // Employee sample
  total++;
  if (papers.employee_sample_size > 0) done++;
  // Wage book
  total++;
  if (papers.wage_book_reviewed) done++;
  // Observations
  total++;
  if (papers.inspector_observations.trim().length > 0) done++;

  return Math.round((done / total) * 100);
}

export function WorkingPapersTabContent({ visit, planItemId }: WorkingPapersTabContentProps) {
  const [papers, setPapers] = useState<WorkingPapers>({ ...EMPTY_PAPERS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const isReadOnly = visit.visitStatus === InspectionVisitStatus.COMPLETED;

  useEffect(() => {
    loadPapers();
  }, [visit.id]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ce_inspection_working_papers')
        .select('*')
        .eq('inspection_id', visit.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExistingId(data.id);
        setPapers({
          id: data.id,
          payroll_reviewed: data.payroll_reviewed,
          payroll_notes: data.payroll_notes ?? '',
          contributions_reviewed: data.contributions_reviewed,
          contributions_notes: data.contributions_notes ?? '',
          employee_sample_size: data.employee_sample_size ?? 0,
          employee_sample_notes: data.employee_sample_notes ?? '',
          wage_book_reviewed: data.wage_book_reviewed,
          wage_book_notes: data.wage_book_notes ?? '',
          discrepancies_found: data.discrepancies_found ?? '',
          inspector_observations: data.inspector_observations ?? '',
          completion_percentage: data.completion_percentage ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to load working papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const completion = calculateCompletion(papers);
      const payload = {
        inspection_id: visit.id,
        plan_item_id: planItemId || null,
        payroll_reviewed: papers.payroll_reviewed,
        payroll_notes: papers.payroll_notes || null,
        contributions_reviewed: papers.contributions_reviewed,
        contributions_notes: papers.contributions_notes || null,
        employee_sample_size: papers.employee_sample_size,
        employee_sample_notes: papers.employee_sample_notes || null,
        wage_book_reviewed: papers.wage_book_reviewed,
        wage_book_notes: papers.wage_book_notes || null,
        discrepancies_found: papers.discrepancies_found || null,
        inspector_observations: papers.inspector_observations || null,
        completion_percentage: completion,
        updated_by: 'SYSTEM',
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase
          .from('ce_inspection_working_papers')
          .update(payload)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ce_inspection_working_papers')
          .insert({ ...payload, created_by: 'SYSTEM' })
          .select('id')
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }

      setPapers(prev => ({ ...prev, completion_percentage: completion }));
      toast.success('Working papers saved');
    } catch (error) {
      toast.error('Failed to save working papers');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof WorkingPapers, value: any) => {
    setPapers(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  const completion = calculateCompletion(papers);

  return (
    <div className="space-y-6 py-4">
      {/* Completion Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <span className="font-medium">Audit Checklist Completion</span>
        </div>
        <Badge variant="outline" className={completion >= 80 ? 'bg-success/10 text-success' : completion >= 40 ? 'bg-warning/10 text-warning' : 'bg-muted'}>
          {completion}%
        </Badge>
      </div>

      {/* Payroll Review */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Payroll Records Review</Label>
          <Switch
            checked={papers.payroll_reviewed}
            onCheckedChange={(v) => updateField('payroll_reviewed', v)}
            disabled={isReadOnly}
          />
        </div>
        {papers.payroll_reviewed && (
          <Textarea
            value={papers.payroll_notes}
            onChange={(e) => updateField('payroll_notes', e.target.value)}
            placeholder="Notes from payroll review..."
            rows={2}
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Contribution Review */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Contribution Records Review</Label>
          <Switch
            checked={papers.contributions_reviewed}
            onCheckedChange={(v) => updateField('contributions_reviewed', v)}
            disabled={isReadOnly}
          />
        </div>
        {papers.contributions_reviewed && (
          <Textarea
            value={papers.contributions_notes}
            onChange={(e) => updateField('contributions_notes', e.target.value)}
            placeholder="Notes from contribution review..."
            rows={2}
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Employee Sample */}
      <div className="space-y-3 p-4 border rounded-lg">
        <Label className="text-base font-medium">Employee Sample Review</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sample Size</Label>
            <Input
              type="number"
              min={0}
              value={papers.employee_sample_size}
              onChange={(e) => updateField('employee_sample_size', parseInt(e.target.value) || 0)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={papers.employee_sample_notes}
              onChange={(e) => updateField('employee_sample_notes', e.target.value)}
              placeholder="Sample observations..."
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>

      {/* Wage Book */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Wage Book Review</Label>
          <Switch
            checked={papers.wage_book_reviewed}
            onCheckedChange={(v) => updateField('wage_book_reviewed', v)}
            disabled={isReadOnly}
          />
        </div>
        {papers.wage_book_reviewed && (
          <Textarea
            value={papers.wage_book_notes}
            onChange={(e) => updateField('wage_book_notes', e.target.value)}
            placeholder="Notes from wage book review..."
            rows={2}
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Discrepancies */}
      <div className="space-y-3 p-4 border rounded-lg">
        <Label className="text-base font-medium">Discrepancies Found</Label>
        <Textarea
          value={papers.discrepancies_found}
          onChange={(e) => updateField('discrepancies_found', e.target.value)}
          placeholder="Document any discrepancies identified during the audit..."
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      {/* Inspector Observations */}
      <div className="space-y-3 p-4 border rounded-lg">
        <Label className="text-base font-medium">Inspector Observations</Label>
        <Textarea
          value={papers.inspector_observations}
          onChange={(e) => updateField('inspector_observations', e.target.value)}
          placeholder="General observations, workplace conditions, compliance culture..."
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : existingId ? 'Update Working Papers' : 'Save Working Papers'}
        </Button>
      )}
    </div>
  );
}
