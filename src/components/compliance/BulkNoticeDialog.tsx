import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BulkNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
  employerName: string;
  onSuccess: () => void;
}

export function BulkNoticeDialog({ open, onOpenChange, employerId, employerName, onSuccess }: BulkNoticeDialogProps) {
  const { userCode } = useUserCode();
  const [templateId, setTemplateId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch active violations for this employer
  const { data: violations = [] } = useQuery({
    queryKey: ['ce_violations_for_bulk_notice', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violations')
        .select('id, violation_number, status, period_from, total_amount')
        .eq('employer_id', employerId)
        .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'])
        .eq('is_merged', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!employerId,
  });

  // Fetch notice templates
  const { data: templates = [] } = useQuery({
    queryKey: ['ce_notice_templates_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_notice_templates')
        .select('id, template_code, name')
        .eq('is_active', true)
        .order('template_code');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleIssue = async () => {
    if (!templateId) {
      toast.error('Select a notice template');
      return;
    }
    if (violations.length === 0) {
      toast.error('No active violations to issue notices for');
      return;
    }

    setLoading(true);
    try {
      const actor = userCode || 'UNKNOWN';
      const now = new Date().toISOString();
      const template = templates.find((t: any) => t.id === templateId) as any;
      let created = 0;
      let skipped = 0;

      for (const v of violations as any[]) {
        // Check for existing active notice with same template
        const { count } = await supabase
          .from('ce_notices')
          .select('id', { count: 'exact', head: true })
          .eq('violation_id', v.id)
          .eq('template_id', templateId)
          .in('status', ['DRAFT', 'SENT', 'DELIVERED']);

        if ((count || 0) > 0) {
          skipped++;
          continue;
        }

        // Generate notice number
        const noticeNumber = `NTC-${new Date().getFullYear()}-${v.violation_number.replace('VN-', '')}`;

        await supabase.from('ce_notices').insert({
          notice_number: noticeNumber,
          notice_type: template?.name || 'Bulk Notice',
          template_id: templateId,
          violation_id: v.id,
          employer_id: employerId,
          employer_name: employerName,
          status: 'DRAFT',
          content: notes || `Bulk notice issued for violation ${v.violation_number}`,
          created_by: actor,
        } as any);
        created++;
      }

      toast.success(`Bulk notices issued: ${created} created, ${skipped} skipped (duplicates)`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Bulk notice failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Bulk Notice Issuance
          </DialogTitle>
          <DialogDescription>
            Issue notices for all {violations.length} active violations of <strong>{employerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Active Violations ({violations.length})</label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 mt-1 space-y-1">
              {violations.length === 0 ? (
                <span className="text-sm text-muted-foreground">No active violations</span>
              ) : (
                (violations as any[]).map((v) => (
                  <div key={v.id} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">{v.violation_number}</Badge>
                    <Badge variant="secondary">{v.status}</Badge>
                    <span className="text-muted-foreground">{v.period_from || '—'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notice Template *</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {(templates as any[]).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_code} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleIssue} disabled={loading || !templateId || violations.length === 0}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Issue {violations.length} Notices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
