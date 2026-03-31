import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface EmailDeliveryPromptProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientEmail: string;
  documentType: 'invoice' | 'receipt';
  documentNumber?: string;
}

export const EmailDeliveryPrompt: React.FC<EmailDeliveryPromptProps> = ({
  open, onClose, onConfirm, recipientEmail, documentType, documentNumber,
}) => {
  const label = documentType === 'invoice' ? 'Invoice' : 'Receipt';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Send {label} via Email
          </DialogTitle>
          <DialogDescription>
            Would you like to send {label} {documentNumber ? `#${documentNumber}` : ''} to the payer's registered email?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-md bg-muted text-sm">
          <span className="text-muted-foreground">Recipient: </span>
          <span className="font-medium">{recipientEmail || 'No email on file'}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>No, Skip</Button>
          <Button onClick={onConfirm} disabled={!recipientEmail}>
            <Mail className="h-4 w-4 mr-1" />
            Yes, Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
