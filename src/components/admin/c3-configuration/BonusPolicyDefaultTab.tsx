import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Info, Save, Check, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { useBonusPolicyDefaults, useCreateBonusPolicyDefault, useUpdateBonusPolicyDefault, useDeleteBonusPolicyDefault, checkDateOverlap } from '@/hooks/useBonusPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import MonthYearPicker from '@/components/c3/MonthYearPicker';
import { formatDisplayDate, parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';
import type { BonusPolicyDefault, BonusDistribution, CalculationMethod } from '@/types/bonusPolicy';
import { DEFAULT_DISTRIBUTION } from '@/types/bonusPolicy';

const EMPTY_POLICY: Omit<BonusPolicyDefault, 'id' | 'created_on' | 'modified_on'> = {
  date_from: formatDateForStorage(new Date()),
  date_to: null,
  include_in_levy: true,
  include_in_severance: false,
  calculation_method: 'merge',
  calc_flat_enabled: false,
  calc_flat_percentage: null,
  calc_slab_enabled: false,
  distribution: DEFAULT_DISTRIBUTION,
  min_bonus_amount: null,
  max_bonus_amount: null,
  contrib_employee: true,
  contrib_employer: true,
  contrib_eir: false,
  contrib_severance: false,
  is_active: true,
  created_by: null,
  modified_by: null,
};

export function BonusPolicyDefaultTab() {
  const { data: policies, isLoading } = useBonusPolicyDefaults();
  const createMutation = useCreateBonusPolicyDefault();
  const updateMutation = useUpdateBonusPolicyDefault();
  const deleteMutation = useDeleteBonusPolicyDefault();
  const { userCode } = useUserCode();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_POLICY>({ ...EMPTY_POLICY });
  const [cappingEnabled, setCappingEnabled] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_POLICY });
    setCappingEnabled(false);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const openEdit = (p: BonusPolicyDefault) => {
    setEditingId(p.id);
    const { id, created_on, modified_on, ...rest } = p;
    setForm(rest as typeof EMPTY_POLICY);
    setCappingEnabled(p.min_bonus_amount != null || p.max_bonus_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const dist: BonusDistribution = (form.distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION;

  const setField = <K extends keyof typeof EMPTY_POLICY>(key: K, value: (typeof EMPTY_POLICY)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'date_from' || key === 'date_to') setOverlapWarning(null);
  };

  // Radio-style: select exactly one option per cycle
  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    setField('distribution', newDist);
  };

  const handleSave = () => {
    if (!form.date_from) {
      setOverlapWarning('Date From is required.');
      return;
    }
    if (form.date_to && form.date_to < form.date_from) {
      setOverlapWarning('Date To cannot be earlier than Date From.');
      return;
    }
    const existing = (policies ?? []).map(p => ({ id: p.id, date_from: p.date_from, date_to: p.date_to }));
    const overlap = checkDateOverlap(form.date_from, form.date_to, existing, editingId || undefined);
    if (overlap.overlaps) {
      const rec = overlap.overlappingRecord!;
      const from = formatDisplayDate(rec.date_from);
      const to = rec.date_to ? formatDisplayDate(rec.date_to) : 'Open-ended';
      setOverlapWarning(`The selected period overlaps with an existing policy (${from} – ${to}). Please adjust Date From / Date To.`);
      return;
    }

    const updates = { ...form };
    if (!cappingEnabled) {
      updates.min_bonus_amount = null;
      updates.max_bonus_amount = null;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate({ policy: updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const formInvalid = !form.include_in_levy;

  return (
    <div className="space-y-6">
      {/* Policy List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bonus Policies</CardTitle>
              <CardDescription>Each policy has a validity period. The applicable policy is determined by the current date.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Policy</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!policies?.length ? (
            <div className="text-center py-8 text-muted-foreground">No bonus policies configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From (Month-Year)</TableHead>
                  <TableHead>To (Month-Year)</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Levy</TableHead>
                  <TableHead>Severance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{(() => { const d = parseDateSafe(p.date_from); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_from; })()}</TableCell>
                    <TableCell>{p.date_to ? (() => { const d = parseDateSafe(p.date_to); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_to; })() : <span className="text-muted-foreground italic">Open-ended</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{p.calculation_method}</Badge>
                    </TableCell>
                    <TableCell>{p.include_in_levy ? <Check className="h-4 w-4 text-emerald-600" /> : '—'}</TableCell>
                    <TableCell>{p.include_in_severance ? <Check className="h-4 w-4 text-emerald-600" /> : '—'}</TableCell>
                    <TableCell>
                      {p.is_active
                        ? <span className="text-emerald-600 font-semibold text-sm">● Active</span>
                        : <span className="text-muted-foreground text-sm">○ Inactive</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
                <CardTitle>{editingId ? 'Edit' : 'Add'} Bonus Policy</CardTitle>
                <CardDescription>Define the bonus policy configuration and its validity period.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                Each policy must have a validity period. If Date To is left empty, the policy is open-ended. Overlapping periods are not allowed.
              </span>
            </div>

            {overlapWarning && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-sm text-destructive">{overlapWarning}</span>
              </div>
            )}

            {/* Validity Period */}
            <SectionLabel>Validity Period (Month-Year)</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From <span className="text-destructive">*</span></Label>
                <MonthYearPicker
                  value={form.date_from ? (() => { const d = parseDateSafe(form.date_from); return d ? { year: d.getFullYear(), month: d.getMonth() } : undefined; })() : undefined}
                  onChange={({ year, month }) => setField('date_from', `${year}-${String(month + 1).padStart(2, '0')}-01`)}
                  placeholder="Select start month"
                />
              </div>
              <div className="space-y-1.5">
                <Label>To <span className="text-xs text-muted-foreground">(optional, leave empty for open-ended)</span></Label>
                <MonthYearPicker
                  value={form.date_to ? (() => { const d = parseDateSafe(form.date_to); return d ? { year: d.getFullYear(), month: d.getMonth() } : undefined; })() : undefined}
                  onChange={({ year, month }) => setField('date_to', `${year}-${String(month + 1).padStart(2, '0')}-01`)}
                  placeholder="Open-ended"
                />
              </div>
            </div>

            {/* 1. Applicability */}
            <SectionLabel>Bonus Applicability in C3</SectionLabel>
            <div className="space-y-3">
              <ToggleRow label="Include Bonus in Levy" hint="Bonus amount is always included in levy base calculation" checked={true} onChange={() => {}} disabled />
            </div>

            {/* 2. Calculation Method */}
            <SectionLabel>Bonus Calculation Method</SectionLabel>
            <div className="space-y-3">
              <RadioOption selected={form.calculation_method === 'merge'} onClick={() => setField('calculation_method', 'merge')} label="Merge bonus with regular earnings" hint="Bonus is combined into the standard pay run" />
              <RadioOption selected={form.calculation_method === 'separate'} onClick={() => setField('calculation_method', 'separate')} label="Calculate bonus separately" hint="Bonus is processed in an isolated calculation" />
              {form.calculation_method === 'separate' && (
                <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Select Calculation Method</p>
                  <RadioOption selected={!!form.calc_flat_enabled} onClick={() => { setField('calc_flat_enabled', true); setField('calc_slab_enabled', false); }} label="Flat Percentage" hint="A fixed percentage applied on the bonus base amount" />
                  {form.calc_flat_enabled && (
                    <div className="flex items-center gap-2 ml-7" onClick={e => e.stopPropagation()}>
                      <Input type="number" className="w-24" placeholder="e.g. 15" value={form.calc_flat_percentage ?? ''} onChange={e => setField('calc_flat_percentage', e.target.value ? Number(e.target.value) : null)} min={0} max={100} />
                      <span className="text-sm font-semibold text-muted-foreground">%</span>
                    </div>
                  )}
                  <RadioOption selected={!!form.calc_slab_enabled} onClick={() => { setField('calc_slab_enabled', true); setField('calc_flat_enabled', false); setField('calc_flat_percentage', null); }} label="Levy Slab Based" hint="Bonus calculated using predefined levy slabs" />
                  {!form.calc_flat_enabled && !form.calc_slab_enabled && (
                    <div className="text-sm text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">⚠ A calculation method must be selected.</div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Distribution (only for merge) — single-select radio */}
            {form.calculation_method === 'merge' && (
              <>
                <SectionLabel>Bonus Distribution by Payroll Cycle</SectionLabel>
                <p className="text-xs text-muted-foreground -mt-4">Select which payroll week/payment the bonus should be included in for each frequency (single selection).</p>
                <div className="space-y-4">
                  <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist} items={[{ key: 'w1', label: 'Include in 1st week' }, { key: 'w2', label: 'Include in 2nd week' }, { key: 'w3', label: 'Include in 3rd week' }, { key: 'w4', label: 'Include in 4th / last week' }, { key: 'divide', label: 'Divide equally across all weeks', isDivide: true }]} />
                  <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist} items={[{ key: 'b1', label: 'Include in 1st payment' }, { key: 'b2', label: 'Include in last payment' }, { key: 'divide', label: 'Divide equally across both payments', isDivide: true }]} />
                  <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist} items={[{ key: 's1', label: 'Include in 1st payment' }, { key: 's2', label: 'Include in last payment' }, { key: 'divide', label: 'Divide equally across both payments', isDivide: true }]} />
                  <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist} items={[{ key: 'm1', label: 'Include in monthly payment' }]} />
                </div>
              </>
            )}

            {/* 4. Capping */}
            <div className="flex items-center gap-3">
              <Checkbox id="capping-enabled" checked={cappingEnabled} onCheckedChange={(v) => { const val = !!v; setCappingEnabled(val); if (!val) { setField('min_bonus_amount', null); setField('max_bonus_amount', null); } }} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
              <SectionLabel>Capping on Eligible Bonus Amount</SectionLabel>
            </div>
            {cappingEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Minimum Bonus Amount</Label><Input type="number" placeholder="e.g. 500" value={form.min_bonus_amount ?? ''} onChange={e => setField('min_bonus_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                <div className="space-y-1.5"><Label>Maximum Bonus Amount</Label><Input type="number" placeholder="e.g. 50000" value={form.max_bonus_amount ?? ''} onChange={e => setField('max_bonus_amount', e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
            )}

            {/* 5. Contribution Base */}
            <SectionLabel>Contribution Base Calculation</SectionLabel>
            <p className="text-xs text-muted-foreground -mt-4">Selected contributions will include bonus amount in their base calculation.</p>
            <div className="border rounded-lg divide-y">
              <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={v => setField('contrib_employee', v)} />
              <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={v => setField('contrib_employer', v)} />
              <ContribRow label="EIB (Employee Injury Benefit)" checked={!!form.contrib_eir} onChange={v => setField('contrib_eir', v)} />
              <ContribRow label="Severance Payment" checked={!!form.contrib_severance} onChange={v => setField('contrib_severance', v)} />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || formInvalid}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? 'Update' : 'Save'} Policy
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
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this bonus policy.</AlertDialogDescription>
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
    <div className="flex items-center gap-2 text-xs font-medium text-foreground uppercase tracking-widest">
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-b-0 ${disabled ? 'opacity-70' : ''}`}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
        <span className="text-xs text-muted-foreground w-6">{checked ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
}

function RadioOption({ selected, onClick, label, hint }: { selected: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={onClick}>
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'}`}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
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

interface CycleItem { key: string; label: string; isDivide?: boolean }

function CycleBlock({ title, cycle, dist, setDist, items }: { title: string; cycle: keyof BonusDistribution; dist: BonusDistribution; setDist: (cycle: keyof BonusDistribution, key: string) => void; items: CycleItem[] }) {
  const cycleObj = dist[cycle] as Record<string, boolean>;
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="p-3 space-y-2">
        {items.map(item => {
          const isChecked = !!cycleObj[item.key];
          return (
            <div key={item.key} className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${isChecked ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-muted/20 hover:bg-muted/40'}`} onClick={() => setDist(cycle, item.key)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-muted-foreground/40'}`}>
                {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`text-sm ${item.isDivide ? 'italic text-muted-foreground' : ''}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
