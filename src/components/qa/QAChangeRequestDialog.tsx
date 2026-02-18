import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export type ChangeTargetType = 'knowledge_entry' | 'test_case';
export type ChangeType = 'create' | 'update' | 'delete' | 'archive';

interface QAChangeRequestDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: ChangeTargetType;
  changeType: ChangeType;
  targetId?: string;      // existing record id (for update/delete)
  module?: string;
  proposedChanges: Record<string, any>;
  beforeSnapshot?: Record<string, any>;
  onApproved?: () => void; // called if admin self-approves (own session with Admin role)
}

export function QAChangeRequestDialog({
  open,
  onClose,
  targetType,
  changeType,
  targetId,
  module,
  proposedChanges,
  beforeSnapshot,
  onApproved,
}: QAChangeRequestDialogProps) {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(() =>
    proposedChanges.title
      ? `Update: ${proposedChanges.title}`
      : `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} ${targetType.replace('_', ' ')}`
  );
  const [reason, setReason] = useState('');
  const [requesterCode, setRequesterCode] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required');
      const { error } = await supabase.from('qa_change_requests').insert({
        target_type: targetType,
        target_id: targetId ?? null,
        change_type: changeType,
        module: module ?? null,
        title,
        reason,
        proposed_changes: proposedChanges,
        before_snapshot: beforeSnapshot ?? null,
        requested_by: user?.id ?? null,
        requested_by_code: requesterCode || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Change request submitted for approval', {
        description: 'An authorized approver must review this before changes are applied.',
      });
      qc.invalidateQueries({ queryKey: ['qa-change-requests'] });
      onClose();
    },
    onError: (e: any) => toast.error('Failed to submit request: ' + e.message),
  });

  const actionLabel = {
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    archive: 'Archive',
  }[changeType];

  const targetLabel = targetType === 'knowledge_entry' ? 'Knowledge Entry' : 'Test Case';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Change Request Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/30" style={{backgroundColor: 'hsl(var(--warning, 38 92% 50%) / 0.1)', borderColor: 'hsl(var(--warning, 38 92% 50%) / 0.3)'}}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-foreground opacity-70" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Approval Required</p>
              <p className="text-muted-foreground mt-0.5">
                Modifications to the QA Knowledge Repository and Test Cases require explicit
                stakeholder approval before being committed. Your change request will be queued
                for review.
              </p>
            </div>
          </div>

          {/* Action summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">{actionLabel}</Badge>
            <Badge variant="secondary" className="text-xs">{targetLabel}</Badge>
            {module && <Badge className="text-xs">{module}</Badge>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Request Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the change" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Reason / Justification <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this change is required, what triggered it, and the impact if not applied…"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Your User Code (optional — for audit trail)</Label>
            <Input
              value={requesterCode}
              onChange={e => setRequesterCode(e.target.value)}
              placeholder="e.g. USR01"
              maxLength={20}
            />
          </div>

          {/* Changed fields preview */}
          {Object.keys(proposedChanges).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fields to be changed</Label>
              <div className="p-2 rounded border bg-muted/30 text-xs font-mono overflow-auto max-h-28">
                {Object.keys(proposedChanges).join(', ')}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!title.trim() || !reason.trim() || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Submitting…' : 'Submit for Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
