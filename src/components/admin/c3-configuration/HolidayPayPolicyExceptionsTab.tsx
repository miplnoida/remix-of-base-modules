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
import { Loader2, Plus, Edit, Trash2, Info, Save, X, Check, AlertTriangle, Calendar, CalendarOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useHolidayPayPolicyExceptions, useCreateHolidayPayPolicyException, useUpdateHolidayPayPolicyException, useDeleteHolidayPayPolicyException, checkDateOverlap } from '@/hooks/useHolidayPayPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import type { HolidayPayPolicyException, BonusDistribution, ExceptionType, CalculationMethod, HolidayPolicyType } from '@/types/holidayPayPolicy';
import { MONTH_NAMES, DEFAULT_DISTRIBUTION } from '@/types/holidayPayPolicy';

type ExceptionForm = Omit<HolidayPayPolicyException, 'id' | 'created_on' | 'modified_on'>;

const EMPTY_EXCEPTION: ExceptionForm = {
  date_from: '',
  date_to: null,
  exception_type: 'onetime',
  exception_month: new Date().getMonth() + 1,
  year_from: new Date().getFullYear(),
  year_to: null,
  policy_type: 'without_dates',
  override_default: false,
  levy_include: true,
  levy_calculation_method: null,
  levy_calc_flat_enabled: null,
  levy_calc_flat_percentage: null,
  levy_calc_slab_enabled: null,
  levy_distribution: null,
  ssc_include: null,
  ssc_contrib_employee: null,
  ssc_contrib_employer: null,
  ssc_contrib_eib: null,
  distribution_enabled: null,
  include_in_severance: null,
  min_holiday_amount: null,
  max_holiday_amount: null,
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

export function HolidayPayPolicyExceptionsTab() {
  const { data: exceptions, isLoading } = useHolidayPayPolicyExceptions();
  const createMutation = useCreateHolidayPayPolicyException();
  const updateMutation = useUpdateHolidayPayPolicyException();
  const deleteMutation = useDeleteHolidayPayPolicyException();
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

  const openEdit = (exc: HolidayPayPolicyException) => {
    setEditingId(exc.id);
    const { id, created_on, modified_on, ...rest } = exc;
    setForm(rest as ExceptionForm);
    setCappingEnabled(exc.min_holiday_amount != null || exc.max_holiday_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const setField = <K extends keyof ExceptionForm>(key: K, value: ExceptionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setOverlapWarning(null);
  };

  const dist: BonusDistribution = (form.levy_distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION;

  // Whether distribution is active for this exception
  const isDistributionActive = form.policy_type === 'with_dates' && !!form.distribution_enabled;

  // Radio-style: select exactly one option per cycle
  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    setField('levy_distribution', newDist);
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
    const existing = (exceptions ?? []).map(e => ({ id: e.id, date_from: e.date_from, date_to: e.date_to, policy_type: e.policy_type }));
    const overlap = checkDateOverlap(date_from, date_to, existing, editingId || undefined, form.policy_type);
    if (overlap.overlaps) {
      setOverlapWarning('The selected month/year range overlaps with an existing exception for the same policy type.');
      return;
    }

    const updates = { ...form, date_from, date_to };

    if (!cappingEnabled) {
      updates.min_holiday_amount = null;
      updates.max_holiday_amount = null;
    }
    if (!updates.override_default) {
      updates.levy_calculation_method = null;
      updates.levy_calc_flat_enabled = null;
      updates.levy_calc_flat_percentage = null;
      updates.levy_calc_slab_enabled = null;
      updates.levy_distribution = null;
      updates.ssc_include = null;
      updates.ssc_contrib_employee = null;
      updates.ssc_contrib_employer = null;
      updates.ssc_contrib_eib = null;
      updates.distribution_enabled = null;
      updates.include_in_severance = null;
      updates.min_holiday_amount = null;
      updates.max_holiday_amount = null;
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
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Holiday Pay Policy Exceptions
              </CardTitle>
              <CardDescription>Month-specific overrides for holiday pay policy calculations. Each exception targets a specific policy type.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} variant="outline" className="border-orange-300">
              <Plus className="h-4 w-4 mr-1" />Add Exception
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!exceptions?.length ? (
            <div className="text-center py-8 text-muted-foreground">No holiday pay policy exceptions configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Policy</TableHead>
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
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${exc.policy_type === 'with_dates' ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400' : 'border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400'}`}>
                        {exc.policy_type === 'with_dates' ? <Calendar className="h-3 w-3" /> : <CalendarOff className="h-3 w-3" />}
                        {exc.policy_type === 'with_dates' ? 'With Dates' : 'No Dates'}
                      </Badge>
                    </TableCell>
                    <TableCell>{MONTH_NAMES[exc.exception_month - 1]}</TableCell>
                    <TableCell>{exc.year_from}{exc.year_to ? ` – ${exc.year_to}` : ''}</TableCell>
                    <TableCell>{exc.override_default ? <Check className="h-4 w-4 text-orange-600" /> : <span className="text-muted-foreground">—</span>}</TableCell>
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
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-orange-700 dark:text-orange-400">{editingId ? 'Edit' : 'Add'} Holiday Pay Exception</CardTitle>
                <CardDescription>Define month-specific overrides for holiday pay policy. Override sections only apply when "Override Default" is enabled.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">Each exception targets a specific month, year range, and policy type (with-dates or without-dates). Enable "Override Default" to customize Levy, SSC, and other settings for this exception.</span>
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
                <Select value={form.exception_type} onValueChange={(v) => { setField('exception_type', v as ExceptionType); if (v === 'onetime') setField('year_to', null); }}>
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
                    {MONTH_NAMES.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {form.exception_type === 'onetime' ? (
                <div className="space-y-1.5">
                  <Label>Year <span className="text-destructive">*</span></Label>
                  <Input type="number" value={form.year_from} onChange={(e) => setField('year_from', parseInt(e.target.value))} />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Year From <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.year_from} onChange={(e) => setField('year_from', parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year To <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input type="number" value={form.year_to ?? ''} onChange={(e) => setField('year_to', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                </>
              )}
            </div>

            {/* Policy Type for Exception */}
            <SectionLabel>Applies To Policy Type</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PolicyTypeCard selected={form.policy_type === 'with_dates'} onClick={() => setField('policy_type', 'with_dates')} icon={<Calendar className="h-5 w-5" />} label="With Dates" hint="Override for when holiday dates are provided" color="sky" />
              <PolicyTypeCard selected={form.policy_type === 'without_dates'} onClick={() => setField('policy_type', 'without_dates')} icon={<CalendarOff className="h-5 w-5" />} label="Without Dates" hint="Override for when holiday dates are not provided" color="violet" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description ?? ''} onChange={(e) => setField('description', e.target.value || null)} placeholder="Optional description" />
            </div>

            {/* Override toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <Checkbox
                id="hp-override"
                checked={form.override_default}
                onCheckedChange={(v) => {
                  const val = !!v;
                  setField('override_default', val);
                  if (val) {
                    if (!form.levy_calculation_method) setField('levy_calculation_method', 'merge');
                    if (form.levy_distribution == null) setField('levy_distribution', DEFAULT_DISTRIBUTION);
                    if (form.ssc_include == null) setField('ssc_include', true);
                    if (form.ssc_contrib_employee == null) setField('ssc_contrib_employee', true);
                    if (form.ssc_contrib_employer == null) setField('ssc_contrib_employer', true);
                    if (form.ssc_contrib_eib == null) setField('ssc_contrib_eib', false);
                    if (form.include_in_severance == null) setField('include_in_severance', false);
                    if (form.levy_include == null) setField('levy_include', true);
                  }
                }}
                className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
              />
              <div>
                <Label htmlFor="hp-override" className="text-sm font-medium cursor-pointer">Override Default Policy</Label>
                <p className="text-xs text-muted-foreground">Customize Levy, SSC, distribution, capping, and severance for this exception.</p>
              </div>
            </div>

            {/* Override sections */}
            {form.override_default && (
              <div className="space-y-6 border-l-4 border-orange-300 dark:border-orange-700 pl-4">
                {/* Distribution toggle (for with_dates) */}
                {form.policy_type === 'with_dates' && (
                  <>
                    <SectionLabel>Date-Based Distribution</SectionLabel>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <div className="text-sm font-medium">Enable distribution by holiday dates</div>
                        <div className="text-xs text-muted-foreground">When enabled, Levy/SSC/Severance rules below are ignored — normal payroll rules apply on distributed amounts.</div>
                      </div>
                      <Switch checked={!!form.distribution_enabled} onCheckedChange={(v) => setField('distribution_enabled', v)} />
                    </div>
                    {isDistributionActive && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                        <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                        <span className="text-sm text-sky-800 dark:text-sky-300">
                          Distribution is enabled. Levy, SSC, and Severance rules below are disabled.
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Levy Rules */}
                <div className={`border-2 border-sky-200 dark:border-sky-800 rounded-lg overflow-hidden ${isDistributionActive ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="bg-sky-50 dark:bg-sky-950/30 px-4 py-3 border-b border-sky-200 dark:border-sky-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="text-sm font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider">Levy Rules</span>
                        {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Include in Levy</Label>
                        <Switch checked={!!form.levy_include} onCheckedChange={(v) => setField('levy_include', v)} disabled={isDistributionActive} />
                      </div>
                    </div>
                  </div>
                  {form.levy_include && !isDistributionActive && (
                    <div className="p-4 space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation Method</p>
                        <RadioOption selected={form.levy_calculation_method === 'merge'} onClick={() => setField('levy_calculation_method', 'merge')} label="Merge with regular earnings" hint="Holiday pay combined into standard pay run for levy" color="sky" />
                        <RadioOption selected={form.levy_calculation_method === 'separate'} onClick={() => setField('levy_calculation_method', 'separate')} label="Calculate separately" hint="Isolated levy calculation" color="sky" />
                        {form.levy_calculation_method === 'separate' && (
                          <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
                            <RadioOption selected={!!form.levy_calc_flat_enabled} onClick={() => { setField('levy_calc_flat_enabled', true); setField('levy_calc_slab_enabled', false); }} label="Flat Percentage" hint="Fixed % on holiday pay" color="sky" />
                            {form.levy_calc_flat_enabled && (
                              <div className="flex items-center gap-2 ml-7" onClick={e => e.stopPropagation()}>
                                <Input type="number" className="w-24" placeholder="e.g. 15" value={form.levy_calc_flat_percentage ?? ''} onChange={e => setField('levy_calc_flat_percentage', e.target.value ? Number(e.target.value) : null)} min={0} max={100} />
                                <span className="text-sm font-semibold text-muted-foreground">%</span>
                              </div>
                            )}
                            <RadioOption selected={!!form.levy_calc_slab_enabled} onClick={() => { setField('levy_calc_slab_enabled', true); setField('levy_calc_flat_enabled', false); setField('levy_calc_flat_percentage', null); }} label="Levy Slab Based" hint="Use predefined levy slabs" color="sky" />
                          </div>
                        )}
                      </div>
                      {form.levy_calculation_method === 'merge' && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Levy Distribution by Payroll Cycle</p>
                          <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'w1', label: '1st week' }, { key: 'w2', label: '2nd week' }, { key: 'w3', label: '3rd week' }, { key: 'w4', label: '4th week' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                          <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'b1', label: '1st payment' }, { key: 'b2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                          <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist} color="sky" items={[{ key: 's1', label: '1st payment' }, { key: 's2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                          <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'm1', label: 'Monthly payment' }]} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SSC Rules */}
                <div className={`border-2 border-teal-200 dark:border-teal-800 rounded-lg overflow-hidden ${isDistributionActive ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="bg-teal-50 dark:bg-teal-950/30 px-4 py-3 border-b border-teal-200 dark:border-teal-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        <span className="text-sm font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">SSC Rules</span>
                        {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Include in SSC</Label>
                        <Switch checked={!!form.ssc_include} onCheckedChange={(v) => setField('ssc_include', v)} disabled={isDistributionActive} />
                      </div>
                    </div>
                  </div>
                  {form.ssc_include && !isDistributionActive && (
                    <div className="p-4">
                      <div className="border rounded-lg divide-y">
                        <ContribRow label="Employee Contribution" checked={!!form.ssc_contrib_employee} onChange={v => setField('ssc_contrib_employee', v)} />
                        <ContribRow label="Employer Contribution" checked={!!form.ssc_contrib_employer} onChange={v => setField('ssc_contrib_employer', v)} />
                        <ContribRow label="EIB" checked={!!form.ssc_contrib_eib} onChange={v => setField('ssc_contrib_eib', v)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Severance */}
                <div className={isDistributionActive ? 'opacity-50 pointer-events-none' : ''}>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="text-sm font-medium">Include in Severance {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>}</div>
                      <div className="text-xs text-muted-foreground">Add holiday pay to severance calculation base</div>
                    </div>
                    <Switch checked={!!form.include_in_severance} onCheckedChange={(v) => setField('include_in_severance', v)} disabled={isDistributionActive} />
                  </div>
                </div>

                {/* Capping */}
                <div className="flex items-center gap-3">
                  <Checkbox id="exc-hp-capping" checked={cappingEnabled} onCheckedChange={(v) => { const val = !!v; setCappingEnabled(val); if (!val) { setField('min_holiday_amount', null); setField('max_holiday_amount', null); } }} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" />
                  <SectionLabel>Capping</SectionLabel>
                </div>
                {cappingEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Min Amount</Label><Input type="number" value={form.min_holiday_amount ?? ''} onChange={e => setField('min_holiday_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                    <div className="space-y-1.5"><Label>Max Amount</Label><Input type="number" value={form.max_holiday_amount ?? ''} onChange={e => setField('max_holiday_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
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
            <AlertDialogDescription>This will permanently delete this holiday pay policy exception.</AlertDialogDescription>
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

function PolicyTypeCard({ selected, onClick, icon, label, hint, color }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string; color: string }) {
  const borderColor = selected
    ? color === 'sky' ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30' : 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30'
    : 'border-border bg-muted/30 hover:bg-muted/50';
  const iconColor = selected ? (color === 'sky' ? 'text-sky-600' : 'text-violet-600') : 'text-muted-foreground';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${borderColor}`} onClick={onClick}>
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      {selected && (
        <div className={`ml-auto mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${color === 'sky' ? 'bg-sky-600' : 'bg-violet-600'}`}>
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}

function RadioOption({ selected, onClick, label, hint, color = 'orange' }: { selected: boolean; onClick: () => void; label: string; hint: string; color?: string }) {
  const selectedBorder = color === 'sky' ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30' : 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30';
  const dotBg = color === 'sky' ? 'border-sky-600 bg-sky-600' : 'border-orange-600 bg-orange-600';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected ? selectedBorder : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={onClick}>
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? dotBg : 'border-muted-foreground/40'}`}>
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

function CycleBlock({ title, cycle, dist, setDist, items, color = 'orange' }: { title: string; cycle: keyof BonusDistribution; dist: BonusDistribution; setDist: (cycle: keyof BonusDistribution, key: string) => void; items: CycleItem[]; color?: string }) {
  const cycleObj = dist[cycle] as Record<string, boolean>;
  const checkedBorder = color === 'sky' ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30' : 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30';
  const checkedDot = color === 'sky' ? 'bg-sky-600 border-sky-600' : 'bg-orange-600 border-orange-600';
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="p-3 space-y-2">
        {items.map(item => {
          const isChecked = !!cycleObj[item.key];
          return (
            <div key={item.key} className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${isChecked ? checkedBorder : 'border-border bg-muted/20 hover:bg-muted/40'}`} onClick={() => setDist(cycle, item.key)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isChecked ? checkedDot : 'border-muted-foreground/40'}`}>
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
