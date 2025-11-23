import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeeklyPlanItem } from '@/types/inspectionTypes';
import { weeklyReportService } from '@/services/weeklyReportService';
import { useToast } from '@/hooks/use-toast';

interface RescheduleVisitDialogProps {
  planItem: WeeklyPlanItem;
  onClose: () => void;
  onSuccess: () => void;
}

const rescheduleReasons = [
  'Employer closed',
  'Employer requested new date',
  'Inspector delayed / emergency',
  'Weather conditions',
  'Equipment unavailable',
  'Other'
];

export function RescheduleVisitDialog({ planItem, onClose, onSuccess }: RescheduleVisitDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for rescheduling',
        variant: 'destructive'
      });
      return;
    }

    if (!newDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a new date',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      await weeklyReportService.rescheduleVisit(
        planItem.id,
        finalReason,
        newDate,
        createFollowUp
      );

      toast({
        title: 'Visit Rescheduled',
        description: `Visit rescheduled to ${newDate}${createFollowUp ? ' and added to future plan' : ''}`
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule visit',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Visit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Employer/Area</Label>
            <div className="text-sm text-muted-foreground">
              {planItem.employerName || planItem.areaName}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Original Planned Date</Label>
            <div className="text-sm text-muted-foreground">{planItem.visitDate}</div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Reschedule *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {rescheduleReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div>
              <Label htmlFor="customReason">Specify Reason *</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter the reason for rescheduling"
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label htmlFor="newDate">New Suggested Date *</Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="createFollowUp"
              checked={createFollowUp}
              onCheckedChange={(checked) => setCreateFollowUp(checked as boolean)}
            />
            <Label
              htmlFor="createFollowUp"
              className="text-sm font-normal cursor-pointer"
            >
              Create follow-up in next week's plan
            </Label>
          </div>

          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-900">
            {createFollowUp ? (
              <>
                A new visit will be automatically added to the weekly plan for the selected date.
                A follow-up action will also be created.
              </>
            ) : (
              <>
                The visit will be marked as rescheduled but no automatic follow-up will be created.
                You'll need to manually add it to a future plan.
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
