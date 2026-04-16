/**
 * Send (or copy) a tokenized acknowledgment link to the employer.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Send } from 'lucide-react';
import { auditReportService } from '@/services/auditReportService';
import { toast } from 'sonner';
import type { AuditReportAcknowledgment } from '@/types/auditReport';

interface Props {
  reportId: string;
  defaultRecipientName?: string;
  defaultRecipientEmail?: string;
  onClose: () => void;
  onSent: () => void;
}

export function SendAcknowledgmentDialog({
  reportId,
  defaultRecipientName,
  defaultRecipientEmail,
  onClose,
  onSent,
}: Props) {
  const [recipientName, setRecipientName] = useState(defaultRecipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail ?? '');
  const [recipientDesignation, setRecipientDesignation] = useState('');
  const [expiryDays, setExpiryDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<AuditReportAcknowledgment | null>(null);
  const [copied, setCopied] = useState(false);

  const link = created
    ? `${window.location.origin}/acknowledge-audit/${created.linkToken}`
    : '';

  const submit = async () => {
    if (!recipientName.trim()) return toast.error('Recipient name is required');
    try {
      setCreating(true);
      const result = await auditReportService.createAcknowledgmentLink({
        reportId,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        recipientDesignation: recipientDesignation.trim() || undefined,
        expiryDays,
      });
      setCreated(result);
      onSent();
      toast.success('Acknowledgment link generated');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Employer Acknowledgment Link</DialogTitle>
        </DialogHeader>

        {!created ? (
          <div className="space-y-3">
            <div>
              <Label>Recipient name *</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                value={recipientDesignation}
                onChange={(e) => setRecipientDesignation(e.target.value)}
                placeholder="e.g. HR Manager"
              />
            </div>
            <div>
              <Label>Link valid for (days)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 14)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A unique tokenized link will be created. The recipient can view and electronically sign the
              employer copy of this report without needing to log in.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border p-3 bg-muted/40">
              <Label className="text-xs">Acknowledgment link</Label>
              <div className="flex gap-2 mt-1">
                <Input value={link} readOnly className="font-mono text-xs" />
                <Button onClick={copy} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with {created.recipientName}. It expires on{' '}
              {new Date(created.expiresAt).toLocaleDateString()}.
            </p>
          </div>
        )}

        <DialogFooter>
          {!created ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={creating}>
                <Send className="h-4 w-4 mr-1" /> {creating ? 'Generating…' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
