import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowUpCircle, CheckCircle, Lock, Search, UserCheck, AlertTriangle, Loader2,
} from 'lucide-react';
import { violationLifecycleService, ViolationStatus } from '@/services/violationLifecycleService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkViolationActionsProps {
  selectedIds: string[];
  violations: any[];
  onComplete: () => void;
  onClearSelection: () => void;
}

type BulkAction = 'assign' | 'move_to_review' | 'escalate' | 'resolve' | 'close';

const ACTION_CONFIG: Record<BulkAction, {
  label: string;
  icon: React.ReactNode;
  targetStatus?: ViolationStatus;
  eligibleStatuses: string[];
  variant: 'default' | 'destructive' | 'outline';
  requiresNotes: boolean;
}> = {
  assign: {
    label: 'Assign / Reassign',
    icon: <UserCheck className="h-4 w-4" />,
    eligibleStatuses: ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'],
    variant: 'outline',
    requiresNotes: false,
  },
  move_to_review: {
    label: 'Move to Review',
    icon: <Search className="h-4 w-4" />,
    targetStatus: 'UNDER_REVIEW',
    eligibleStatuses: ['OPEN', 'IN_PROGRESS'],
    variant: 'outline',
    requiresNotes: true,
  },
  escalate: {
    label: 'Escalate',
    icon: <ArrowUpCircle className="h-4 w-4" />,
    targetStatus: 'ESCALATED',
    eligibleStatuses: ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW'],
    variant: 'destructive',
    requiresNotes: true,
  },
  resolve: {
    label: 'Resolve',
    icon: <CheckCircle className="h-4 w-4" />,
    targetStatus: 'RESOLVED',
    eligibleStatuses: ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'],
    variant: 'default',
    requiresNotes: true,
  },
  close: {
    label: 'Close',
    icon: <Lock className="h-4 w-4" />,
    targetStatus: 'CLOSED',
    eligibleStatuses: ['RESOLVED'],
    variant: 'default',
    requiresNotes: true,
  },
};

export function BulkViolationActions({ selectedIds, violations, onComplete, onClearSelection }: BulkViolationActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkAction>('assign');
  const [notes, setNotes] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedViolations = violations.filter((v: any) => selectedIds.includes(v.id));
  const currentUserCode = 'SYSTEM'; // TODO: from auth context

  if (selectedIds.length === 0) return null;

  const openAction = (action: BulkAction) => {
    setCurrentAction(action);
    setNotes('');
    setAssignTo('');
    setDialogOpen(true);
  };

  const config = ACTION_CONFIG[currentAction];
  const eligible = selectedViolations.filter((v: any) => config.eligibleStatuses.includes(v.status));
  const ineligible = selectedViolations.filter((v: any) => !config.eligibleStatuses.includes(v.status));

  const handleExecute = async () => {
    if (eligible.length === 0) {
      toast.error('No eligible violations for this action');
      return;
    }
    if (config.requiresNotes && !notes.trim()) {
      toast.error('Notes/reason is required');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      if (currentAction === 'assign') {
        // Bulk assignment update
        for (const v of eligible) {
          const { error } = await supabase
            .from('ce_violations')
            .update({
              assigned_to_name: assignTo || null,
              updated_by: currentUserCode,
            })
            .eq('id', v.id);

          if (error) { failCount++; } else {
            // Log assignment in history
            await supabase.from('ce_violation_history').insert({
              violation_id: v.id,
              action: 'Bulk Reassigned',
              notes: `Assigned to: ${assignTo || 'Queue'}${notes ? ` — ${notes}` : ''}`,
              performed_by: currentUserCode,
              performed_at: new Date().toISOString(),
            } as any);
            successCount++;
          }
        }
      } else if (config.targetStatus) {
        // Lifecycle transitions
        for (const v of eligible) {
          const result = await violationLifecycleService.transition({
            violationId: v.id,
            targetStatus: config.targetStatus,
            performedBy: currentUserCode,
            notes: `[Bulk ${config.label}] ${notes}`,
            resolutionNotes: currentAction === 'resolve' ? notes : undefined,
          });
          if (result.success) { successCount++; } else { failCount++; }
        }
      }

      if (successCount > 0) {
        toast.success(`Bulk ${config.label} complete`, {
          description: `${successCount} updated${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
      }
      if (failCount > 0 && successCount === 0) {
        toast.error(`Bulk ${config.label} failed`, { description: `${failCount} violations could not be updated` });
      }

      setDialogOpen(false);
      onComplete();
      onClearSelection();
    } catch (err) {
      toast.error('Unexpected error during bulk operation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Badge variant="default">{selectedIds.length} selected</Badge>
        <div className="flex gap-1 flex-wrap">
          {(Object.entries(ACTION_CONFIG) as [BulkAction, typeof ACTION_CONFIG[BulkAction]][]).map(([key, cfg]) => (
            <Button key={key} variant={cfg.variant} size="sm" onClick={() => openAction(key)}>
              {cfg.icon}
              <span className="ml-1">{cfg.label}</span>
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="ml-auto">
          Clear
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {config.icon}
              Bulk {config.label}
            </DialogTitle>
            <DialogDescription>
              Apply to {eligible.length} of {selectedIds.length} selected violations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {ineligible.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{ineligible.length}</strong> violation{ineligible.length > 1 ? 's are' : ' is'} ineligible
                  for this action due to incompatible status
                  ({[...new Set(ineligible.map((v: any) => v.status))].join(', ')}).
                  {ineligible.length > 0 && eligible.length > 0 && ' They will be skipped.'}
                </AlertDescription>
              </Alert>
            )}

            {eligible.length === 0 && (
              <Alert>
                <AlertDescription>
                  None of the selected violations can be {config.label.toLowerCase()}ed from their current statuses.
                </AlertDescription>
              </Alert>
            )}

            {currentAction === 'assign' && (
              <div className="space-y-2">
                <Label>Assign To (Officer Name)</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  placeholder="Leave empty to return to queue"
                />
              </div>
            )}

            {config.requiresNotes && (
              <div className="space-y-2">
                <Label>Reason / Notes <span className="text-destructive">*</span></Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Reason for bulk ${config.label.toLowerCase()}...`}
                  rows={3}
                />
              </div>
            )}

            {!config.requiresNotes && currentAction === 'assign' && (
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for assignment..."
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button
              onClick={handleExecute}
              disabled={isProcessing || eligible.length === 0}
              variant={config.variant === 'destructive' ? 'destructive' : 'default'}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {config.label} ({eligible.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
