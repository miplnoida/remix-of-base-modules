import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface AddRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleType: "contribution" | "age" | "overlap" | "waiting";
  onSave: (data: any) => void;
}

export function AddRuleDialog({ open, onOpenChange, ruleType, onSave }: AddRuleDialogProps) {
  const [formData, setFormData] = useState<any>({});

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    onOpenChange(false);
  };

  const renderFields = () => {
    switch (ruleType) {
      case "contribution":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, benefitType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sickness">Sickness Benefit</SelectItem>
                  <SelectItem value="maternity">Maternity Benefit</SelectItem>
                  <SelectItem value="injury">Employment Injury</SelectItem>
                  <SelectItem value="invalidity">Invalidity Benefit</SelectItem>
                  <SelectItem value="age">Age Pension/Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minimum Contributions (weeks)</Label>
              <Input
                type="number"
                value={formData.minContributions || ""}
                onChange={(e) => setFormData({ ...formData, minContributions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Recent Contributions Required</Label>
              <Input
                type="number"
                value={formData.recentContributions || ""}
                onChange={(e) => setFormData({ ...formData, recentContributions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Waiting Days</Label>
              <Input
                type="number"
                value={formData.waitingDays || ""}
                onChange={(e) => setFormData({ ...formData, waitingDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Duration</Label>
              <Input
                value={formData.maxDuration || ""}
                onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                placeholder="e.g., 26 weeks"
              />
            </div>
          </>
        );
      case "age":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Input
                value={formData.benefitType || ""}
                onChange={(e) => setFormData({ ...formData, benefitType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Age</Label>
              <Input
                type="number"
                value={formData.minAge || ""}
                onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Age</Label>
              <Input
                value={formData.maxAge || ""}
                onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                placeholder="N/A if no maximum"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </>
        );
      case "overlap":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Combination</Label>
              <Input
                value={formData.combination || ""}
                onChange={(e) => setFormData({ ...formData, combination: e.target.value })}
                placeholder="e.g., Sickness + Maternity"
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, allowed: value === "true" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Allowed</SelectItem>
                  <SelectItem value="false">No - Not Allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason / Policy</Label>
              <Input
                value={formData.reason || ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </>
        );
      case "waiting":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Input
                value={formData.benefitType || ""}
                onChange={(e) => setFormData({ ...formData, benefitType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Waiting Days</Label>
              <Input
                type="number"
                value={formData.waitingDays || ""}
                onChange={(e) => setFormData({ ...formData, waitingDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </>
        );
    }
  };

  const getTitle = () => {
    switch (ruleType) {
      case "contribution": return "Add Contribution Rule";
      case "age": return "Add Age Requirement";
      case "overlap": return "Add Overlapping Benefit Rule";
      case "waiting": return "Add Waiting Period";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderFields()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
