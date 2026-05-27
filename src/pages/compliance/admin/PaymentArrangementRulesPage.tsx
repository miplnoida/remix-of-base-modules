import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions } from '@/hooks/useActionPermission';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell } from '@/components/common/PageShell';
import { toast } from 'sonner';
import { Info, Pencil, Loader2, HandshakeIcon } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

const MODULE_NAME = 'ce_admin_arr_rules';

interface PolicyRow {
  id: string;
  policy_code: string;
  policy_name: string;
  is_active: boolean;
  max_arrangement_months: number;
  min_down_payment_percent: number;
  max_missed_installments: number;
  breach_grace_days: number;
  auto_terminate_on_breach: boolean;
  interest_on_arrangement: boolean;
  arrangement_interest_rate: number;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

function PaymentArrangementRulesInner() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { can, isAdmin } = useActionPermissions(MODULE_NAME);
  const editable = isAdmin || can('edit') || can('update') || can('manage');

  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const [form, setForm] = useState<PolicyRow | null>(null);

  const { data: policies = [], isLoading, error } = useQuery({
    queryKey: ['ce_arrangement_policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_arrangement_policies' as any)
        .select('*')
        .order('policy_code');
      if (error) throw error;
      return (data || []) as unknown as PolicyRow[];
    },
  });

  useEffect(() => {
    if (editing) setForm({ ...editing });
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: async (row: PolicyRow) => {
      const { error } = await supabase
        .from('ce_arrangement_policies' as any)
        .update({
          policy_name: row.policy_name,
          is_active: row.is_active,
          max_arrangement_months: row.max_arrangement_months,
          min_down_payment_percent: row.min_down_payment_percent,
          max_missed_installments: row.max_missed_installments,
          breach_grace_days: row.breach_grace_days,
          auto_terminate_on_breach: row.auto_terminate_on_breach,
          interest_on_arrangement: row.interest_on_arrangement,
          arrangement_interest_rate: row.arrangement_interest_rate,
          notes: row.notes,
          updated_by: userCode || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce_arrangement_policies'] });
      toast.success('Payment arrangement rule saved');
      setEditing(null);
    },
    onError: (e: any) => toast.error('Failed to save: ' + (e?.message || 'Unknown error')),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ce_arrangement_policies' as any)
        .update({ is_active, updated_by: userCode || null, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce_arrangement_policies'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error('Failed to update: ' + (e?.message || 'Unknown error')),
  });

  const setField = <K extends keyof PolicyRow>(key: K, value: PolicyRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <PageShell
      title="Payment Arrangement Rules"
      subtitle="Configure payment arrangement policies, down payment, installment limits, breach handling and interest treatment"
      breadcrumbs={[
        { label: 'Compliance & Enforcement' },
        { label: 'Setup' },
        { label: 'Payment Arrangement Rules' },
      ]}
      isLoading={isLoading}
      error={error ? (error as Error).message : null}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <CardTitle className="text-base">About Payment Arrangement Rules</CardTitle>
              <CardDescription className="mt-1">
                Each rule defines the policy used when employers request to pay arrears in installments.
                Disabling a rule prevents it from being offered when creating new arrangements.
                Changes apply immediately and are audited.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {policies.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No payment arrangement rules have been configured yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {policies.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <HandshakeIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{p.policy_name}</CardTitle>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs mt-1">{p.policy_code}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.is_active}
                    disabled={!editable || toggleActive.isPending}
                    onCheckedChange={(v) => toggleActive.mutate({ id: p.id, is_active: v })}
                  />
                  <Button variant="outline" size="sm" disabled={!editable} onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Min Down Payment" value={`${p.min_down_payment_percent}%`} />
                <Stat label="Max Installment Months" value={p.max_arrangement_months} />
                <Stat label="Missed Installments Allowed" value={p.max_missed_installments} />
                <Stat label="Breach Grace Days" value={p.breach_grace_days} />
                <Stat label="Auto-Terminate on Breach" value={p.auto_terminate_on_breach ? 'Yes' : 'No'} />
                <Stat label="Interest on Arrangement" value={p.interest_on_arrangement ? 'Yes' : 'No'} />
                <Stat label="Interest Rate" value={`${p.arrangement_interest_rate}%`} />
                <Stat label="Last Updated" value={p.updated_at ? formatDateForDisplay(p.updated_at) : '—'} />
              </div>
              {p.notes && (
                <p className="text-xs text-muted-foreground mt-3 border-l-2 border-muted pl-3">{p.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Payment Arrangement Rule</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Policy Code">
                <Input value={form.policy_code} disabled />
              </Field>
              <Field label="Policy Name">
                <Input value={form.policy_name} onChange={(e) => setField('policy_name', e.target.value)} />
              </Field>
              <Field label="Min Down Payment (%)">
                <Input type="number" step="0.01" value={form.min_down_payment_percent}
                  onChange={(e) => setField('min_down_payment_percent', Number(e.target.value))} />
              </Field>
              <Field label="Max Installment Months">
                <Input type="number" value={form.max_arrangement_months}
                  onChange={(e) => setField('max_arrangement_months', Number(e.target.value))} />
              </Field>
              <Field label="Max Missed Installments">
                <Input type="number" value={form.max_missed_installments}
                  onChange={(e) => setField('max_missed_installments', Number(e.target.value))} />
              </Field>
              <Field label="Breach Grace Days">
                <Input type="number" value={form.breach_grace_days}
                  onChange={(e) => setField('breach_grace_days', Number(e.target.value))} />
              </Field>
              <Field label="Arrangement Interest Rate (%)">
                <Input type="number" step="0.01" value={form.arrangement_interest_rate}
                  onChange={(e) => setField('arrangement_interest_rate', Number(e.target.value))} />
              </Field>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Interest on Arrangement</Label>
                <Switch checked={form.interest_on_arrangement}
                  onCheckedChange={(v) => setField('interest_on_arrangement', v)} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Auto-Terminate on Breach</Label>
                <Switch checked={form.auto_terminate_on_breach}
                  onCheckedChange={(v) => setField('auto_terminate_on_breach', v)} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label className="text-sm">Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
              </div>
              <div className="md:col-span-2">
                <Field label="Notes">
                  <Textarea rows={3} value={form.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)} />
                </Field>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button onClick={() => form && saveMutation.mutate(form)} disabled={!editable || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

export default function PaymentArrangementRulesPage() {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <PaymentArrangementRulesInner />
    </PermissionWrapper>
  );
}
