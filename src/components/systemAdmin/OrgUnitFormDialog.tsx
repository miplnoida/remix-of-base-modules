import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OrgUnit } from "@/types/systemAdmin";
import { useState } from "react";
import { orgUnits } from "@/services/mockData/systemAdminData";

interface OrgUnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgUnit?: OrgUnit;
  onSave: (orgUnit: Partial<OrgUnit>) => void;
}

export function OrgUnitFormDialog({ open, onOpenChange, orgUnit, onSave }: OrgUnitFormDialogProps) {
  const [formData, setFormData] = useState<Partial<OrgUnit>>(orgUnit || {
    name: "",
    type: "Department",
    parentOrgUnitId: "",
    activeFlag: true,
    headPositionId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{orgUnit ? "Edit Organisation Unit" : "Add New Organisation Unit"}</DialogTitle>
          <DialogDescription>
            {orgUnit ? "Update organisation unit details" : "Create a new organisation unit"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Unit Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Unit Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as OrgUnit["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Division">Division</SelectItem>
                <SelectItem value="Department">Department</SelectItem>
                <SelectItem value="Unit">Unit</SelectItem>
                <SelectItem value="Branch">Branch</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentOrgUnitId">Parent Unit</Label>
            <Select
              value={formData.parentOrgUnitId}
              onValueChange={(value) => setFormData({ ...formData, parentOrgUnitId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent unit (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Top Level)</SelectItem>
                {orgUnits.filter(u => u.orgUnitId !== orgUnit?.orgUnitId).map(unit => (
                  <SelectItem key={unit.orgUnitId} value={unit.orgUnitId}>
                    {unit.name} ({unit.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headPositionId">Head Position ID</Label>
            <Input
              id="headPositionId"
              value={formData.headPositionId}
              onChange={(e) => setFormData({ ...formData, headPositionId: e.target.value })}
              placeholder="Optional"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {orgUnit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
