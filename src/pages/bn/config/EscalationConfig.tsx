import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { toast } from 'sonner';
import type { BnEscalationPolicy } from '@/types/bn';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { SmartSelect, CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { BN_ESCALATION_TRIGGERS, BN_ESCALATION_SEVERITIES } from '@/services/bn/registries';
import { useWorkflowRoles } from '@/hooks/bn/useWorkflowRoles';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';

const db = supabase as any;

export default function EscalationConfig() {
  const { userCode } = useUserCode();
  const { log } = useBnConfigAudit();
  const { roles: workflowRoles } = useWorkflowRoles();
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<BnEscalationPolicy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({
    policy_code: '',
    policy_name: '',
    trigger_type: 'SLA_BREACH',
    hours_overdue: '48',
    escalation_target_role: '',
    auto_reassign: false,
    severity: 'MEDIUM',
    is_active: true,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['bn', 'escalation-policies'],
    queryFn: async () => {
      const { data, error } = await db.from('bn_escalation_policy').select('*').order('policy_name');
      if (error) throw error;
      return data as BnEscalationPolicy[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isNew) {
        const { data, error } = await db.from('bn_escalation_policy').insert({ ...payload, entered_by: userCode }).select().single();
        if (error) throw error;
        log({ entityType: 'bn_escalation_policy', entityId: data?.id ?? payload.policy_code, action: 'CREATE', after: payload });
      } else {
        const { error } = await db.from('bn_escalation_policy').update({ ...payload, modified_by: userCode, modified_at: new Date().toISOString() }).eq('id', editItem!.id);
        if (error) throw error;
        log({ entityType: 'bn_escalation_policy', entityId: editItem!.id, action: 'UPDATE', before: editItem as any, after: payload });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'escalation-policies'] });
      toast.success(isNew ? 'Policy created' : 'Policy updated');
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openNew = () => {
    setIsNew(true);
    setForm({ policy_code: '', policy_name: '', trigger_type: 'SLA_BREACH', hours_overdue: '48', escalation_target_role: '', auto_reassign: false, severity: 'MEDIUM', is_active: true });
    setEditItem({} as any);
  };

  const openEdit = (item: BnEscalationPolicy) => {
    setIsNew(false);
    setForm({
      policy_code: item.policy_code,
      policy_name: item.policy_name,
      trigger_type: item.trigger_type,
      hours_overdue: (item.trigger_config as any)?.hours_overdue?.toString() || '48',
      escalation_target_role: item.escalation_target_role,
      auto_reassign: item.auto_reassign,
      severity: item.severity,
      is_active: item.is_active,
    });
    setEditItem(item);
  };

  const handleSave = () => {
    if (!form.policy_code.trim() || !form.policy_name.trim()) { toast.error('Code and Name are required'); return; }
    if (!form.escalation_target_role) { toast.error('Target Role is required'); return; }
    const hours = parseInt(form.hours_overdue);
    if (!hours || hours < 1) { toast.error('Hours Overdue must be a positive number'); return; }
    if (isNew && policies.some(x => x.policy_code.toUpperCase() === form.policy_code.toUpperCase())) {
      toast.error('Policy code already exists'); return;
    }
    saveMutation.mutate({
      policy_code: form.policy_code,
      policy_name: form.policy_name,
      trigger_type: form.trigger_type,
      trigger_config: { hours_overdue: hours },
      escalation_target_role: form.escalation_target_role,
      auto_reassign: form.auto_reassign,
      severity: form.severity,
      is_active: form.is_active,
    });
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Escalation Policies</h1>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Policy</Button>
        </div>

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable SLA / escalation rules. Workflow steps and workbaskets reference these policies; they are not product-specific."
        />



        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Auto-Reassign</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.policy_code}</TableCell>
                    <TableCell>{p.policy_name}</TableCell>
                    <TableCell><Badge variant="outline">{p.trigger_type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{p.escalation_target_role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={p.severity === 'CRITICAL' ? 'destructive' : p.severity === 'HIGH' ? 'destructive' : 'outline'}>
                        {p.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.auto_reassign ? 'Yes' : 'No'}</TableCell>
                    <TableCell><Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {policies.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No escalation policies configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isNew ? 'Add Escalation Policy' : 'Edit Escalation Policy'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {isNew ? (
                  <CodeFieldWithAutoGenerate
                    label="Code"
                    value={form.policy_code}
                    onChange={(v) => setForm(p => ({ ...p, policy_code: v }))}
                    existingCodes={policies.map(x => x.policy_code)}
                    prefix="ESC"
                    required
                  />
                ) : (
                  <div className="space-y-1"><label className="text-sm font-medium">Code</label><Input value={form.policy_code} disabled /></div>
                )}
                <div className="space-y-1"><label className="text-sm font-medium">Name</label><Input value={form.policy_name} onChange={e => setForm(p => ({ ...p, policy_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SmartSelect
                  label="Trigger Type"
                  value={form.trigger_type}
                  onValueChange={(v) => setForm(p => ({ ...p, trigger_type: v }))}
                  options={BN_ESCALATION_TRIGGERS.map(t => ({ value: t.value, label: t.label }))}
                />
                <div className="space-y-1"><label className="text-sm font-medium">Hours Overdue</label><Input type="number" min={1} value={form.hours_overdue} onChange={e => setForm(p => ({ ...p, hours_overdue: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SmartSelect
                  label="Target Role"
                  value={form.escalation_target_role}
                  onValueChange={(v) => setForm(p => ({ ...p, escalation_target_role: v }))}
                  options={workflowRoles.map(r => ({ value: r, label: r.replace(/_/g, ' ') }))}
                  required
                />
                <SmartSelect
                  label="Severity"
                  value={form.severity}
                  onValueChange={(v) => setForm(p => ({ ...p, severity: v }))}
                  options={BN_ESCALATION_SEVERITIES.map(s => ({ value: s.value, label: s.label }))}
                />
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.auto_reassign} onCheckedChange={v => setForm(p => ({ ...p, auto_reassign: v }))} /><label className="text-sm">Auto-Reassign on Escalation</label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><label className="text-sm">Active</label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
