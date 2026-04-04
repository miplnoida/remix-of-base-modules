import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateBnProductVersion } from '@/hooks/bn/useBnProduct';
import { useBnVersionApprovals, useCreateBnVersionApproval } from '@/hooks/bn/useBnConfig';
import { BN_PRODUCT_STATUS_LABELS } from '@/types/bn';
import type { BnProductVersion, BnProductStatus } from '@/types/bn';
import { useState } from 'react';

interface Props {
  productId: string | undefined;
  versions: BnProductVersion[];
  onCreateVersion: () => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-4 w-4 text-muted-foreground" />,
  PENDING_APPROVAL: <Send className="h-4 w-4 text-amber-500" />,
  ACTIVE: <CheckCircle className="h-4 w-4 text-green-500" />,
  SUSPENDED: <XCircle className="h-4 w-4 text-destructive" />,
  ARCHIVED: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export function VersionHistoryTab({ productId, versions, onCreateVersion }: Props) {
  const { toast } = useToast();
  const updateVersionMutation = useUpdateBnProductVersion();
  const createApprovalMutation = useCreateBnVersionApproval();
  const [approvalDialog, setApprovalDialog] = useState<{ versionId: string; action: string } | null>(null);
  const [comments, setComments] = useState('');

  const handleStatusAction = async (versionId: string, action: string, toStatus: string) => {
    try {
      await updateVersionMutation.mutateAsync({ id: versionId, updates: { status: toStatus } as any });
      await createApprovalMutation.mutateAsync({ product_version_id: versionId, action, from_status: versions.find(v => v.id === versionId)?.status, to_status: toStatus, comments, performed_by: 'system' });
      toast({ title: 'Success', description: `Version ${action.toLowerCase()}d.` });
      setApprovalDialog(null);
      setComments('');
    } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  if (!productId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first.</CardContent></Card>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Version History</CardTitle><CardDescription>Effective-dated versions with draft → approval → active lifecycle</CardDescription></div>
          <Button onClick={onCreateVersion} className="gap-2"><Plus className="h-4 w-4" /> New Version</Button>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No versions yet. Click "New Version" to create the first one.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Version</TableHead><TableHead>Effective From</TableHead><TableHead>Effective To</TableHead>
                <TableHead>Status</TableHead><TableHead>Description</TableHead><TableHead className="w-48">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {versions.map((v: BnProductVersion) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">V{v.version_number}</TableCell>
                    <TableCell>{v.effective_from}</TableCell>
                    <TableCell>{v.effective_to || <span className="text-muted-foreground">Open-ended</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcons[v.status]}
                        <Badge variant={v.status === 'ACTIVE' ? 'default' : v.status === 'DRAFT' ? 'secondary' : 'outline'}>
                          {BN_PRODUCT_STATUS_LABELS[v.status as BnProductStatus] || v.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{v.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {v.status === 'DRAFT' && (
                          <Button variant="outline" size="sm" onClick={() => setApprovalDialog({ versionId: v.id, action: 'SUBMIT' })}>Submit</Button>
                        )}
                        {v.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button variant="default" size="sm" onClick={() => setApprovalDialog({ versionId: v.id, action: 'APPROVE' })}>Approve</Button>
                            <Button variant="destructive" size="sm" onClick={() => setApprovalDialog({ versionId: v.id, action: 'REJECT' })}>Reject</Button>
                          </>
                        )}
                        {v.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" onClick={() => setApprovalDialog({ versionId: v.id, action: 'RETIRE' })}>Retire</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{approvalDialog?.action === 'SUBMIT' ? 'Submit for Approval' : approvalDialog?.action === 'APPROVE' ? 'Approve Version' : approvalDialog?.action === 'REJECT' ? 'Reject Version' : 'Retire Version'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comments {approvalDialog?.action === 'REJECT' ? '*' : '(optional)'}</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Reason or notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancel</Button>
            <Button
              variant={approvalDialog?.action === 'REJECT' ? 'destructive' : 'default'}
              onClick={() => {
                if (!approvalDialog) return;
                const statusMap: Record<string, string> = { SUBMIT: 'PENDING_APPROVAL', APPROVE: 'ACTIVE', REJECT: 'DRAFT', RETIRE: 'ARCHIVED' };
                handleStatusAction(approvalDialog.versionId, approvalDialog.action, statusMap[approvalDialog.action]);
              }}
            >
              {approvalDialog?.action === 'SUBMIT' ? 'Submit' : approvalDialog?.action === 'APPROVE' ? 'Approve' : approvalDialog?.action === 'REJECT' ? 'Reject' : 'Retire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
