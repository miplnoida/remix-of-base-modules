/**
 * Pending Approval — notices awaiting approval before dispatch.
 * Approve/Reject gated by manage_compliance / approve (admin path-through).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { approveNotice, rejectNotice } from '@/services/noticeWorkflowService';
import { useUserCode } from '@/hooks/useUserCode';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

export default function PendingApprovalPage() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [preview, setPreview] = useState<any>(null);
  const enabled = isComplianceFeatureEnabled('notices.pendingApproval');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ce_notices_pending'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_notices').select('*')
        .eq('status', 'PENDING_APPROVAL')
        .order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveNotice(id, userCode || 'system'),
    onSuccess: () => { toast.success('Notice approved'); qc.invalidateQueries({ queryKey: ['ce_notices_pending'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectNotice(id, userCode || 'system'),
    onSuccess: () => { toast.success('Notice returned to draft'); qc.invalidateQueries({ queryKey: ['ce_notices_pending'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Pending Approval" subtitle="Notices awaiting officer approval before dispatch." />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Approval workflow is disabled in feature toggles.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice #</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No notices pending approval.</TableCell></TableRow>
                    )}
                    {rows.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.notice_number}</TableCell>
                        <TableCell>{n.employer_name || n.employer_id}</TableCell>
                        <TableCell><Badge variant="outline">{n.notice_type}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString('en-GB')}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <button onClick={() => setPreview(n)} className="text-primary hover:underline text-xs">Preview</button>
                          <PermissionButton moduleName={MODULE} actionName="approve" size="sm" variant="default"
                            disabled={approveMut.isPending} onClick={() => approveMut.mutate(n.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </PermissionButton>
                          <PermissionButton moduleName={MODULE} actionName="approve" size="sm" variant="outline"
                            disabled={rejectMut.isPending} onClick={() => rejectMut.mutate(n.id)}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </PermissionButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{preview?.notice_number} — {preview?.subject}</DialogTitle></DialogHeader>
            <pre className="text-sm whitespace-pre-wrap">{preview?.body}</pre>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
