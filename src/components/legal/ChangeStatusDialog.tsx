import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onChangeStatus: (newStatus: string, notes: string) => void;
}

const statusOptions = [
  "Draft",
  "Filed",
  "Under Review",
  "Hearing Scheduled",
  "Hearing Held",
  "Decision Pending",
  "Order Issued",
  "Closed – Compliant",
  "Closed – Non-Compliant",
  "Withdrawn",
  "Appealed",
  "Reopened"
];

export function ChangeStatusDialog({ open, onOpenChange, currentStatus, onChangeStatus }: ChangeStatusDialogProps) {
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!newStatus) newErrors.status = "New status is required";
    if (newStatus === currentStatus) newErrors.status = "Please select a different status";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onChangeStatus(newStatus, notes.trim());
    toast.success(`Case status changed to ${newStatus}`);
    onOpenChange(false);
    
    // Reset form
    setNewStatus("");
    setNotes("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Case Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Current Status: <span className="font-semibold text-foreground">{currentStatus}</span>
            </Label>
          </div>

          <div>
            <Label htmlFor="newStatus">New Status *</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="newStatus" className={errors.status ? "border-red-500" : ""}>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions
                  .filter(s => s !== currentStatus)
                  .map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Reason for Change (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for status change or additional notes"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Change Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
