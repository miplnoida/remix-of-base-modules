import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FindingType, CreateFindingRequest } from '@/types/inspectionTypes';
import { toast } from 'sonner';

interface CreateFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CreateFindingRequest) => Promise<void>;
}

export function CreateFindingDialog({ open, onOpenChange, onSubmit }: CreateFindingDialogProps) {
  const [formData, setFormData] = useState<CreateFindingRequest>({
    findingType: FindingType.MINOR_ISSUE,
    title: '',
    description: '',
    severity: 'Medium',
    recommendedAction: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Finding recorded');
      onOpenChange(false);
      // Reset form
      setFormData({
        findingType: FindingType.MINOR_ISSUE,
        title: '',
        description: '',
        severity: 'Medium',
        recommendedAction: ''
      });
    } catch (error) {
      console.error('Error creating finding:', error);
      toast.error('Failed to create finding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Inspection Finding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Finding Type</Label>
              <Select
                value={formData.findingType}
                onValueChange={(value) => setFormData({ ...formData, findingType: value as FindingType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FindingType.COMPLIANT}>Compliant</SelectItem>
                  <SelectItem value={FindingType.MINOR_ISSUE}>Minor Issue</SelectItem>
                  <SelectItem value={FindingType.MAJOR_ISSUE}>Major Issue</SelectItem>
                  <SelectItem value={FindingType.POSSIBLE_VIOLATION}>Possible Violation</SelectItem>
                  <SelectItem value={FindingType.INFORMATION_ONLY}>Information Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
              >
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
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="Brief title of the finding"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Detailed description of what was found during inspection..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Recommended Action</Label>
            <Textarea
              placeholder="What action should be taken (optional)..."
              value={formData.recommendedAction}
              onChange={(e) => setFormData({ ...formData, recommendedAction: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Record Finding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
