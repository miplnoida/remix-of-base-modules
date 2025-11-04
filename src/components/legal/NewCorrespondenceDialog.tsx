import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NewCorrespondenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onCorrespondenceSent: () => void;
}

export function NewCorrespondenceDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  caseNumber,
  onCorrespondenceSent 
}: NewCorrespondenceDialogProps) {
  const [correspondenceDate, setCorrespondenceDate] = useState<Date>();
  const [type, setType] = useState('Notice');
  const [template, setTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [channels, setChannels] = useState({
    email: true,
    print: false,
    sms: false,
  });
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!correspondenceDate) {
      toast.error('Please select a correspondence date');
      return;
    }

    if (!subject || !recipient) {
      toast.error('Please fill in subject and recipient');
      return;
    }

    if (!channels.email && !channels.print && !channels.sms) {
      toast.error('Please select at least one delivery channel');
      return;
    }

    setIsSending(true);
    try {
      // In real implementation, generate and send via NotificationsAdapter
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Correspondence sent successfully');
      onCorrespondenceSent();
      handleClose();
    } catch (error) {
      toast.error('Failed to send correspondence');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setCorrespondenceDate(undefined);
    setType('Notice');
    setTemplate('');
    setSubject('');
    setRecipient('');
    setChannels({ email: true, print: false, sms: false });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Correspondence</DialogTitle>
          <p className="text-sm text-muted-foreground">Case: {caseNumber}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Correspondence Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !correspondenceDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {correspondenceDate ? format(correspondenceDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={correspondenceDate}
                  onSelect={setCorrespondenceDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Correspondence Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Notice">Notice</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="Reminder">Reminder</SelectItem>
                <SelectItem value="Confirmation">Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template (Optional)</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hearing-notice">Hearing Notice</SelectItem>
                <SelectItem value="payment-reminder">Payment Reminder</SelectItem>
                <SelectItem value="compliance-notice">Compliance Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              placeholder="Enter subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Recipient *</Label>
            <Input
              placeholder="Name or email of recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery Channels *</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="email"
                  checked={channels.email}
                  onCheckedChange={(checked) => 
                    setChannels(prev => ({ ...prev, email: !!checked }))
                  }
                />
                <Label htmlFor="email" className="font-normal cursor-pointer">
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="print"
                  checked={channels.print}
                  onCheckedChange={(checked) => 
                    setChannels(prev => ({ ...prev, print: !!checked }))
                  }
                />
                <Label htmlFor="print" className="font-normal cursor-pointer">
                  Print/Mail
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sms"
                  checked={channels.sms}
                  onCheckedChange={(checked) => 
                    setChannels(prev => ({ ...prev, sms: !!checked }))
                  }
                />
                <Label htmlFor="sms" className="font-normal cursor-pointer">
                  SMS
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Correspondence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
