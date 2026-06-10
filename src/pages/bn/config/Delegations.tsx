import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { SmartSelect } from '@/components/bn/smart';
import { useWorkflowRoles } from '@/hooks/bn/useWorkflowRoles';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { Check, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  listDelegations,
  createDelegation,
  approveDelegation,
  revokeDelegation,
  type BnRoleDelegation,
} from '@/services/bn/delegationService';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

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
    try { setRows(await listDelegations()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
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
    } catch (e: any) { toast.error(e.message); }
  };

  const approve = async (id: string) => {
    if (!user?.id) return;
    try { await approveDelegation(id, user.id); toast.success('Approved'); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const revoke = async (id: string) => {
    try { await revokeDelegation(id); toast.success('Revoked'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Role Delegations</h1>
        <BnScreenRoleBanner
          role="library"
          description="Temporarily delegate a workbasket role to another user. Each delegation needs supervisor approval and is bounded by date range."
        />

        <BNDataGrid
          id="bn.delegations"
          data={rows}
          isLoading={loading}
          searchPlaceholder="Search delegations..."
          onCreate={() => setDialogOpen(true)}
          onRefresh={load}
          exportFilename="bn_delegations"
          emptyMessage="No delegations recorded"
          columns={[
            { accessorKey: 'from_user_id', header: 'From', meta: { label: 'From', width: 130 }, cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '').slice(0, 8)}…</span> },
            { accessorKey: 'to_user_id', header: 'To', meta: { label: 'To', width: 130 }, cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '').slice(0, 8)}…</span> },
            { accessorKey: 'role_name', header: 'Role', meta: { label: 'Role', width: 160 }, cell: ({ getValue }) => <Badge variant="secondary">{String(getValue() ?? '')}</Badge> },
            { id: 'valid', header: 'Valid', meta: { label: 'Valid', width: 200 }, accessorFn: (r: any) => `${r.valid_from} → ${r.valid_to}`, cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '')}</span> },
            { accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 120 }, cell: ({ getValue }) => {
              const s = String(getValue() ?? '');
              return <Badge variant={s === 'APPROVED' ? 'default' : s === 'PENDING' ? 'secondary' : 'outline'}>{s}</Badge>;
            } },
            { accessorKey: 'reason', header: 'Reason', meta: { label: 'Reason', width: 220 }, cell: ({ getValue }) => <span className="text-xs truncate block max-w-[200px]" title={String(getValue() ?? '')}>{String(getValue() ?? '')}</span> },
          ] as BNColumnDef<BnRoleDelegation>[]}
          rowActions={[
            { key: 'approve', label: 'Approve', icon: <Check className="h-3.5 w-3.5" />, hidden: (r) => r.status !== 'PENDING', onClick: (r) => approve(r.id) },
            { key: 'revoke', label: 'Revoke', icon: <XCircle className="h-3.5 w-3.5" />, variant: 'destructive', hidden: (r) => r.status !== 'APPROVED', onClick: (r) => revoke(r.id) },
          ]}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Role Delegation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Delegate To (User ID)</label>
                <Input placeholder="auth user UUID" value={form.to_user_id} onChange={(e) => setForm((p) => ({ ...p, to_user_id: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <SmartSelect value={form.role_name} onValueChange={(v) => setForm((p) => ({ ...p, role_name: v }))} options={roles.map((r) => ({ value: r, label: r }))} placeholder="Select role" />
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
                <Textarea rows={3} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Leave coverage, vacation, etc." />
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
