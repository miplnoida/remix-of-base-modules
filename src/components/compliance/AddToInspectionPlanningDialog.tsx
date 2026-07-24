import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CalendarClock } from 'lucide-react';
import {
  inspectionNominationService,
  nextMondayISO,
} from '@/services/inspectionNominationService';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
  caseNumber: string;
  employerId: string;
  employerName: string;
  officerUserCode: string;
}

export function AddToInspectionPlanningDialog({
  open, onOpenChange, caseId, caseNumber, employerId, employerName, officerUserCode,
}: Props) {
  const qc = useQueryClient();
  const [week, setWeek] = useState<string>(nextMondayISO());
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => inspectionNominationService.nominateCaseForInspection({
      caseId, caseNumber, employerId, employerName,
      weekStartDate: week, notes: notes.trim() || undefined,
      officerUserCode,
    }),
    onSuccess: () => {
      toast.success('Added to your pending planning list', {
        description: 'Open Weekly Plan to schedule it on a day.',
      });
      qc.invalidateQueries({ queryKey: ['pending-nominations'] });
      qc.invalidateQueries({ queryKey: ['pending-nomination', caseId] });
      onOpenChange(false);
      setNotes('');
    },
    onError: (err: any) => {
      const msg = String(err?.message || '');
      if (msg.includes('ux_ce_planner_actions_active_nomination')) {
        toast.error('Already in your pending planning list for that week.');
      } else {
        toast.error('Could not add to planning', { description: msg });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Add to Inspection Planning
          </DialogTitle>
          <DialogDescription>
            This queues an inspection of <span className="font-medium">{employerName}</span>{' '}
            (Case <span className="font-mono">{caseNumber}</span>) in your Pending Planning list.
            You'll place it on a day in Weekly Plan, and your Compliance Head approves the plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="target-week">Target week (Monday)</Label>
            <Input
              id="target-week"
              type="date"
              value={week}
              onChange={e => setWeek(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to next Monday. You can move it in the Weekly Plan builder.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / purpose (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Verify wage records for Jan–Mar; confirm active employee count."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !week}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
