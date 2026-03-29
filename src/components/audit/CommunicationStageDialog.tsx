import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Loader2, AlertTriangle, Building2, User, FileText, Edit3 } from 'lucide-react';
import { useRecordCommunicationStage, useValidateTemplatePolicy, STAGE_LABELS } from '@/hooks/useAuditCommunicationStages';
import { useIADocumentTemplates } from '@/hooks/useAuditData';

// Map stage codes to required template categories from the policy matrix
const STAGE_TO_CATEGORY: Record<string, string> = {
  PLAN_INTIMATION: 'Audit Notification',
  TEAM_AND_SCOPE_NOTICE: 'Team Disclosure',
  DOC_REQUEST: 'Document Request',
  ENTRANCE_MEETING: 'Meeting Notice',
  QUERY_CYCLE: 'Query Response',
  DRAFT_FINDING_DISCUSSION: 'Finding Discussion',
  EXIT_MEETING: 'Meeting Notice',
  FINAL_REPORT_ISSUE: 'Audit Report',
  ACTION_PLAN_REMINDER: 'Action Reminder',
};

export interface EngagementContext {
  engagement_name?: string;
  department_name?: string;
  department_head?: string;
  department_email?: string;
  lead_auditor_name?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  objectives?: string;
  scope?: string;
  function_name?: string;
}

interface CommunicationStageDialogProps {
  engagementId: string;
  engagementName?: string;
  stageCode: string;
  open: boolean;
  onClose: () => void;
  engagementContext?: EngagementContext;
}

function renderTemplate(content: string, data: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

export function CommunicationStageDialog({ engagementId, engagementName, stageCode, open, onClose, engagementContext }: CommunicationStageDialogProps) {
  const { data: templates = [] } = useIADocumentTemplates();
  const recordStage = useRecordCommunicationStage();
  const validatePolicy = useValidateTemplatePolicy();

  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [notes, setNotes] = useState('');
  const [ackRequired, setAckRequired] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [policyValid, setPolicyValid] = useState<boolean | null>(null);

  // Find the matching template for this stage's required category
  const matchingTemplate = useMemo(() => {
    const requiredCategory = STAGE_TO_CATEGORY[stageCode];
    if (!requiredCategory) return null;
    const activeTemplates = (templates as any[]).filter(t => t.is_active && t.category === requiredCategory);
    // Pick highest version
    if (activeTemplates.length === 0) return null;
    return activeTemplates.sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0];
  }, [templates, stageCode]);

  // Build merge data from engagement context
  const mergeData = useMemo(() => {
    const ctx = engagementContext || {};
    return {
      engagement_name: ctx.engagement_name || engagementName || '',
      department_name: ctx.department_name || '',
      department_head: ctx.department_head || '',
      lead_auditor: ctx.lead_auditor_name || '',
      planned_start_date: ctx.planned_start_date || '',
      planned_end_date: ctx.planned_end_date || '',
      objectives: ctx.objectives || '',
      scope: ctx.scope || '',
      response_due_date: '[Please specify]',
    };
  }, [engagementContext, engagementName]);

  // Auto-fill when dialog opens or context changes
  useEffect(() => {
    if (!open) return;

    // Auto-fill recipient from engagement context
    const ctx = engagementContext || {};
    setRecipientName(ctx.department_head || '');
    setRecipientEmail(ctx.department_email || '');
    setIsEditing(false);
    setNotes('');
    setAckRequired(false);

    // Auto-select and render template
    if (matchingTemplate) {
      setSelectedTemplateId(matchingTemplate.id);
      const rendered = renderTemplate(matchingTemplate.content || '', mergeData);
      setMessageContent(rendered);

      // Validate policy
      validatePolicy.mutateAsync({ stageCode, templateId: matchingTemplate.id }).then(result => {
        setPolicyValid(result?.valid ?? true);
      }).catch(() => setPolicyValid(null));
    } else {
      setSelectedTemplateId('');
      setMessageContent('');
      setPolicyValid(null);
    }
  }, [open, stageCode, matchingTemplate?.id, mergeData]);

  const handleSend = () => {
    if (!recipientEmail) return;
    recordStage.mutate({
      engagementId,
      stageCode,
      templateId: selectedTemplateId || undefined,
      recipientName,
      recipientEmail,
      notes: notes || messageContent,
      acknowledgmentRequired: ackRequired,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const stageLabel = STAGE_LABELS[stageCode] || stageCode;
  const requiredCategory = STAGE_TO_CATEGORY[stageCode];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send: {stageLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Engagement Info Bar */}
          {engagementContext && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-muted-foreground">Engagement:</span>
                    <span className="font-medium truncate">{engagementContext.engagement_name || engagementName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium truncate">{engagementContext.department_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-muted-foreground">Dept. Head:</span>
                    <span className="font-medium truncate">{engagementContext.department_head || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-muted-foreground">Lead Auditor:</span>
                    <span className="font-medium truncate">{engagementContext.lead_auditor_name || '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Info */}
          <div className="space-y-1">
            <Label className="text-xs">Template</Label>
            {matchingTemplate ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
                  ✓ {matchingTemplate.name} (v{matchingTemplate.version_number || 1})
                </Badge>
                <Badge variant="outline" className="text-[10px]">{requiredCategory}</Badge>
                {policyValid === true && (
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">Policy Compliant</Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                No active template found for category "{requiredCategory}". Please create one in Template Management.
              </div>
            )}
          </div>

          {/* Recipient - Auto-filled, editable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Recipient Name</Label>
              <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Department Head" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recipient Email *</Label>
              <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-sm" />
            </div>
          </div>

          {/* Communication Content - Pre-filled from template with merge fields resolved */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Communication Content</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="h-3 w-3" />
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
            </div>
            {isEditing ? (
              <Textarea
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            ) : (
              <div className="border rounded-md p-3 bg-muted/30 max-h-[250px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed text-foreground">
                  {messageContent || 'No template content available. Click Edit to write custom content.'}
                </pre>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Additional Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} className="text-sm" />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={ackRequired} onCheckedChange={setAckRequired} />
            <Label className="text-xs">Require acknowledgment from recipient</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSend} disabled={!recipientEmail || recordStage.isPending || policyValid === false} size="sm">
            {recordStage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send Communication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
