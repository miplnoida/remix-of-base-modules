/**
 * PriorMatterLinkDialog
 * Confirms attachment of a prior matter to either an audit visit or a
 * specific finding, capturing an optional relevance note.
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createPriorMatterLink } from '@/services/auditPriorMatterLinkService';
import type { PriorMatterType } from '@/types/employerHistory';

export interface PriorMatterLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
  inspectionId?: string;
  findingId?: string;
  matter: { type: PriorMatterType; id: string; label: string } | null;
  onLinked?: () => void;
  linkedBy?: string | null;
}

export function PriorMatterLinkDialog({
  open, onOpenChange, employerId, inspectionId, findingId, matter, onLinked, linkedBy,
}: PriorMatterLinkDialogProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const scope = findingId ? 'finding' : 'visit';

  const handleSave = async () => {
    if (!matter) return;
    if (!inspectionId && !findingId) {
      toast.error('No visit or finding context to link to.');
      return;
    }
    setSaving(true);
    try {
      await createPriorMatterLink({
        target: findingId ? { findingId } : { inspectionId: inspectionId! },
        employerId,
        matterType: matter.type,
        matterId: matter.id,
        matterLabel: matter.label,
        relevanceNote: note.trim() || null,
        linkedBy: linkedBy ?? null,
      });
      toast.success(`Linked to this ${scope}`);
      setNote('');
      onOpenChange(false);
      onLinked?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to this {scope}</DialogTitle>
          <DialogDescription>
            Attach this prior matter so it's part of the audit context and can be
            referenced in the report and communications.
          </DialogDescription>
        </DialogHeader>

        {matter && (
          <div className="rounded-md border p-3 bg-muted/30 text-sm">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">{matter.type}</div>
            <div className="font-medium mt-0.5">{matter.label}</div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="rel-note" className="text-xs">Relevance to this {scope} (optional)</Label>
          <Textarea
            id="rel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={`Why is this matter relevant to the current ${scope}?`}
            maxLength={500}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !matter}>
            {saving ? 'Linking…' : `Link to ${scope}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
