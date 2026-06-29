/**
 * CreateLinkCaseDialog
 * Lets an admin either link a violation to an existing active case for the
 * same employer, or explicitly create a brand-new case for it.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Link2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { caseViolationService } from '@/services/caseViolationService';

interface ViolationCtx {
  id: string;
  violation_number: string;
  employer_id: string;
  employer_name?: string;
  territory?: string;
  priority?: string;
  total_amount?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  violation: ViolationCtx;
  performedBy: string;
  onSuccess: (caseId: string) => void;
}

export const CreateLinkCaseDialog = ({ open, onOpenChange, violation, performedBy, onSuccess }: Props) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['active-cases-for-employer', violation.employer_id],
    enabled: open && !!violation.employer_id,
    queryFn: () => caseViolationService.listActiveCasesForEmployer(violation.employer_id),
  });

  const close = () => {
    if (submitting) return;
    setSelectedCaseId(null);
    onOpenChange(false);
  };

  const handleLink = async () => {
    if (!selectedCaseId || submitting) return;
    const target = cases.find(c => c.id === selectedCaseId);
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await caseViolationService.linkViolationToCase(
        violation.id, target.id, performedBy, violation.violation_number, target.case_number
      );
      if (res.success) {
        toast.success(`Violation linked to case ${target.case_number}`);
        onSuccess(target.id);
        onOpenChange(false);
      } else {
        toast.error('Failed to link', { description: res.error });
      }
    } catch (e: any) {
      toast.error('Failed to link', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNew = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await caseViolationService.createNewCaseForViolation(violation, performedBy);
      if (res.success && res.caseId) {
        toast.success(`Case ${res.caseNumber} created & violation linked`);
        onSuccess(res.caseId);
        onOpenChange(false);
      } else {
        toast.error('Failed to create case', { description: res.error });
      }
    } catch (e: any) {
      toast.error('Failed to create case', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : onOpenChange(o))}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Create or Link Case
          </DialogTitle>
          <DialogDescription>
            Violation <span className="font-mono">{violation.violation_number}</span> for{' '}
            <strong>{violation.employer_name || violation.employer_id}</strong>. Link it to an
            existing active case for this employer, or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Active cases for this employer
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading active cases…
            </div>
          ) : cases.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
              No active cases found for this employer. You can create a new one below.
            </div>
          ) : (
            <div className="max-h-72 overflow-auto rounded-md border divide-y">
              {cases.map((c) => {
                const selected = selectedCaseId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    disabled={submitting}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`w-full text-left p-3 hover:bg-muted/60 transition-colors ${
                      selected ? 'bg-muted ring-1 ring-primary/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{c.case_number}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{c.status}</Badge>
                        {c.priority && <Badge variant="secondary" className="text-xs">{c.priority}</Badge>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {c.summary || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Opened {c.opened_date || '—'} · Type {c.case_type || '—'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={handleCreateNew}
            disabled={submitting || isLoading}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Create New Case
          </Button>
          <Button
            onClick={handleLink}
            disabled={submitting || !selectedCaseId}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            Link to Selected Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
