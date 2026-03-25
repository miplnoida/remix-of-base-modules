import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowRight, Edit, FileText, Loader2, Save, ShieldAlert } from 'lucide-react';
import { useApplyPlanRevision } from '@/hooks/useAuditWorkflowGates';
import { useUserCode } from '@/hooks/useUserCode';

interface PlanRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
}

// Fields considered "material" — changes trigger re-approval
const MATERIAL_FIELDS = ['title', 'fiscal_year', 'risk_level', 'assigned_auditor', 'function_id', 'planned_start_date', 'planned_end_date', 'budget_hours'];

interface FieldChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  isMaterial: boolean;
}

const EDITABLE_FIELDS: { key: string; label: string; type: 'text' | 'select' | 'date' | 'number' | 'textarea' }[] = [
  { key: 'title', label: 'Plan Title', type: 'text' },
  { key: 'fiscal_year', label: 'Fiscal Year', type: 'text' },
  { key: 'risk_level', label: 'Risk Level', type: 'select' },
  { key: 'assigned_auditor', label: 'Assigned Auditor', type: 'text' },
  { key: 'planned_start_date', label: 'Planned Start Date', type: 'date' },
  { key: 'planned_end_date', label: 'Planned End Date', type: 'date' },
  { key: 'budget_hours', label: 'Budget Hours', type: 'number' },
  { key: 'scope', label: 'Scope', type: 'textarea' },
  { key: 'objectives', label: 'Objectives', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export function PlanRevisionDialog({ open, onOpenChange, plan }: PlanRevisionDialogProps) {
  const { userCode } = useUserCode();
  const applyRevision = useApplyPlanRevision();

  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [reason, setReason] = useState('');

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setEditedValues({});
      setReason('');
    }
  }, [open]);

  const getValue = (key: string) => {
    return key in editedValues ? editedValues[key] : (plan?.[key] ?? '');
  };

  const handleChange = (key: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  // Compute changes
  const changes: FieldChange[] = useMemo(() => {
    return Object.entries(editedValues)
      .filter(([key, val]) => {
        const original = plan?.[key] ?? '';
        return String(val) !== String(original);
      })
      .map(([key, val]) => {
        const fieldDef = EDITABLE_FIELDS.find(f => f.key === key);
        return {
          field: key,
          label: fieldDef?.label || key.replace(/_/g, ' '),
          oldValue: plan?.[key] ?? '—',
          newValue: val,
          isMaterial: MATERIAL_FIELDS.includes(key),
        };
      });
  }, [editedValues, plan]);

  const hasMaterialChanges = changes.some(c => c.isMaterial);
  const hasChanges = changes.length > 0;

  const handleSubmit = async () => {
    if (!hasChanges || !plan?.id) return;
    const changesPayload: Record<string, any> = {};
    changes.forEach(c => { changesPayload[c.field] = c.newValue; });

    await applyRevision.mutateAsync({
      planId: plan.id,
      changes: changesPayload,
      requestedBy: userCode || 'SYSTEM',
      reason: reason || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Revise Audit Plan
          </DialogTitle>
          <DialogDescription>
            Edit plan fields below. Material changes (title, dates, risk, auditor) will trigger re-approval.
          </DialogDescription>
        </DialogHeader>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EDITABLE_FIELDS.map(field => {
            const isChanged = changes.some(c => c.field === field.key);
            const isMaterial = MATERIAL_FIELDS.includes(field.key);

            return (
              <div key={field.key} className={`space-y-1 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                <Label className="text-xs flex items-center gap-1.5">
                  {field.label}
                  {isMaterial && <ShieldAlert className="h-3 w-3 text-amber-500" />}
                  {isChanged && <Badge variant="outline" className="text-[9px] h-4 px-1 text-primary">Modified</Badge>}
                </Label>
                {field.type === 'select' && field.key === 'risk_level' ? (
                  <Select value={getValue(field.key)} onValueChange={(v) => handleChange(field.key, v)}>
                    <SelectTrigger className={`h-8 text-sm ${isChanged ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Low', 'Medium', 'High', 'Critical'].map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    value={getValue(field.key)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`text-sm min-h-[60px] ${isChanged ? 'border-primary ring-1 ring-primary/20' : ''}`}
                    rows={3}
                  />
                ) : (
                  <Input
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                    value={getValue(field.key)}
                    onChange={(e) => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className={`h-8 text-sm ${isChanged ? 'border-primary ring-1 ring-primary/20' : ''}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Change Summary */}
        {hasChanges && (
          <Card className={hasMaterialChanges ? 'border-amber-300 bg-amber-50/30' : 'border-primary/30 bg-primary/5'}>
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                {hasMaterialChanges ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <FileText className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {changes.length} field(s) changed
                  {hasMaterialChanges && ' — Re-approval required'}
                </span>
              </div>
              <div className="space-y-1.5">
                {changes.map(change => (
                  <div key={change.field} className="flex items-center gap-2 text-xs rounded border px-2 py-1 bg-background">
                    <span className="font-medium min-w-[100px]">{change.label}</span>
                    {change.isMaterial && <Badge variant="outline" className="text-[9px] h-4 border-amber-400 text-amber-700">Material</Badge>}
                    <span className="text-destructive line-through truncate">{String(change.oldValue)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-green-700 truncate">{String(change.newValue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reason */}
        <div className="space-y-1">
          <Label className="text-xs">Revision Reason {hasMaterialChanges && <span className="text-destructive">*</span>}</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this revision is needed..."
            className="text-sm min-h-[60px]"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || (hasMaterialChanges && !reason.trim()) || applyRevision.isPending}
          >
            {applyRevision.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting...</>
            ) : hasMaterialChanges ? (
              <><ShieldAlert className="h-4 w-4 mr-1" /> Submit for Re-approval</>
            ) : (
              <><Save className="h-4 w-4 mr-1" /> Save Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
