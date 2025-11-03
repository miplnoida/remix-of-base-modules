import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ScheduleHearingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSchedule: (caseId: string, hearing: any) => void;
}

export function ScheduleHearingDialog({ open, onOpenChange, caseId, onSchedule }: ScheduleHearingDialogProps) {
  const [type, setType] = useState("");
  const [venue, setVenue] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [description, setDescription] = useState("");
  const [panelName, setPanelName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = "Hearing type is required";
    if (!venue) newErrors.venue = "Venue is required";
    if (!hearingDate) newErrors.hearingDate = "Hearing date is required";
    if (!panelName) newErrors.panelName = "Panel name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSchedule(caseId, {
      type,
      venue,
      date: hearingDate,
      description,
      panel: panelName.split(',').map(name => name.trim())
    });

    toast.success("Hearing scheduled successfully");
    onOpenChange(false);
    
    // Reset form
    setType("");
    setVenue("");
    setHearingDate("");
    setDescription("");
    setPanelName("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Hearing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Hearing Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Initial Hearing">Initial Hearing</SelectItem>
                <SelectItem value="Preliminary Hearing">Preliminary Hearing</SelectItem>
                <SelectItem value="Full Hearing">Full Hearing</SelectItem>
                <SelectItem value="Appeals Hearing">Appeals Hearing</SelectItem>
                <SelectItem value="Follow-up Hearing">Follow-up Hearing</SelectItem>
                <SelectItem value="Mediation">Mediation</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          <div>
            <Label htmlFor="hearingDate">Hearing Date *</Label>
            <Input
              id="hearingDate"
              type="datetime-local"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className={errors.hearingDate ? "border-red-500" : ""}
            />
            {errors.hearingDate && <p className="text-xs text-red-500 mt-1">{errors.hearingDate}</p>}
          </div>

          <div>
            <Label htmlFor="venue">Venue *</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., SSB Hearing Room A"
              className={errors.venue ? "border-red-500" : ""}
            />
            {errors.venue && <p className="text-xs text-red-500 mt-1">{errors.venue}</p>}
          </div>

          <div>
            <Label htmlFor="panelName">Panel Name *</Label>
            <Input
              id="panelName"
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              placeholder="e.g., Judge Sarah Johnson, Member David Lee"
              className={errors.panelName ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground mt-1">Separate multiple panel members with commas</p>
            {errors.panelName && <p className="text-xs text-red-500 mt-1">{errors.panelName}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter hearing description or notes"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Schedule Hearing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
