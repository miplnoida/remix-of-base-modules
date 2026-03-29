import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Info, Save, Check, Plus, Edit, Trash2, X, AlertTriangle, Calendar, CalendarOff } from 'lucide-react';
import { useHolidayPayPolicyDefaults, useCreateHolidayPayPolicyDefault, useUpdateHolidayPayPolicyDefault, useDeleteHolidayPayPolicyDefault, checkDateOverlap } from '@/hooks/useHolidayPayPolicy';
import { useAnalyzeC3ConfigChange, useUpsertC3ConfigWithSplit } from '@/hooks/useC3ConfigLifecycle';
import { C3SplitConfirmDialog, SplitAnalysis } from '@/components/admin/c3-configuration/C3SplitConfirmDialog';
import { useUserCode } from '@/hooks/useUserCode';
import { useQueryClient } from '@tanstack/react-query';
import MonthYearPicker from '@/components/c3/MonthYearPicker';
import { formatDisplayDate, parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';
import type { HolidayPayPolicyDefault, BonusDistribution, CalculationMethod, HolidayPolicyType } from '@/types/holidayPayPolicy';
import { DEFAULT_DISTRIBUTION } from '@/types/holidayPayPolicy';
import { toast } from 'sonner';

const EMPTY_POLICY: Omit<HolidayPayPolicyDefault, 'id' | 'created_on' | 'modified_on'> = {
  date_from: formatDateForStorage(new Date()),
  date_to: null,
  policy_type: 'without_dates',
  distribution_enabled: true,
  levy_include: true,
  levy_calculation_method: 'merge',
  levy_calc_flat_enabled: false,
  levy_calc_flat_percentage: null,
  levy_calc_slab_enabled: false,
  levy_distribution: DEFAULT_DISTRIBUTION,
  ssc_include: true,
  ssc_contrib_employee: true,
  ssc_contrib_employer: true,
  ssc_contrib_eib: false,
  include_in_severance: false,
  min_holiday_amount: null,
  max_holiday_amount: null,
  is_active: true,
  created_by: null,
  modified_by: null,
};

export function HolidayPayPolicyDefaultTab() {
  const { data: policies, isLoading } = useHolidayPayPolicyDefaults();
  const createMutation = useCreateHolidayPayPolicyDefault();
  const updateMutation = useUpdateHolidayPayPolicyDefault();
  const deleteMutation = useDeleteHolidayPayPolicyDefault();
  const analyzeMutation = useAnalyzeC3ConfigChange();
  const upsertWithSplit = useUpsertC3ConfigWithSplit();
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_POLICY>({ ...EMPTY_POLICY });
  const [cappingEnabled, setCappingEnabled] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [splitAnalysis, setSplitAnalysis] = useState<SplitAnalysis | null>(null);
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_POLICY });
    setCappingEnabled(false);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const openEdit = (p: HolidayPayPolicyDefault) => {
    setEditingId(p.id);
    const { id, created_on, modified_on, ...rest } = p;
    setForm(rest as typeof EMPTY_POLICY);
    setCappingEnabled(p.min_holiday_amount != null || p.max_holiday_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const dist: BonusDistribution = (form.levy_distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION;

  // Whether distribution is active (with_dates + distribution_enabled)
  const isDistributionActive = form.policy_type === 'with_dates' && form.distribution_enabled;

  const setField = <K extends keyof typeof EMPTY_POLICY>(key: K, value: (typeof EMPTY_POLICY)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'date_from' || key === 'date_to') setOverlapWarning(null);
  };

  // Radio-style: select exactly one option per cycle
  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    // Deselect all, then select the chosen one
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    setField('levy_distribution', newDist);
  };

  const handleSave = async () => {
    if (!form.date_from) { setOverlapWarning('Date From is required.'); return; }
    if (form.date_to && form.date_to < form.date_from) { setOverlapWarning('Date To cannot be earlier than Date From.'); return; }

    const existing = (policies ?? []).map(p => ({ id: p.id, date_from: p.date_from, date_to: p.date_to, policy_type: p.policy_type }));
    const overlap = checkDateOverlap(form.date_from, form.date_to, existing, editingId || undefined, form.policy_type);
    if (overlap.overlaps) {
      const rec = overlap.overlappingRecord!;
      setOverlapWarning(`The selected period overlaps with an existing ${form.policy_type === 'with_dates' ? 'with-dates' : 'without-dates'} policy (${formatDisplayDate(rec.date_from)} – ${rec.date_to ? formatDisplayDate(rec.date_to) : 'Open-ended'}).`);
      return;
    }

    const updates = { ...form };
    if (!cappingEnabled) { updates.min_holiday_amount = null; updates.max_holiday_amount = null; }

    try {
      const analysis = await analyzeMutation.mutateAsync({
        tableName: 'c3_holiday_pay_policy_default',
        id: editingId,
        dateFrom: form.date_from,
        dateTo: form.date_to,
        scopeFilter: { policy_type: form.policy_type },
      });

      if (analysis.action === 'error') { setOverlapWarning(analysis.message || 'Validation failed'); return; }
      if (analysis.action === 'split') {
        setSplitAnalysis(analysis);
        setPendingSaveData(updates);
        setShowSplitConfirm(true);
        return;
      }

      if (editingId) {
        updateMutation.mutate({ id: editingId, updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
      } else {
        createMutation.mutate({ policy: updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
      }
    } catch (err: any) { setOverlapWarning(err.message || 'Validation failed'); }
  };

  const handleConfirmSplit = async () => {
    if (!editingId || !pendingSaveData) return;
    try {
      const { id, created_on, modified_on, ...vals } = pendingSaveData;
      await upsertWithSplit.mutateAsync({
        tableName: 'c3_holiday_pay_policy_default',
        id: editingId, dateFrom: pendingSaveData.date_from, dateTo: pendingSaveData.date_to,
        valuesJson: vals, userCode: userCode || undefined, forceSplit: true,
      });
      queryClient.invalidateQueries({ queryKey: ['holiday-pay-policy-defaults'] });
      toast.success('Configuration split successfully.');
      setShowSplitConfirm(false); setSplitAnalysis(null); setPendingSaveData(null); setShowForm(false);
    } catch (err: any) { toast.error(err.message || 'Split failed'); }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync({ id: deleteId, userCode: userCode || undefined });
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Policy List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Holiday Pay Policies</CardTitle>
              <CardDescription>Configure how holiday pay affects Levy and Social Security calculations. Separate policies for with-dates and without-dates scenarios.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Policy</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!policies?.length ? (
            <div className="text-center py-8 text-muted-foreground">No holiday pay policies configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Distribution</TableHead>
                  <TableHead>Levy</TableHead>
                  <TableHead>SSC</TableHead>
                  <TableHead>Severance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(p => {
                  const pDistActive = p.policy_type === 'with_dates' && p.distribution_enabled;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{(() => { const d = parseDateSafe(p.date_from); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_from; })()}</TableCell>
                      <TableCell>{p.date_to ? (() => { const d = parseDateSafe(p.date_to); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_to; })() : <span className="text-muted-foreground italic">Open-ended</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${p.policy_type === 'with_dates' ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400' : 'border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400'}`}>
                          {p.policy_type === 'with_dates' ? <Calendar className="h-3 w-3" /> : <CalendarOff className="h-3 w-3" />}
                          {p.policy_type === 'with_dates' ? 'With Dates' : 'Without Dates'}
                        </Badge>
                      </TableCell>
                      <TableCell>{pDistActive ? <Check className="h-4 w-4 text-sky-600" /> : '—'}</TableCell>
                      <TableCell>{!pDistActive && p.levy_include ? <Check className="h-4 w-4 text-emerald-600" /> : pDistActive ? <span className="text-xs text-muted-foreground italic">N/A</span> : '—'}</TableCell>
                      <TableCell>{!pDistActive && p.ssc_include ? <Check className="h-4 w-4 text-emerald-600" /> : pDistActive ? <span className="text-xs text-muted-foreground italic">N/A</span> : '—'}</TableCell>
                      <TableCell>{!pDistActive && p.include_in_severance ? <Check className="h-4 w-4 text-emerald-600" /> : pDistActive ? <span className="text-xs text-muted-foreground italic">N/A</span> : '—'}</TableCell>
                      <TableCell>
                        {p.is_active
                          ? <span className="text-emerald-600 font-semibold text-sm">● Active</span>
                          : <span className="text-muted-foreground text-sm">○ Inactive</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                <CardTitle>{editingId ? 'Edit' : 'Add'} Holiday Pay Policy</CardTitle>
                <CardDescription>Configure holiday pay treatment for Levy and Social Security Contribution independently.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                Create separate policies for "With Dates" and "Without Dates" scenarios. Each policy type has independent Levy and SSC configuration. Overlapping periods within the same policy type are not allowed.
              </span>
            </div>

            {overlapWarning && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-sm text-destructive">{overlapWarning}</span>
              </div>
            )}

            {/* Policy Type Selector */}
            <SectionLabel>Policy Type</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PolicyTypeCard
                selected={form.policy_type === 'with_dates'}
                onClick={() => setField('policy_type', 'with_dates')}
                icon={<Calendar className="h-5 w-5" />}
                label="With Dates Provided"
                hint="Holiday dates are entered by user. Supports date-based distribution across periods."
                color="sky"
              />
              <PolicyTypeCard
                selected={form.policy_type === 'without_dates'}
                onClick={() => setField('policy_type', 'without_dates')}
                icon={<CalendarOff className="h-5 w-5" />}
                label="Without Dates Provided"
                hint="Holiday pay is entered as an amount only. No date-based distribution."
                color="violet"
              />
            </div>

            {/* Distribution toggle (only for with_dates) */}
            {form.policy_type === 'with_dates' && (
              <>
                <SectionLabel>Date-Based Distribution</SectionLabel>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">Enable distribution by holiday dates</div>
                    <div className="text-xs text-muted-foreground">When enabled, holiday pay is split across months/weeks based on actual holiday dates. Levy, SSC, and Severance rules below will be ignored — calculations use normal payroll rules on the distributed amounts.</div>
                  </div>
                  <Switch checked={form.distribution_enabled} onCheckedChange={(v) => setField('distribution_enabled', v)} />
                </div>
                {isDistributionActive && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                    <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-sky-800 dark:text-sky-300">
                      Distribution is enabled. Levy rules, SSC rules, and Severance below are disabled. Holiday pay will be distributed across weeks based on dates, and normal payroll calculations will apply.
                    </span>
                  </div>
                )}
              </>
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
                <Label>To <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <MonthYearPicker
                  value={form.date_to ? (() => { const d = parseDateSafe(form.date_to); return d ? { year: d.getFullYear(), month: d.getMonth() } : undefined; })() : undefined}
                  onChange={({ year, month }) => setField('date_to', `${year}-${String(month + 1).padStart(2, '0')}-01`)}
                  placeholder="Open-ended"
                />
              </div>
            </div>

            {/* ═══════════════════ LEVY RULES ═══════════════════ */}
            <div className={`border-2 border-sky-200 dark:border-sky-800 rounded-lg overflow-hidden ${isDistributionActive ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="bg-sky-50 dark:bg-sky-950/30 px-4 py-3 border-b border-sky-200 dark:border-sky-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <span className="text-sm font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider">Levy Rules</span>
                    {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled — distribution active</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Include in Levy</Label>
                    <Switch checked={form.levy_include} onCheckedChange={(v) => setField('levy_include', v)} disabled={isDistributionActive} />
                  </div>
                </div>
              </div>
              {form.levy_include && !isDistributionActive && (
                <div className="p-4 space-y-5">
                  {/* Levy Calculation Method */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation Method</p>
                    <RadioOption selected={form.levy_calculation_method === 'merge'} onClick={() => setField('levy_calculation_method', 'merge')} label="Merge with regular earnings" hint="Holiday pay combined into standard pay run for levy" color="sky" />
                    <RadioOption selected={form.levy_calculation_method === 'separate'} onClick={() => setField('levy_calculation_method', 'separate')} label="Calculate separately" hint="Holiday pay processed in an isolated levy calculation" color="sky" />
                    {form.levy_calculation_method === 'separate' && (
                      <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Select Method</p>
                        <RadioOption selected={!!form.levy_calc_flat_enabled} onClick={() => { setField('levy_calc_flat_enabled', true); setField('levy_calc_slab_enabled', false); }} label="Flat Percentage" hint="Fixed percentage on holiday pay for levy" color="sky" />
                        {form.levy_calc_flat_enabled && (
                          <div className="flex items-center gap-2 ml-7" onClick={e => e.stopPropagation()}>
                            <Input type="number" className="w-24" placeholder="e.g. 15" value={form.levy_calc_flat_percentage ?? ''} onChange={e => setField('levy_calc_flat_percentage', e.target.value ? Number(e.target.value) : null)} min={0} max={100} />
                            <span className="text-sm font-semibold text-muted-foreground">%</span>
                          </div>
                        )}
                        <RadioOption selected={!!form.levy_calc_slab_enabled} onClick={() => { setField('levy_calc_slab_enabled', true); setField('levy_calc_flat_enabled', false); setField('levy_calc_flat_percentage', null); }} label="Levy Slab Based" hint="Holiday pay calculated using predefined levy slabs" color="sky" />
                      </div>
                    )}
                  </div>

                  {/* Levy Distribution (only for merge) */}
                  {form.levy_calculation_method === 'merge' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Levy Distribution by Payroll Cycle</p>
                      <p className="text-xs text-muted-foreground">Select which payroll week/payment the holiday pay should be included in for each frequency (single selection).</p>
                      <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'w1', label: 'Include in 1st week' }, { key: 'w2', label: 'Include in 2nd week' }, { key: 'w3', label: 'Include in 3rd week' }, { key: 'w4', label: 'Include in 4th / last week' }, { key: 'divide', label: 'Divide equally across all weeks', isDivide: true }]} />
                      <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'b1', label: 'Include in 1st payment' }, { key: 'b2', label: 'Include in last payment' }, { key: 'divide', label: 'Divide equally across both payments', isDivide: true }]} />
                      <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist} color="sky" items={[{ key: 's1', label: 'Include in 1st payment' }, { key: 's2', label: 'Include in last payment' }, { key: 'divide', label: 'Divide equally across both payments', isDivide: true }]} />
                      <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist} color="sky" items={[{ key: 'm1', label: 'Include in monthly payment' }]} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════ SSC RULES ═══════════════════ */}
            <div className={`border-2 border-teal-200 dark:border-teal-800 rounded-lg overflow-hidden ${isDistributionActive ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="bg-teal-50 dark:bg-teal-950/30 px-4 py-3 border-b border-teal-200 dark:border-teal-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="text-sm font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Social Security Contribution Rules</span>
                    {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Include in SSC</Label>
                    <Switch checked={form.ssc_include} onCheckedChange={(v) => setField('ssc_include', v)} disabled={isDistributionActive} />
                  </div>
                </div>
              </div>
              {form.ssc_include && !isDistributionActive && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-muted-foreground">Select which SSC contribution bases should include holiday pay amount.</p>
                  <div className="border rounded-lg divide-y">
                    <ContribRow label="Employee Contribution" checked={form.ssc_contrib_employee} onChange={v => setField('ssc_contrib_employee', v)} />
                    <ContribRow label="Employer Contribution" checked={form.ssc_contrib_employer} onChange={v => setField('ssc_contrib_employer', v)} />
                    <ContribRow label="EIB (Employee Injury Benefit)" checked={form.ssc_contrib_eib} onChange={v => setField('ssc_contrib_eib', v)} />
                  </div>
                </div>
              )}
            </div>

            {/* Severance */}
            <div className={isDistributionActive ? 'opacity-50 pointer-events-none' : ''}>
              <SectionLabel>Severance {isDistributionActive && <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>}</SectionLabel>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="text-sm font-medium">Include Holiday Pay in Severance Calculation</div>
                  <div className="text-xs text-muted-foreground">Holiday pay amount will be added to the severance calculation base</div>
                </div>
                <Switch checked={form.include_in_severance} onCheckedChange={(v) => setField('include_in_severance', v)} disabled={isDistributionActive} />
              </div>
            </div>

            {/* Capping */}
            <div className="flex items-center gap-3">
              <Checkbox id="hp-capping" checked={cappingEnabled} onCheckedChange={(v) => { const val = !!v; setCappingEnabled(val); if (!val) { setField('min_holiday_amount', null); setField('max_holiday_amount', null); } }} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
              <SectionLabel>Capping on Eligible Holiday Pay Amount</SectionLabel>
            </div>
            {cappingEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Minimum Amount</Label><Input type="number" placeholder="e.g. 100" value={form.min_holiday_amount ?? ''} onChange={e => setField('min_holiday_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                <div className="space-y-1.5"><Label>Maximum Amount</Label><Input type="number" placeholder="e.g. 50000" value={form.max_holiday_amount ?? ''} onChange={e => setField('max_holiday_amount', e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">Only active policies are used for calculations</div>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
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
            <AlertDialogDescription>This will permanently delete this holiday pay policy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Split Confirmation */}
      <C3SplitConfirmDialog
        open={showSplitConfirm}
        onOpenChange={setShowSplitConfirm}
        analysis={splitAnalysis}
        onConfirm={handleConfirmSplit}
        isLoading={upsertWithSplit.isPending}
      />
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
  const iconColor = selected
    ? color === 'sky' ? 'text-sky-600' : 'text-violet-600'
    : 'text-muted-foreground';

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

function RadioOption({ selected, onClick, label, hint, color = 'emerald' }: { selected: boolean; onClick: () => void; label: string; hint: string; color?: string }) {
  const selectedBorder = color === 'sky' ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30' : 'border-emerald-400 bg-emerald-50';
  const dotBg = color === 'sky' ? 'border-sky-600 bg-sky-600' : 'border-emerald-600 bg-emerald-600';
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

function CycleBlock({ title, cycle, dist, setDist, items, color = 'emerald' }: { title: string; cycle: keyof BonusDistribution; dist: BonusDistribution; setDist: (cycle: keyof BonusDistribution, key: string) => void; items: CycleItem[]; color?: string }) {
  const cycleObj = dist[cycle] as Record<string, boolean>;
  const checkedBorder = color === 'sky' ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30' : 'border-emerald-300 bg-emerald-50';
  const checkedDot = color === 'sky' ? 'bg-sky-600 border-sky-600' : 'bg-emerald-600 border-emerald-600';
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
