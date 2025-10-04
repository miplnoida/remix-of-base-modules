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
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [agenda, setAgenda] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = "Hearing type is required";
    if (!venue) newErrors.venue = "Venue is required";
    if (!startAt) newErrors.startAt = "Start time is required";
    if (!endAt) newErrors.endAt = "End time is required";
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      newErrors.endAt = "End time must be after start time";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSchedule(caseId, {
      type,
      venue,
      startAt,
      endAt,
      agenda,
      panel: ["Panel Member 1", "Panel Member 2"]
    });

    toast.success("Hearing scheduled successfully");
    onOpenChange(false);
    
    // Reset form
    setType("");
    setVenue("");
    setStartAt("");
    setEndAt("");
    setAgenda("");
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
                <SelectItem value="Preliminary">Preliminary</SelectItem>
                <SelectItem value="Full Board">Full Board</SelectItem>
                <SelectItem value="Appeals">Appeals</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          <div>
            <Label htmlFor="venue">Venue *</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Board Room A, Virtual Meeting"
              className={errors.venue ? "border-red-500" : ""}
            />
            {errors.venue && <p className="text-xs text-red-500 mt-1">{errors.venue}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startAt">Start Time *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={errors.startAt ? "border-red-500" : ""}
              />
              {errors.startAt && <p className="text-xs text-red-500 mt-1">{errors.startAt}</p>}
            </div>
            <div>
              <Label htmlFor="endAt">End Time *</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className={errors.endAt ? "border-red-500" : ""}
              />
              {errors.endAt && <p className="text-xs text-red-500 mt-1">{errors.endAt}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="agenda">Agenda (Optional)</Label>
            <Textarea
              id="agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Enter hearing agenda or notes"
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
