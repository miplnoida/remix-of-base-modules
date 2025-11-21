import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ApprovalMatrix } from "@/types/systemAdmin";
import { useState } from "react";
import { orgUnits, roles, positions } from "@/services/mockData/systemAdminData";

interface ApprovalMatrixFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matrix?: ApprovalMatrix;
  onSave: (matrix: Partial<ApprovalMatrix>) => void;
}

export function ApprovalMatrixFormDialog({ open, onOpenChange, matrix, onSave }: ApprovalMatrixFormDialogProps) {
  const [formData, setFormData] = useState<Partial<ApprovalMatrix>>(matrix || {
    processType: "",
    orgUnitId: "",
    rangeMinXCD: 0,
    rangeMaxXCD: 0,
    approverType: "Role",
    approverRoleId: "",
    approverPositionId: "",
    sequenceOrder: 1,
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
          <DialogTitle>{matrix ? "Edit Approval Rule" : "Add New Approval Rule"}</DialogTitle>
          <DialogDescription>
            {matrix ? "Update approval matrix rule" : "Define a new approval rule for workflow processes"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="processType">Process Type *</Label>
            <Input
              id="processType"
              required
              value={formData.processType}
              onChange={(e) => setFormData({ ...formData, processType: e.target.value })}
              placeholder="e.g., Purchase Requisition, Leave Request, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgUnitId">Organisation Unit</Label>
            <Select
              value={formData.orgUnitId || undefined}
              onValueChange={(value) => setFormData({ ...formData, orgUnitId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Units (leave blank for system-wide)" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rangeMinXCD">Minimum Amount (XCD) *</Label>
              <Input
                id="rangeMinXCD"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.rangeMinXCD}
                onChange={(e) => setFormData({ ...formData, rangeMinXCD: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rangeMaxXCD">Maximum Amount (XCD) *</Label>
              <Input
                id="rangeMaxXCD"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.rangeMaxXCD}
                onChange={(e) => setFormData({ ...formData, rangeMaxXCD: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approverType">Approver Type *</Label>
            <Select
              value={formData.approverType}
              onValueChange={(value) => setFormData({ ...formData, approverType: value as "Role" | "Position" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Role">Role-Based</SelectItem>
                <SelectItem value="Position">Position-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.approverType === "Role" ? (
            <div className="space-y-2">
              <Label htmlFor="approverRoleId">Approver Role *</Label>
              <Select
                value={formData.approverRoleId}
                onValueChange={(value) => setFormData({ ...formData, approverRoleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.roleId} value={role.roleId}>
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="approverPositionId">Approver Position *</Label>
              <Select
                value={formData.approverPositionId}
                onValueChange={(value) => setFormData({ ...formData, approverPositionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.filter(p => p.isApprover).map(pos => (
                    <SelectItem key={pos.positionId} value={pos.positionId}>
                      {pos.positionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sequenceOrder">Sequence Order *</Label>
            <Input
              id="sequenceOrder"
              type="number"
              min="1"
              required
              value={formData.sequenceOrder}
              onChange={(e) => setFormData({ ...formData, sequenceOrder: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground">Order in which approvals should occur (1, 2, 3...)</p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="activeFlag">Active</Label>
            <Switch
              id="activeFlag"
              checked={formData.activeFlag}
              onCheckedChange={(checked) => setFormData({ ...formData, activeFlag: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {matrix ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
