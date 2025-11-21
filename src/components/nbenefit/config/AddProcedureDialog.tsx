import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AddProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure?: any;
}

export const AddProcedureDialog = ({ open, onOpenChange, procedure }: AddProcedureDialogProps) => {
  const [formData, setFormData] = useState({
    code: procedure?.code || "",
    name: procedure?.name || "",
    category: procedure?.category || "Surgery",
    description: procedure?.description || ""
  });

  // Update form when procedure changes
  useState(() => {
    if (procedure) {
      setFormData({
        code: procedure.code || "",
        name: procedure.name || "",
        category: procedure.category || "Surgery",
        description: procedure.description || ""
      });
    }
  });

  const handleSave = () => {
    console.log("Saving procedure:", formData);
    onOpenChange(false);
    setFormData({ code: "", name: "", category: "Surgery", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{procedure ? "Edit" : "Add"} Medical Procedure</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Procedure Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., SURG005"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Surgery">Surgery</SelectItem>
                  <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="Treatment">Treatment</SelectItem>
                  <SelectItem value="Hospitalisation">Hospitalisation</SelectItem>
                  <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Procedure Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Cardiac Bypass Surgery"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter procedure description, indications, and any special notes..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Procedure
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
