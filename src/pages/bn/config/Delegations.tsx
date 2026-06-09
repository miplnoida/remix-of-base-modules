import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { SmartSelect } from '@/components/bn/smart';
import { useWorkflowRoles } from '@/hooks/bn/useWorkflowRoles';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { Plus, Check, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  listDelegations,
  createDelegation,
  approveDelegation,
  revokeDelegation,
  type BnRoleDelegation,
} from '@/services/bn/delegationService';

export default function Delegations() {
  const { user } = useSupabaseAuth();
  const { userCode } = useUserCode();
  const { roles } = useWorkflowRoles();
  const [rows, setRows] = useState<BnRoleDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    to_user_id: '',
    role_name: '',
    valid_from: new Date().toISOString().slice(0, 10),
    valid_to: '',
    reason: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listDelegations());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!user?.id) { toast.error('Not signed in'); return; }
    if (!form.to_user_id || !form.role_name || !form.valid_from || !form.valid_to || !form.reason) {
      toast.error('All fields are required');
      return;
    }
    try {
      await createDelegation({
        fromUserId: user.id,
        toUserId: form.to_user_id,
        roleName: form.role_name,
        validFrom: form.valid_from,
        validTo: form.valid_to,
        reason: form.reason,
        createdBy: userCode || undefined,
      });
      toast.success('Delegation requested — pending supervisor approval');
      setDialogOpen(false);
      setForm({ to_user_id: '', role_name: '', valid_from: new Date().toISOString().slice(0, 10), valid_to: '', reason: '' });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const approve = async (id: string) => {
    if (!user?.id) return;
    try {
      await approveDelegation(id, user.id);
      toast.success('Approved');
      load();
    } catch (e: any) { toast.error(e.message); }
  };
  const revoke = async (id: string) => {
    try {
      await revokeDelegation(id);
      toast.success('Revoked');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (s: string) => {
    const variant = s === 'APPROVED' ? 'default' : s === 'PENDING' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{s}</Badge>;
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Role Delegations</h1>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Request Delegation</Button>
        </div>
        <BnScreenRoleBanner
          role="library"
          description="Temporarily delegate a workbasket role to another user. Each delegation needs supervisor approval and is bounded by date range."
        />

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No delegations recorded</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.from_user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{r.to_user_id.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="secondary">{r.role_name}</Badge></TableCell>
                    <TableCell className="text-xs">{r.valid_from} → {r.valid_to}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={r.reason}>{r.reason}</TableCell>
                    <TableCell>
                      {r.status === 'PENDING' && (
                        <Button size="sm" variant="outline" onClick={() => approve(r.id)}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                      )}
                      {r.status === 'APPROVED' && (
                        <Button size="sm" variant="ghost" onClick={() => revoke(r.id)}><XCircle className="h-3 w-3 mr-1" /> Revoke</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Role Delegation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Delegate To (User ID)</label>
                <Input
                  placeholder="auth user UUID"
                  value={form.to_user_id}
                  onChange={(e) => setForm((p) => ({ ...p, to_user_id: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <SmartSelect
                  value={form.role_name}
                  onValueChange={(v) => setForm((p) => ({ ...p, role_name: v }))}
                  options={roles.map((r) => ({ value: r, label: r }))}
                  placeholder="Select role"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Valid From</label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm((p) => ({ ...p, valid_from: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Valid To</label>
                  <Input type="date" value={form.valid_to} onChange={(e) => setForm((p) => ({ ...p, valid_to: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Leave coverage, vacation, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
