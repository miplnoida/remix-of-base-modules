import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Delegation } from "@/types/systemAdmin";
import { useState } from "react";
import { employees, positions } from "@/services/mockData/systemAdminData";

interface DelegationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegation?: Delegation;
  onSave: (delegation: Partial<Delegation>) => void;
}

export function DelegationFormDialog({ open, onOpenChange, delegation, onSave }: DelegationFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Delegation>>(delegation || {
    fromPositionId: "",
    fromEmployeeId: "",
    toPositionId: "",
    toEmployeeId: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    scope: "",
    maxApprovalLimitXCD: 0,
    reason: "",
    createdBy: "CURRENT_USER",
    createdOn: new Date().toISOString(),
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
          <DialogTitle>{delegation ? "Edit Delegation" : "Create New Delegation"}</DialogTitle>
          <DialogDescription>
            {delegation ? "Update delegation details" : "Delegate authority to another position or employee"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold">Delegate From</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromPositionId">Position</Label>
                <Select
                  value={formData.fromPositionId}
                  onValueChange={(value) => setFormData({ ...formData, fromPositionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.positionId} value={pos.positionId}>
                        {pos.positionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmployeeId">Employee</Label>
                <Select
                  value={formData.fromEmployeeId}
                  onValueChange={(value) => setFormData({ ...formData, fromEmployeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Delegate To</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="toPositionId">Position</Label>
                <Select
                  value={formData.toPositionId}
                  onValueChange={(value) => setFormData({ ...formData, toPositionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.positionId} value={pos.positionId}>
                        {pos.positionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toEmployeeId">Employee *</Label>
                <Select
                  value={formData.toEmployeeId}
                  onValueChange={(value) => setFormData({ ...formData, toEmployeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Scope *</Label>
            <Input
              id="scope"
              required
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              placeholder="e.g., All approvals, C3 submissions only, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxApprovalLimitXCD">Maximum Approval Limit (XCD)</Label>
            <Input
              id="maxApprovalLimitXCD"
              type="number"
              min="0"
              step="0.01"
              value={formData.maxApprovalLimitXCD}
              onChange={(e) => setFormData({ ...formData, maxApprovalLimitXCD: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain the reason for this delegation"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {delegation ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
