import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { InspectionFinding, InspectionVisit, ItemType, WeeklyPlanItem } from '@/types/inspectionTypes';
import { ViolationType } from '@/types/violation';
import { violationService } from '@/services/violationService';
import { inspectionService } from '@/services/inspectionService';
import { toast } from 'sonner';

interface CreateViolationFromFindingDialogProps {
  finding: InspectionFinding;
  visit: InspectionVisit;
  planItem: WeeklyPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViolationCreated: () => void;
}

export function CreateViolationFromFindingDialog({
  finding,
  visit,
  planItem,
  open,
  onOpenChange,
  onViolationCreated
}: CreateViolationFromFindingDialogProps) {
  const [violationType, setViolationType] = useState<ViolationType>(ViolationType.OTHER);
  const [summary, setSummary] = useState(finding.title);
  const [description, setDescription] = useState(finding.description);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>(finding.severity);
  const [assignToMe, setAssignToMe] = useState(true);
  const [dueDate, setDueDate] = useState('');
  
  // For scouting violations
  const [candidateBusinessName, setCandidateBusinessName] = useState('');
  const [candidateLocation, setCandidateLocation] = useState('');
  const [candidateActivityType, setCandidateActivityType] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  
  const [loading, setLoading] = useState(false);

  const isScouting = planItem.itemType === ItemType.SCOUTING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      const newViolation = await violationService.create({
        employerId: isScouting ? undefined : visit.employerId,
        violationType,
        priority,
        summary,
        description,
        inspectionVisitId: visit.id,
        inspectionFindingId: finding.id,
        isUnlinked: isScouting,
        candidateBusinessName: isScouting ? candidateBusinessName : undefined,
        candidateLocation: isScouting ? candidateLocation : undefined,
        candidateActivityType: isScouting ? candidateActivityType : undefined,
        estimatedEmployees: isScouting ? parseInt(estimatedEmployees) || undefined : undefined,
        assignedToUserId: assignToMe ? 'inspector-001' : undefined,
        dueDate: dueDate || undefined
      });

      await inspectionService.markFindingAsViolationCreated(finding.id, newViolation.id);

      toast.success('Violation created successfully');
      onViolationCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create violation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Violation from Finding</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isScouting && (
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="font-medium text-sm mb-1">Scouting Violation</div>
              <div className="text-sm text-muted-foreground">
                This violation will be created without an employer code. You can link it later when the business registers.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Violation Type</Label>
            <Select value={violationType} onValueChange={(value) => setViolationType(value as ViolationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ViolationType.NON_REGISTRATION}>Non-Registration</SelectItem>
                <SelectItem value={ViolationType.UNDER_REPORTING}>Under-Reporting</SelectItem>
                <SelectItem value={ViolationType.LATE_SUBMISSION}>Late Submission</SelectItem>
                <SelectItem value={ViolationType.LATE_PAYMENT}>Late Payment</SelectItem>
                <SelectItem value={ViolationType.NON_PAYMENT}>Non-Payment</SelectItem>
                <SelectItem value={ViolationType.WAGE_BOOK_VIOLATION}>Wage Book Violation</SelectItem>
                <SelectItem value={ViolationType.EMPLOYEE_MISCLASSIFICATION}>Employee Misclassification</SelectItem>
                <SelectItem value={ViolationType.UNREPORTED_EMPLOYEE}>Unreported Employee</SelectItem>
                <SelectItem value={ViolationType.UNREGISTERED_BUSINESS_ACTIVITY}>Unregistered Business Activity</SelectItem>
                <SelectItem value={ViolationType.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isScouting && (
            <>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={candidateBusinessName}
                  onChange={(e) => setCandidateBusinessName(e.target.value)}
                  placeholder="Name on signage or as known locally"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={candidateLocation}
                  onChange={(e) => setCandidateLocation(e.target.value)}
                  placeholder="Address or landmark"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <Input
                    value={candidateActivityType}
                    onChange={(e) => setCandidateActivityType(e.target.value)}
                    placeholder="e.g. Construction, Retail"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Employees</Label>
                  <Input
                    type="number"
                    value={estimatedEmployees}
                    onChange={(e) => setEstimatedEmployees(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Summary</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief violation summary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="assign-me"
              checked={assignToMe}
              onCheckedChange={(checked) => setAssignToMe(checked as boolean)}
            />
            <label
              htmlFor="assign-me"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Assign to me
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Violation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
