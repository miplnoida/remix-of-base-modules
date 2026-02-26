import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Info, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBonusPolicyExceptions, useCreateBonusPolicyException, useUpdateBonusPolicyException, useDeleteBonusPolicyException } from '@/hooks/useBonusPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import type { BonusPolicyException, BonusDistribution, ExceptionType, CalculationMethod } from '@/types/bonusPolicy';
import { MONTH_NAMES, DEFAULT_DISTRIBUTION } from '@/types/bonusPolicy';

const EMPTY_EXCEPTION: Omit<BonusPolicyException, 'id' | 'created_on' | 'modified_on'> = {
  exception_type: 'onetime',
  exception_month: 1,
  year_from: new Date().getFullYear(),
  year_to: null,
  override_default: false,
  include_in_levy: true,
  include_in_severance: false,
  calculation_method: 'merge',
  calc_flat_enabled: false,
  calc_flat_percentage: null,
  calc_slab_enabled: true,
  distribution: DEFAULT_DISTRIBUTION,
  min_bonus_amount: null,
  max_bonus_amount: null,
  contrib_employee: true,
  contrib_employer: true,
  contrib_eir: false,
  is_active: true,
  description: null,
  created_by: null,
  modified_by: null,
};

export function BonusPolicyExceptionsTab() {
  const { data: exceptions, isLoading } = useBonusPolicyExceptions();
  const createMutation = useCreateBonusPolicyException();
  const updateMutation = useUpdateBonusPolicyException();
  const deleteMutation = useDeleteBonusPolicyException();
  const { userCode } = useUserCode();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_EXCEPTION>({ ...EMPTY_EXCEPTION });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_EXCEPTION });
    setShowForm(true);
  };

  const openEdit = (exc: BonusPolicyException) => {
    setEditingId(exc.id);
    const { id, created_on, modified_on, ...rest } = exc;
    setForm(rest as typeof EMPTY_EXCEPTION);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, updates: form, userCode: userCode || undefined });
    } else {
      await createMutation.mutateAsync({ exception: form, userCode: userCode || undefined });
    }
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const setField = <K extends keyof typeof EMPTY_EXCEPTION>(key: K, value: (typeof EMPTY_EXCEPTION)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const overrideSections = form.override_default;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Exception list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bonus Policy Exceptions</CardTitle>
              <CardDescription>Override the default bonus policy for specific months or recurring periods.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Exception</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!exceptions?.length ? (
            <div className="text-center py-8 text-muted-foreground">No exceptions configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year From</TableHead>
                  <TableHead>Year To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Overrides</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map(exc => (
                  <TableRow key={exc.id}>
                    <TableCell className="font-medium">{MONTH_NAMES[exc.exception_month - 1]}</TableCell>
                    <TableCell>{exc.year_from}</TableCell>
                    <TableCell>{exc.year_to ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={exc.exception_type === 'recurring'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      }>
                        {exc.exception_type === 'recurring' ? 'Recurring' : 'One-time'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exc.override_default ? 'Full Override' : 'Period Only'}
                    </TableCell>
                    <TableCell>
                      {exc.is_active
                        ? <span className="text-emerald-600 font-semibold text-sm">● Active</span>
                        : <span className="text-muted-foreground text-sm">○ Inactive</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(exc)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteId(exc.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingId ? 'Edit' : 'Add'} Bonus Exception</CardTitle>
                <CardDescription>Define a period-specific override for the default bonus policy.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exception Period */}
            <SectionLabel>Exception Period</SectionLabel>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Exception Type</Label>
                <div className="flex gap-3">
                  {(['onetime', 'recurring'] as ExceptionType[]).map(t => (
                    <div
                      key={t}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        form.exception_type === t ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setField('exception_type', t);
                        if (t === 'onetime') setField('year_to', null);
                      }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.exception_type === t ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}>
                        {form.exception_type === t && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium capitalize">{t === 'onetime' ? 'One-time' : 'Recurring'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={String(form.exception_month)} onValueChange={v => setField('exception_month', Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year From</Label>
                  <Input type="number" value={form.year_from} onChange={e => setField('year_from', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Year To <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    type="number"
                    value={form.year_to ?? ''}
                    onChange={e => setField('year_to', e.target.value ? Number(e.target.value) : null)}
                    disabled={form.exception_type === 'onetime'}
                    placeholder={form.exception_type === 'onetime' ? 'N/A' : 'e.g. 2027'}
                  />
                </div>
              </div>
            </div>

            {/* Override Toggle */}
            <SectionLabel>Override Rules</SectionLabel>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <div className="text-sm font-medium">Override Default Bonus Policy</div>
                <div className="text-xs text-muted-foreground">Enable to configure the complete policy for this exception period</div>
              </div>
              <Switch checked={!!form.override_default} onCheckedChange={v => setField('override_default', v)} />
            </div>

            {/* Full Override Sections */}
            {overrideSections && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Configure the complete bonus policy for this exception period. All settings below will override the default policy.
                  </span>
                </div>

                {/* Applicability Override */}
                <OverrideSectionLabel>Bonus Applicability in C3</OverrideSectionLabel>
                <div className="space-y-3">
                  <ToggleRow label="Include Bonus in Levy" hint="Bonus amount added to levy base calculation" checked={!!form.include_in_levy} onChange={v => setField('include_in_levy', v)} />
                  <ToggleRow label="Include Bonus in Severance" hint="Bonus amount added to severance base calculation" checked={!!form.include_in_severance} onChange={v => setField('include_in_severance', v)} />
                </div>

                {/* Calc Method Override */}
                <OverrideSectionLabel>Bonus Calculation Method</OverrideSectionLabel>
                <div className="space-y-3">
                  {(['merge', 'separate'] as CalculationMethod[]).map(m => (
                    <div
                      key={m}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        form.calculation_method === m ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'
                      }`}
                      onClick={() => setField('calculation_method', m)}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.calculation_method === m ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}>
                        {form.calculation_method === m && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m === 'merge' ? 'Merge bonus with regular earnings' : 'Calculate bonus separately'}</div>
                        <div className="text-xs text-muted-foreground">{m === 'merge' ? 'Bonus is combined into the standard pay run' : 'Bonus is processed in an isolated calculation'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Capping Override */}
                <OverrideSectionLabel>Bonus Eligibility Limits</OverrideSectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Minimum Bonus Amount</Label>
                    <Input type="number" placeholder="Override min…" value={form.min_bonus_amount ?? ''} onChange={e => setField('min_bonus_amount', e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximum Bonus Amount</Label>
                    <Input type="number" placeholder="Override max…" value={form.max_bonus_amount ?? ''} onChange={e => setField('max_bonus_amount', e.target.value ? Number(e.target.value) : null)} />
                  </div>
                </div>

                {/* Contribution Override */}
                <OverrideSectionLabel>Contribution Base Calculation</OverrideSectionLabel>
                <div className="border rounded-lg divide-y">
                  <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={v => setField('contrib_employee', v)} />
                  <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={v => setField('contrib_employer', v)} />
                  <ContribRow label="EIR (Employer Insurance Rate)" checked={!!form.contrib_eir} onChange={v => setField('contrib_eir', v)} />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={form.description ?? ''} onChange={e => setField('description', e.target.value || null)} placeholder="Brief note about this exception" />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? 'Update' : 'Save'} Exception
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exception</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this bonus policy exception.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Sub-components ----

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-widest">
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function OverrideSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-amber-600 uppercase tracking-widest">
      {children}
      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30 ml-1">OVERRIDE</Badge>
      <div className="flex-1 h-px bg-amber-200" />
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onChange} />
        <span className="text-xs text-muted-foreground w-6">{checked ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
}

function ContribRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
