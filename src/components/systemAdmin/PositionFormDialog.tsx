import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Position } from "@/types/systemAdmin";
import { useState } from "react";
import { orgUnits, positions } from "@/services/mockData/systemAdminData";

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position;
  onSave: (position: Partial<Position>) => void;
}

export function PositionFormDialog({ open, onOpenChange, position, onSave }: PositionFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Position>>(position || {
    positionName: "",
    orgUnitId: "",
    gradeLevel: "",
    reportsToPositionId: "",
    isManager: false,
    isApprover: false,
    defaultApprovalLimitXCD: 0,
    activeFlag: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{position ? "Edit Position" : "Add New Position"}</DialogTitle>
          <DialogDescription>
            {position ? "Update position details" : "Create a new position in the organisation"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="positionName">Position Name *</Label>
            <Input
              id="positionName"
              required
              value={formData.positionName}
              onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgUnitId">Organisation Unit *</Label>
              <Select
                value={formData.orgUnitId}
                onValueChange={(value) => setFormData({ ...formData, orgUnitId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {orgUnits.map(unit => (
                    <SelectItem key={unit.orgUnitId} value={unit.orgUnitId}>
                      {unit.name} ({unit.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level *</Label>
              <Input
                id="gradeLevel"
                required
                value={formData.gradeLevel}
                onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                placeholder="e.g., L5, M3, S1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportsToPositionId">Reports To Position</Label>
            <Select
              value={formData.reportsToPositionId}
              onValueChange={(value) => setFormData({ ...formData, reportsToPositionId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor position (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {positions.filter(p => p.positionId !== position?.positionId).map(pos => (
                  <SelectItem key={pos.positionId} value={pos.positionId}>
                    {pos.positionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultApprovalLimitXCD">Default Approval Limit (XCD)</Label>
            <Input
              id="defaultApprovalLimitXCD"
              type="number"
              min="0"
              step="0.01"
              value={formData.defaultApprovalLimitXCD}
              onChange={(e) => setFormData({ ...formData, defaultApprovalLimitXCD: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="isManager">Is Manager Position</Label>
              <Switch
                id="isManager"
                checked={formData.isManager}
                onCheckedChange={(checked) => setFormData({ ...formData, isManager: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isApprover">Is Approver Position</Label>
              <Switch
                id="isApprover"
                checked={formData.isApprover}
                onCheckedChange={(checked) => setFormData({ ...formData, isApprover: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="activeFlag">Active</Label>
              <Switch
                id="activeFlag"
                checked={formData.activeFlag}
                onCheckedChange={(checked) => setFormData({ ...formData, activeFlag: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {position ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
