/**
 * Edit metadata for an existing ce_inspection_evidence row.
 * The file itself is immutable — replace by deleting and re-uploading.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EVIDENCE_TYPES = ['DOCUMENT', 'PHOTO', 'PAYROLL', 'SIGNED_SHEET', 'NOTE', 'OTHER'] as const;

export interface EditableEvidence {
  id: string;
  inspection_id: string;
  evidence_type: string;
  description: string | null;
  finding_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EditableEvidence | null;
}

export function EvidenceEditDialog({ open, onOpenChange, evidence }: Props) {
  const qc = useQueryClient();
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [description, setDescription] = useState('');
  const [findingId, setFindingId] = useState('');

  useEffect(() => {
    if (open && evidence) {
      setEvidenceType(evidence.evidence_type ?? 'DOCUMENT');
      setDescription(evidence.description ?? '');
      setFindingId(evidence.finding_id ?? '');
    }
  }, [open, evidence]);

  const findingsQ = useQuery({
    queryKey: ['ce-inspection-findings', evidence?.inspection_id],
    enabled: open && !!evidence?.inspection_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspection_findings')
        .select('id, title, finding_type')
        .eq('inspection_id', evidence!.inspection_id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string | null; finding_type: string | null }>;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!evidence) return;
      const { data: userData } = await supabase.auth.getUser();
      const updatedBy = userData?.user?.email ?? userData?.user?.id ?? null;
      const { error } = await supabase
        .from('ce_inspection_evidence')
        .update({
          evidence_type: evidenceType,
          description: description.trim() || null,
          finding_id: findingId || null,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', evidence.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evidence updated');
      qc.invalidateQueries({ queryKey: ['ce-evidence-list'] });
      qc.invalidateQueries({ queryKey: ['inspection-evidence'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update evidence'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Evidence</DialogTitle>
          <DialogDescription>
            Change the type, description, or linked finding. The uploaded file cannot be changed —
            delete and re-attach to replace it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={evidenceType} onValueChange={setEvidenceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Linked Finding</Label>
            <Select value={findingId || 'none'} onValueChange={(v) => setFindingId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {(findingsQ.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.title ?? f.finding_type ?? f.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
