import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface AddWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export function AddWorkflowDialog({ open, onOpenChange, onSave }: AddWorkflowDialogProps) {
  const [formData, setFormData] = useState<any>({});

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Benefit Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Workflow Name</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Short-Term Benefits Workflow"
            />
          </div>
          <div className="space-y-2">
            <Label>Applicable Benefits</Label>
            <Input
              value={formData.benefits || ""}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              placeholder="e.g., Sickness, Employment Injury, Maternity"
            />
          </div>
          <div className="space-y-2">
            <Label>Workflow Type</Label>
            <Select onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select workflow type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short-term">Short-Term Benefits</SelectItem>
                <SelectItem value="long-term">Long-Term Benefits</SelectItem>
                <SelectItem value="lump-sum">Lump Sum Benefits</SelectItem>
                <SelectItem value="assistance">Assistance Benefits</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Duration (days)</Label>
            <Input
              type="number"
              value={formData.duration || ""}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 10"
            />
          </div>
          <div className="space-y-2">
            <Label>Number of Stages</Label>
            <Input
              type="number"
              value={formData.stages || ""}
              onChange={(e) => setFormData({ ...formData, stages: e.target.value })}
              placeholder="e.g., 6"
            />
          </div>
          <div className="space-y-2">
            <Label>Approval Levels Required</Label>
            <Select onValueChange={(value) => setFormData({ ...formData, approvalLevels: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select approval level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examiner">Examiner Only</SelectItem>
                <SelectItem value="manager">Manager Approval</SelectItem>
                <SelectItem value="director">Director Approval</SelectItem>
                <SelectItem value="director-general">Director General Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter workflow description..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Create Workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
