import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FollowUpAction, FollowUpActionHistory, ACTION_TYPE_LABELS, ActionType } from '@/types/violationActions';
import { useQuery } from '@tanstack/react-query';
import { violationActionsService } from '@/services/violationActionsService';
import { formatDateForDisplay } from '@/lib/format-config';
import { Loader2 } from 'lucide-react';

export type ActionDialogMode = 'complete' | 'cancel' | 'reschedule' | 'notes' | 'details';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: FollowUpAction | null;
  mode: ActionDialogMode;
  onComplete?: (outcome: string, notes?: string) => void;
  onCancel?: (reason: string) => void;
  onReschedule?: (newDueDate: string, newScheduledDate?: string, notes?: string) => void;
  onSaveNotes?: (notes: string) => void;
  isSubmitting?: boolean;
}

export const ActionExecutionDialog: React.FC<Props> = ({
  open, onOpenChange, action, mode,
  onComplete, onCancel, onReschedule, onSaveNotes, isSubmitting,
}) => {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');

  const history = useQuery({
    queryKey: ['action-history', action?.id],
    queryFn: () => action ? violationActionsService.getHistoryByActionId(action.id) : Promise.resolve([]),
    enabled: !!action && mode === 'details',
  });

  if (!action) return null;

  const typeLabel = ACTION_TYPE_LABELS[action.action_type as ActionType] || action.action_type;

  const titles: Record<ActionDialogMode, string> = {
    complete: `Complete: ${typeLabel}`,
    cancel: `Cancel: ${typeLabel}`,
    reschedule: `Reschedule: ${typeLabel}`,
    notes: `Notes: ${typeLabel}`,
    details: `Action Details: ${typeLabel}`,
  };

  const handleSubmit = () => {
    switch (mode) {
      case 'complete': onComplete?.(outcome, notes); break;
      case 'cancel': onCancel?.(reason); break;
      case 'reschedule': onReschedule?.(newDueDate, newScheduledDate || undefined, notes || undefined); break;
      case 'notes': onSaveNotes?.(notes); break;
    }
    setOutcome(''); setNotes(''); setReason(''); setNewDueDate(''); setNewScheduledDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>
            {action.employer_name && <span className="text-muted-foreground">{action.employer_name} · </span>}
            <span className="font-mono text-xs">{action.violation_id.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        {mode === 'details' ? (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{action.status}</Badge></div>
                <div><span className="text-muted-foreground">Priority:</span> <Badge variant="secondary">{action.priority}</Badge></div>
                <div><span className="text-muted-foreground">Due:</span> {action.due_date ? formatDateForDisplay(action.due_date) : '—'}</div>
                <div><span className="text-muted-foreground">Scheduled:</span> {action.scheduled_date ? formatDateForDisplay(action.scheduled_date) : '—'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Assigned:</span> {action.assigned_to_name || 'Unassigned'}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="text-sm mt-1">{action.description}</p>
              </div>
              {action.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1">{action.notes}</p>
                </div>
              )}
              {action.outcome && (
                <div>
                  <span className="text-sm text-muted-foreground">Outcome:</span>
                  <p className="text-sm mt-1">{action.outcome}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              {history.isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (history.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No history entries</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(history.data ?? []).map((h: FollowUpActionHistory) => (
                    <div key={h.id} className="flex items-start gap-2 p-2 rounded border text-xs">
                      <div className="flex-1">
                        <span className="text-muted-foreground">{h.old_status ?? '—'}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{h.new_status}</span>
                        {h.notes && <p className="text-muted-foreground mt-0.5">{h.notes}</p>}
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatDateForDisplay(h.changed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : mode === 'complete' ? (
          <div className="space-y-3">
            <div>
              <Label>Outcome *</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="COMPLIANT">Employer Compliant</SelectItem>
                  <SelectItem value="PARTIAL">Partial Resolution</SelectItem>
                  <SelectItem value="ESCALATE">Needs Escalation</SelectItem>
                  <SelectItem value="NO_RESPONSE">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Completion notes..." rows={3} />
            </div>
          </div>
        ) : mode === 'cancel' ? (
          <div className="space-y-3">
            <div>
              <Label>Cancellation Reason *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancellation..." rows={3} />
            </div>
          </div>
        ) : mode === 'reschedule' ? (
          <div className="space-y-3">
            <div>
              <Label>New Due Date *</Label>
              <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Scheduled Date/Time</Label>
              <Input type="datetime-local" value={newScheduledDate} onChange={e => setNewScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reschedule reason..." rows={2} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={4} defaultValue={action.notes ?? ''} />
            </div>
          </div>
        )}

        {mode !== 'details' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (mode === 'complete' && !outcome) || (mode === 'cancel' && !reason) || (mode === 'reschedule' && !newDueDate)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {mode === 'complete' ? 'Complete' : mode === 'cancel' ? 'Cancel Action' : mode === 'reschedule' ? 'Reschedule' : 'Save Notes'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
