/**
 * Employer Responses — capture/list responses tied to a notice.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Inbox, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchNoticeResponses, recordEmployerResponse, RESPONSE_TYPES, type ResponseType } from '@/services/noticeWorkflowService';
import { useUserCode } from '@/hooks/useUserCode';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

export default function EmployerResponsesPage() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const enabled = isComplianceFeatureEnabled('notices.employerResponses');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    noticeId: '', responseType: 'ACKNOWLEDGEMENT' as ResponseType,
    responseDate: new Date().toISOString().slice(0, 10),
    notes: '', nextAction: '',
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['ce_notice_responses', 'all'],
    enabled,
    queryFn: () => fetchNoticeResponses({}),
  });

  const { data: notices = [] } = useQuery({
    queryKey: ['ce_notices_for_response_picker'],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from('ce_notices')
        .select('id,notice_number,employer_id,employer_name,case_id,violation_id')
        .in('status', ['SENT', 'DELIVERED', 'ACKNOWLEDGED']).order('sent_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const recordMut = useMutation({
    mutationFn: async () => {
      const n = (notices as any[]).find(x => x.id === form.noticeId);
      if (!n) throw new Error('Pick a notice');
      await recordEmployerResponse({
        noticeId: form.noticeId,
        caseId: n.case_id, violationId: n.violation_id,
        employerId: n.employer_id,
        responseType: form.responseType,
        responseDate: form.responseDate,
        notes: form.notes, nextAction: form.nextAction,
        userCode: userCode || 'system',
      });
    },
    onSuccess: () => {
      toast.success('Response recorded');
      qc.invalidateQueries({ queryKey: ['ce_notice_responses'] });
      qc.invalidateQueries({ queryKey: ['ce_notices'] });
      setOpen(false);
      setForm(f => ({ ...f, noticeId: '', notes: '', nextAction: '' }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Employer Responses" subtitle="Capture acknowledgements, disputes, and other responses to notices." />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Employer responses are disabled in feature toggles.</CardContent></Card>
        ) : (
          <>
            <div className="flex justify-end">
              <PermissionButton moduleName={MODULE} actionName="create" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record Response
              </PermissionButton>
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Next Action</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employer responses yet.</TableCell></TableRow>
                      )}
                      {responses.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.response_date}</TableCell>
                          <TableCell>{r.employer_id}</TableCell>
                          <TableCell><Badge variant="outline">{r.response_type}</Badge></TableCell>
                          <TableCell className="text-xs">{r.next_action || '—'}</TableCell>
                          <TableCell className="text-xs">{r.recorded_by}</TableCell>
                          <TableCell className="text-xs max-w-md truncate">{r.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Record Employer Response</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Notice *</Label>
                <Select value={form.noticeId} onValueChange={(v) => setForm(f => ({ ...f, noticeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pick a notice" /></SelectTrigger>
                  <SelectContent>
                    {(notices as any[]).map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.notice_number} — {n.employer_name || n.employer_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Response Type *</Label>
                  <Select value={form.responseType} onValueChange={(v) => setForm(f => ({ ...f, responseType: v as ResponseType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESPONSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Response Date *</Label>
                  <Input type="date" value={form.responseDate} onChange={e => setForm(f => ({ ...f, responseDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Next Action</Label>
                <Input value={form.nextAction} onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))} placeholder="e.g. Open waiver request, Schedule call" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <PermissionButton moduleName={MODULE} actionName="create" onClick={() => recordMut.mutate()} disabled={!form.noticeId || recordMut.isPending}>
                Save Response
              </PermissionButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
