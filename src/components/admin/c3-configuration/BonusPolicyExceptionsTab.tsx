import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Info, Save, X, Check, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBonusPolicyExceptions, useCreateBonusPolicyException, useUpdateBonusPolicyException, useDeleteBonusPolicyException, checkDateOverlap } from '@/hooks/useBonusPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import type { BonusPolicyException, BonusDistribution, ExceptionType, CalculationMethod } from '@/types/bonusPolicy';
import { MONTH_NAMES, DEFAULT_DISTRIBUTION } from '@/types/bonusPolicy';

type ExceptionForm = Omit<BonusPolicyException, 'id' | 'created_on' | 'modified_on'>;

const EMPTY_EXCEPTION: ExceptionForm = {
  date_from: '',
  date_to: null,
  exception_type: 'onetime',
  exception_month: new Date().getMonth() + 1,
  year_from: new Date().getFullYear(),
  year_to: null,
  override_default: false,
  include_in_levy: true,
  include_in_severance: null,
  calculation_method: null,
  calc_flat_enabled: null,
  calc_flat_percentage: null,
  calc_slab_enabled: null,
  distribution: null,
  min_bonus_amount: null,
  max_bonus_amount: null,
  contrib_employee: null,
  contrib_employer: null,
  contrib_eir: null,
  contrib_severance: null,
  is_active: true,
  description: null,
  created_by: null,
  modified_by: null,
};

function computeDatesFromIdentity(form: ExceptionForm): { date_from: string; date_to: string | null } {
  const month = String(form.exception_month).padStart(2, '0');
  if (form.exception_type === 'onetime') {
    const dateStr = `${form.year_from}-${month}-01`;
    return { date_from: dateStr, date_to: dateStr };
  }
  const date_from = `${form.year_from}-${month}-01`;
  const date_to = form.year_to ? `${form.year_to}-${month}-01` : null;
  return { date_from, date_to };
}

export function BonusPolicyExceptionsTab() {
  const { data: exceptions, isLoading } = useBonusPolicyExceptions();
  const createMutation = useCreateBonusPolicyException();
  const updateMutation = useUpdateBonusPolicyException();
  const deleteMutation = useDeleteBonusPolicyException();
  const { userCode } = useUserCode();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExceptionForm>({ ...EMPTY_EXCEPTION });
  const [cappingEnabled, setCappingEnabled] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_EXCEPTION });
    setCappingEnabled(false);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const openEdit = (exc: BonusPolicyException) => {
    setEditingId(exc.id);
    const { id, created_on, modified_on, ...rest } = exc;
    setForm(rest as ExceptionForm);
    setCappingEnabled(exc.min_bonus_amount != null || exc.max_bonus_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const setField = <K extends keyof ExceptionForm>(key: K, value: ExceptionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setOverlapWarning(null);
  };

  const dist: BonusDistribution = (form.distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION;

  // Radio-style: select exactly one option per cycle
  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    setField('distribution', newDist);
  };

  const handleSave = () => {
    if (!form.exception_month || !form.year_from) {
      setOverlapWarning('Exception Month and Year are required.');
      return;
    }
    if (form.exception_type === 'recurring' && form.year_to && form.year_to < form.year_from) {
      setOverlapWarning('Year To cannot be earlier than Year From.');
      return;
    }

    const { date_from, date_to } = computeDatesFromIdentity(form);
    const existing = (exceptions ?? []).map(e => ({ id: e.id, date_from: e.date_from, date_to: e.date_to }));
    const overlap = checkDateOverlap(date_from, date_to, existing, editingId || undefined);
    if (overlap.overlaps) {
      setOverlapWarning('The selected month/year range overlaps with an existing exception. Please adjust.');
      return;
    }

    const updates = { ...form, date_from, date_to };
    updates.include_in_severance = null;

    if (!cappingEnabled) {
      updates.min_bonus_amount = null;
      updates.max_bonus_amount = null;
    }
    if (!updates.override_default) {
      updates.calculation_method = null;
      updates.calc_flat_enabled = null;
      updates.calc_flat_percentage = null;
      updates.calc_slab_enabled = null;
      updates.distribution = null;
      updates.min_bonus_amount = null;
      updates.max_bonus_amount = null;
      updates.contrib_employee = null;
      updates.contrib_employer = null;
      updates.contrib_eir = null;
      updates.contrib_severance = null;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate({ exception: updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Exception List */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Bonus Policy Exceptions
              </CardTitle>
              <CardDescription>Define month-specific overrides for bonus policy calculations. Each exception can optionally override the default policy settings.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} variant="outline" className="border-amber-300">
              <Plus className="h-4 w-4 mr-1" />Add Exception
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!exceptions?.length ? (
            <div className="text-center py-8 text-muted-foreground">No bonus policy exceptions configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year(s)</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(exceptions || []).map((exc) => (
                  <TableRow key={exc.id}>
                    <TableCell>
                      <Badge variant={exc.exception_type === 'recurring' ? 'default' : 'outline'}>
                        {exc.exception_type === 'recurring' ? 'Recurring' : 'One-Time'}
                      </Badge>
                    </TableCell>
                    <TableCell>{MONTH_NAMES[exc.exception_month - 1]}</TableCell>
                    <TableCell>{exc.year_from}{exc.year_to ? ` – ${exc.year_to}` : ''}</TableCell>
                    <TableCell>
                      {exc.override_default ? <Check className="h-4 w-4 text-amber-600" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{exc.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-amber-700 dark:text-amber-400">{editingId ? 'Edit' : 'Add'} Bonus Policy Exception</CardTitle>
                <CardDescription>Define the exception details and optionally override the default policy configuration.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                Each exception targets a specific month. For one-time exceptions, select a month and year. For recurring exceptions, select a month and a year range. If "Override Default Policy" is enabled, you can customise calculation method, distribution, capping, and contribution base for that period.
              </span>
            </div>

            {overlapWarning && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-sm text-destructive">{overlapWarning}</span>
              </div>
            )}

            {/* Exception Identity */}
            <SectionLabel>Exception Identity</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Exception Type</Label>
                <Select value={form.exception_type} onValueChange={(v) => {
                  setField('exception_type', v as ExceptionType);
                  if (v === 'onetime') setField('year_to', null);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onetime">One-Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Exception Month</Label>
                <Select value={String(form.exception_month)} onValueChange={(v) => setField('exception_month', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.exception_type === 'onetime' ? (
                <div className="space-y-1.5">
                  <Label>Exception Year <span className="text-destructive">*</span></Label>
                  <Input type="number" value={form.year_from} onChange={(e) => setField('year_from', parseInt(e.target.value))} />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Year From <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.year_from} onChange={(e) => setField('year_from', parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year To <span className="text-xs text-muted-foreground">(optional, open-ended if empty)</span></Label>
                    <Input type="number" value={form.year_to ?? ''} onChange={(e) => setField('year_to', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description ?? ''} onChange={(e) => setField('description', e.target.value || null)} placeholder="Optional description" />
            </div>

            {/* Applicability toggles — Levy only */}
            <SectionLabel>Applicability</SectionLabel>
            <div className="space-y-3">
              <ToggleRow label="Include Bonus in Levy" hint="Bonus amount is always included in levy base calculation" checked={true} onChange={() => {}} disabled />
            </div>

            {/* Override toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
              <Checkbox
                id="override-default"
                checked={form.override_default}
                onCheckedChange={(v) => {
                  const val = !!v;
                  setField('override_default', val);
                  if (val && !form.calculation_method) {
                    setField('calculation_method', 'merge');
                    setField('distribution', DEFAULT_DISTRIBUTION);
                    setField('contrib_employee', true);
                    setField('contrib_employer', true);
                    setField('contrib_eir', false);
                    setField('contrib_severance', false);
                    setField('calc_flat_enabled', false);
                    setField('calc_slab_enabled', false);
                  }
                }}
                className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <div>
                <Label htmlFor="override-default" className="text-sm font-medium cursor-pointer">Override Default Policy</Label>
                <p className="text-xs text-muted-foreground">When enabled, this exception will use its own calculation, distribution, capping, and contribution settings instead of the default policy.</p>
              </div>
            </div>

            {/* Override sections */}
            {form.override_default && (
              <div className="space-y-6 border-l-4 border-amber-300 dark:border-amber-700 pl-4">
                {/* Calculation Method */}
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

                {/* Distribution (only for merge) — single-select radio */}
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

                {/* Capping */}
                <div className="flex items-center gap-3">
                  <Checkbox id="exc-capping-enabled" checked={cappingEnabled} onCheckedChange={(v) => { const val = !!v; setCappingEnabled(val); if (!val) { setField('min_bonus_amount', null); setField('max_bonus_amount', null); } }} className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600" />
                  <SectionLabel>Capping on Eligible Bonus Amount</SectionLabel>
                </div>
                {cappingEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Minimum Bonus Amount</Label><Input type="number" placeholder="e.g. 500" value={form.min_bonus_amount ?? ''} onChange={e => setField('min_bonus_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                    <div className="space-y-1.5"><Label>Maximum Bonus Amount</Label><Input type="number" placeholder="e.g. 50000" value={form.max_bonus_amount ?? ''} onChange={e => setField('max_bonus_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                )}

                {/* Contribution Base */}
                <SectionLabel>Contribution Base Calculation</SectionLabel>
                <p className="text-xs text-muted-foreground -mt-4">Selected contributions will include bonus amount in their base calculation.</p>
                <div className="border rounded-lg divide-y">
                  <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={v => setField('contrib_employee', v)} />
                  <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={v => setField('contrib_employer', v)} />
                  <ContribRow label="EIB (Employee Injury Benefit)" checked={!!form.contrib_eir} onChange={v => setField('contrib_eir', v)} />
                  <ContribRow label="Severance Payment" checked={!!form.contrib_severance} onChange={v => setField('contrib_severance', v)} />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
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
            <AlertDialogDescription>This will permanently delete this bonus policy exception. This action cannot be undone.</AlertDialogDescription>
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

// ---- Sub-components (amber-themed variants) ----

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
    <div className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30' : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={onClick}>
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-amber-600 bg-amber-600' : 'border-muted-foreground/40'}`}>
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
            <div key={item.key} className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${isChecked ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-border bg-muted/20 hover:bg-muted/40'}`} onClick={() => setDist(cycle, item.key)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-amber-600 border-amber-600' : 'border-muted-foreground/40'}`}>
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
