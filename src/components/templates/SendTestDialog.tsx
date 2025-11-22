import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Bell } from "lucide-react";
import { NotificationChannel } from "@/types/notification";

interface SendTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
}

export default function SendTestDialog({ open, onOpenChange, template }: SendTestDialogProps) {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");

  const getPlaceholder = (channel: NotificationChannel) => {
    switch (channel) {
      case 'Email': return 'Enter email address';
      case 'SMS': return 'Enter phone number (e.g., 1-869-465-2333)';
      case 'Push': return 'Enter user ID or email';
      default: return 'Enter recipient';
    }
  };

  const getIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'Email': return <Mail className="h-5 w-5" />;
      case 'SMS': return <MessageSquare className="h-5 w-5" />;
      case 'Push': return <Bell className="h-5 w-5" />;
      default: return <Mail className="h-5 w-5" />;
    }
  };

  const handleSend = () => {
    if (!recipient.trim()) {
      toast({
        title: "Recipient Required",
        description: "Please enter a recipient address",
        variant: "destructive",
      });
      return;
    }

    // Simulate sending test message
    toast({
      title: "Test Message Sent",
      description: `Test ${template.channel} sent to ${recipient} using template "${template.templateName}"`,
    });
    
    setRecipient("");
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(template.channel)}
            Send Test Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Template:</strong> {template.templateName}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Channel:</strong> {template.channel}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient *</Label>
            <Input
              id="recipient"
              placeholder={getPlaceholder(template.channel)}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Test message will be sent with sample data values
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            Send Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
