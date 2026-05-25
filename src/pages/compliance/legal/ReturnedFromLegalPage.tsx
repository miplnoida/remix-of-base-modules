import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { useUserCode } from '@/hooks/useUserCode';
import { listReturns, resolveReturn, type LegalReturn } from '@/services/legalHandoffService';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PERMISSION = 'manage_compliance';

export default function ReturnedFromLegalPage() {
  return (
    <PermissionWrapper moduleName={PERMISSION}>
      <Inner />
    </PermissionWrapper>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [resolving, setResolving] = useState<{ open: boolean; item: LegalReturn | null; notes: string }>({
    open: false,
    item: null,
    notes: '',
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['legal-returns'],
    queryFn: () => listReturns(),
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveReturn(resolving.item!.id, resolving.notes, userCode || 'SYSTEM'),
    onSuccess: () => {
      toast.success('Return marked resolved');
      qc.invalidateQueries({ queryKey: ['legal-returns'] });
      setResolving({ open: false, item: null, notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusVariant = (s: string) =>
    s === 'OPEN' ? 'destructive' : s === 'RESOLVED' ? 'default' : 'secondary';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          Returned From Legal
        </h1>
        <p className="text-sm text-muted-foreground">Referrals returned by the Legal team — create follow-up tasks and update case status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open and Resolved Returns</CardTitle>
          <CardDescription>{rows.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Returned</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Required Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.returned_at?.slice(0, 10)}<br /><span className="text-muted-foreground">{r.returned_by}</span></TableCell>
                    <TableCell className="max-w-xs">{r.reason}</TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">{r.required_action || '—'}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.resolution_status) as any}>{r.resolution_status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.resolved_at?.slice(0, 10) || '—'}</TableCell>
                    <TableCell>
                      {r.resolution_status !== 'RESOLVED' && (
                        <PermissionButton
                          moduleName={PERMISSION}
                         
                          variant="outline"
                          onClick={() => setResolving({ open: true, item: r, notes: '' })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                        </PermissionButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No returns from Legal</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolving.open} onOpenChange={(o) => !o && setResolving({ open: false, item: null, notes: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea
              rows={5}
              value={resolving.notes}
              onChange={(e) => setResolving((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving({ open: false, item: null, notes: '' })}>Cancel</Button>
            <Button onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending || !resolving.notes.trim()}>
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
