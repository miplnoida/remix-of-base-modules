import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface IssueNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onIssueNotice: (caseId: string, correspondence: any) => void;
}

export function IssueNoticeDialog({ open, onOpenChange, caseId, onIssueNotice }: IssueNoticeDialogProps) {
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = "Notice type is required";
    if (!subject || subject.trim().length === 0) newErrors.subject = "Subject is required";
    if (!recipients || recipients.trim().length === 0) newErrors.recipients = "Recipients are required";
    if (channels.length === 0) newErrors.channels = "At least one delivery method is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onIssueNotice(caseId, {
      direction: "Outbound",
      type,
      subject: subject.trim(),
      channels
    });

    toast.success("Notice issued successfully");
    onOpenChange(false);
    
    // Reset form
    setType("");
    setSubject("");
    setRecipients("");
    setChannels([]);
    setErrors({});
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Notice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Notice Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select notice type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hearing Notice">Hearing Notice</SelectItem>
                <SelectItem value="Compliance Notice">Compliance Notice</SelectItem>
                <SelectItem value="Decision Notice">Decision Notice</SelectItem>
                <SelectItem value="Appeal Notice">Appeal Notice</SelectItem>
                <SelectItem value="General Correspondence">General Correspondence</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter notice subject"
              className={errors.subject ? "border-red-500" : ""}
            />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label htmlFor="recipients">Recipients *</Label>
            <Textarea
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter recipient names or emails (comma-separated)"
              rows={2}
              className={errors.recipients ? "border-red-500" : ""}
            />
            {errors.recipients && <p className="text-xs text-red-500 mt-1">{errors.recipients}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Delivery Method *</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={channels.includes("Email")}
                  onCheckedChange={() => toggleChannel("Email")}
                />
                <label htmlFor="email" className="text-sm cursor-pointer">Email</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="post"
                  checked={channels.includes("Registered Post")}
                  onCheckedChange={() => toggleChannel("Registered Post")}
                />
                <label htmlFor="post" className="text-sm cursor-pointer">Registered Post</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="courier"
                  checked={channels.includes("Courier")}
                  onCheckedChange={() => toggleChannel("Courier")}
                />
                <label htmlFor="courier" className="text-sm cursor-pointer">Courier</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inPerson"
                  checked={channels.includes("In Person")}
                  onCheckedChange={() => toggleChannel("In Person")}
                />
                <label htmlFor="inPerson" className="text-sm cursor-pointer">In Person</label>
              </div>
            </div>
            {errors.channels && <p className="text-xs text-red-500 mt-1">{errors.channels}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Issue Notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
