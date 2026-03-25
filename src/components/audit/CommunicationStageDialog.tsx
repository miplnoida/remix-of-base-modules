import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { useRecordCommunicationStage, useValidateTemplatePolicy, STAGE_LABELS } from '@/hooks/useAuditCommunicationStages';
import { useIADocumentTemplates } from '@/hooks/useAuditData';

interface CommunicationStageDialogProps {
  engagementId: string;
  engagementName?: string;
  stageCode: string;
  open: boolean;
  onClose: () => void;
}

export function CommunicationStageDialog({ engagementId, engagementName, stageCode, open, onClose }: CommunicationStageDialogProps) {
  const { data: templates = [] } = useIADocumentTemplates();
  const recordStage = useRecordCommunicationStage();
  const validatePolicy = useValidateTemplatePolicy();

  const [templateId, setTemplateId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [ackRequired, setAckRequired] = useState(false);
  const [policyValid, setPolicyValid] = useState<boolean | null>(null);
  const [policyError, setPolicyError] = useState('');

  // Validate template when selected
  useEffect(() => {
    if (templateId) {
      validatePolicy.mutateAsync({ stageCode, templateId }).then(result => {
        setPolicyValid(result?.valid ?? true);
        setPolicyError(result?.error || '');
      }).catch(() => {
        setPolicyValid(null);
        setPolicyError('');
      });
    } else {
      setPolicyValid(null);
      setPolicyError('');
    }
  }, [templateId, stageCode]);

  const handleSend = () => {
    if (!recipientEmail) return;
    recordStage.mutate({
      engagementId,
      stageCode,
      templateId: templateId || undefined,
      recipientName,
      recipientEmail,
      notes,
      acknowledgmentRequired: ackRequired,
    }, {
      onSuccess: () => {
        onClose();
        setTemplateId('');
        setRecipientName('');
        setRecipientEmail('');
        setNotes('');
        setAckRequired(false);
      },
    });
  };

  const stageLabel = STAGE_LABELS[stageCode] || stageCode;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send: {stageLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {engagementName && (
            <div className="text-xs text-muted-foreground">
              Engagement: <span className="font-medium text-foreground">{engagementName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {(templates as any[]).filter(t => t.is_active).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.category ? `(${t.category})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {policyValid === false && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {policyError}
              </div>
            )}
            {policyValid === true && templateId && (
              <Badge className="bg-green-100 text-green-800 text-[10px]">✓ Template matches policy</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Department Head" />
            </div>
            <div className="space-y-2">
              <Label>Recipient Email *</Label>
              <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={ackRequired} onCheckedChange={setAckRequired} />
            <Label className="text-sm">Require acknowledgment from recipient</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={!recipientEmail || recordStage.isPending || policyValid === false}>
            {recordStage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send Communication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
