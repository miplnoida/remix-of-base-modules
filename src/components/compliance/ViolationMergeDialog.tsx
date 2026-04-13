import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Merge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

interface ViolationMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: Array<{ id: string; violation_number: string; status: string; period_from: string | null; total_amount: number | null }>;
  onSuccess: () => void;
}

export function ViolationMergeDialog({ open, onOpenChange, violations, onSuccess }: ViolationMergeDialogProps) {
  const { userCode } = useUserCode();
  const [reason, setReason] = useState('');
  const [primaryId, setPrimaryId] = useState<string>(violations[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const handleMerge = async () => {
    if (!reason.trim()) {
      toast.error('Merge reason is required');
      return;
    }
    if (violations.length < 2) {
      toast.error('Select at least 2 violations to merge');
      return;
    }

    setLoading(true);
    try {
      const primary = primaryId || violations[0].id;
      const secondaryIds = violations.filter(v => v.id !== primary).map(v => v.id);
      const now = new Date().toISOString();
      const actor = userCode || 'UNKNOWN';

      // Calculate merged totals
      const mergedTotal = violations.reduce((sum, v) => sum + (Number(v.total_amount) || 0), 0);

      // Update primary violation total
      await supabase.from('ce_violations').update({
        total_amount: mergedTotal,
        updated_by: actor,
      }).eq('id', primary);

      // Mark secondaries as merged
      for (const secId of secondaryIds) {
        await supabase.from('ce_violations').update({
          is_merged: true,
          merged_into_id: primary,
          status: 'CANCELLED',
          updated_by: actor,
        }).eq('id', secId);

        // Write history for each merged violation
        await supabase.from('ce_violation_history').insert({
          violation_id: secId,
          action: 'Merged',
          from_value: violations.find(v => v.id === secId)?.status || 'OPEN',
          to_value: 'CANCELLED',
          notes: `Merged into ${violations.find(v => v.id === primary)?.violation_number}. Reason: ${reason}`,
          performed_by: actor,
          performed_at: now,
        } as any);
      }

      // Write history for primary
      const mergedNumbers = violations.filter(v => v.id !== primary).map(v => v.violation_number).join(', ');
      await supabase.from('ce_violation_history').insert({
        violation_id: primary,
        action: 'Merge Received',
        from_value: null,
        to_value: null,
        notes: `Absorbed violations: ${mergedNumbers}. Reason: ${reason}`,
        performed_by: actor,
        performed_at: now,
      } as any);

      toast.success(`Merged ${secondaryIds.length} violations into ${violations.find(v => v.id === primary)?.violation_number}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Merge failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Merge Violations
          </DialogTitle>
          <DialogDescription>
            Combine {violations.length} violations into one. Select the primary violation to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Violation (kept)</label>
            <div className="space-y-1">
              {violations.map(v => (
                <label key={v.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${primaryId === v.id ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <input
                    type="radio"
                    name="primary"
                    checked={primaryId === v.id}
                    onChange={() => setPrimaryId(v.id)}
                    className="accent-primary"
                  />
                  <Badge variant="outline" className="font-mono text-xs">{v.violation_number}</Badge>
                  <Badge variant="secondary">{v.status}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{v.period_from || '—'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Merge Reason *</label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are these violations being merged?" className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMerge} disabled={loading || !reason.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Merge {violations.length} Violations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
