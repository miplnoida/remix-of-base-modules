import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Split } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

interface ViolationSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: { id: string; violation_number: string; employer_id: string; employer_name: string; violation_type_id: string; period_from: string | null; period_to: string | null; total_amount: number | null; priority: string; severity: string; summary: string };
  onSuccess: () => void;
}

export function ViolationSplitDialog({ open, onOpenChange, violation, onSuccess }: ViolationSplitDialogProps) {
  const { userCode } = useUserCode();
  const [splitCount, setSplitCount] = useState(2);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSplit = async () => {
    if (!reason.trim()) {
      toast.error('Split reason is required');
      return;
    }
    if (splitCount < 2 || splitCount > 12) {
      toast.error('Split into 2-12 violations');
      return;
    }

    setLoading(true);
    try {
      const actor = userCode || 'UNKNOWN';
      const now = new Date().toISOString();
      const perAmount = Math.round(((Number(violation.total_amount) || 0) / splitCount) * 100) / 100;

      const newViolations = [];
      for (let i = 0; i < splitCount; i++) {
        const suffix = String.fromCharCode(65 + i); // A, B, C...
        const newNumber = `${violation.violation_number}-${suffix}`;

        const { data: inserted, error } = await supabase.from('ce_violations').insert({
          violation_number: newNumber,
          employer_id: violation.employer_id,
          employer_name: violation.employer_name,
          violation_type_id: violation.violation_type_id,
          period_from: violation.period_from,
          period_to: violation.period_to,
          total_amount: perAmount,
          principal_amount: perAmount,
          priority: violation.priority,
          severity: violation.severity,
          summary: `${violation.summary} (Split ${suffix})`,
          status: 'OPEN',
          source_type: 'MANUAL',
          split_from_id: violation.id,
          created_by: actor,
          discovered_by: actor,
          discovered_date: now,
        } as any).select('id, violation_number').single();

        if (error) throw error;
        newViolations.push(inserted);

        // History for new violation
        await supabase.from('ce_violation_history').insert({
          violation_id: (inserted as any).id,
          action: 'Created from Split',
          from_value: null,
          to_value: 'OPEN',
          notes: `Split from ${violation.violation_number}. Reason: ${reason}`,
          performed_by: actor,
          performed_at: now,
        } as any);
      }

      // Mark original as merged/cancelled
      await supabase.from('ce_violations').update({
        is_merged: true,
        status: 'CANCELLED',
        updated_by: actor,
      }).eq('id', violation.id);

      // History for original
      await supabase.from('ce_violation_history').insert({
        violation_id: violation.id,
        action: 'Split',
        from_value: 'OPEN',
        to_value: 'CANCELLED',
        notes: `Split into ${newViolations.map((nv: any) => nv.violation_number).join(', ')}. Reason: ${reason}`,
        performed_by: actor,
        performed_at: now,
      } as any);

      toast.success(`Split into ${splitCount} violations`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Split failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" /> Split Violation
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>
              Split <Badge variant="outline" className="font-mono">{violation.violation_number}</Badge> into
              multiple independent violations — useful when one detected row actually represents several distinct
              breaches (for example, three different unpaid months bundled into a single non-payment detection)
              so each can be tracked, noticed, and resolved separately.
            </div>
            <div className="text-xs text-muted-foreground">
              The original violation is marked <strong>CANCELLED</strong> and kept for audit. Each child receives an
              equal share of the total amount, inherits the employer/period, and starts in status <strong>OPEN</strong>.
              A history entry is written on both the parent and every child.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Total</label>
            <div className="text-lg font-bold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(Number(violation.total_amount) || 0)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Split Into (count)</label>
            <Input type="number" min={2} max={12} value={splitCount} onChange={e => setSplitCount(Number(e.target.value))} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">
              Each will receive ~{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(Math.round(((Number(violation.total_amount) || 0) / splitCount) * 100) / 100)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Split Reason *</label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this violation being split?" className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSplit} disabled={loading || !reason.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Split into {splitCount}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
