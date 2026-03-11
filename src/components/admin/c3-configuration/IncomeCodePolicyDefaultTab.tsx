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
import { Loader2, Info, Save, Check, Plus, Edit, Trash2, X, AlertTriangle, Calendar, CalendarOff, Tag } from 'lucide-react';
import { useIncomeCodes, useIncomeCodePolicyDefaults, useCreateIncomeCodePolicyDefault, useUpdateIncomeCodePolicyDefault, useDeleteIncomeCodePolicyDefault, checkDateOverlap } from '@/hooks/useIncomeCodePolicy';
import { useUserCode } from '@/hooks/useUserCode';
import MonthYearPicker from '@/components/c3/MonthYearPicker';
import { formatDisplayDate, parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';
import type { IncomeCodePolicyDefault, BonusDistribution, DateEntryMode } from '@/types/incomeCodePolicy';
import { DEFAULT_DISTRIBUTION, DATE_ENTRY_MODE_LABELS } from '@/types/incomeCodePolicy';

const EMPTY_POLICY: Omit<IncomeCodePolicyDefault, 'id' | 'created_on' | 'modified_on'> = {
  income_code_id: '',
  date_entry_mode: 'no_dates',
  date_from: formatDateForStorage(new Date()),
  date_to: null,
  policy_type: 'without_dates',
  distribution_enabled: false,
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
  contrib_employee: true,
  contrib_employer: true,
  contrib_eir: false,
  contrib_severance: false,
  include_in_levy: true,
  include_in_severance: false,
  calculation_method: 'merge',
  calc_flat_enabled: false,
  calc_flat_percentage: null,
  calc_slab_enabled: false,
  distribution: DEFAULT_DISTRIBUTION,
  min_amount: null,
  max_amount: null,
  is_active: true,
  created_by: null,
  modified_by: null,
};

export function IncomeCodePolicyDefaultTab() {
  const { data: incomeCodes = [], isLoading: codesLoading } = useIncomeCodes(true);
  const [selectedCodeId, setSelectedCodeId] = useState<string>('');
  const { data: policies, isLoading } = useIncomeCodePolicyDefaults(selectedCodeId || undefined);
  const createMutation = useCreateIncomeCodePolicyDefault();
  const updateMutation = useUpdateIncomeCodePolicyDefault();
  const deleteMutation = useDeleteIncomeCodePolicyDefault();
  const { userCode } = useUserCode();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_POLICY>({ ...EMPTY_POLICY });
  const [cappingEnabled, setCappingEnabled] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const selectedCode = incomeCodes.find(c => c.id === selectedCodeId);

  const openCreate = () => {
    if (!selectedCodeId) return;
    setEditingId(null);
    setForm({ ...EMPTY_POLICY, income_code_id: selectedCodeId });
    setCappingEnabled(false);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const openEdit = (p: IncomeCodePolicyDefault) => {
    setEditingId(p.id);
    const { id, created_on, modified_on, ...rest } = p;
    setForm(rest as typeof EMPTY_POLICY);
    setCappingEnabled(p.min_amount != null || p.max_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const setField = <K extends keyof typeof EMPTY_POLICY>(key: K, value: (typeof EMPTY_POLICY)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'date_from' || key === 'date_to') setOverlapWarning(null);
  };

  // When date_entry_mode changes, reset policy_type appropriately
  const handleDateEntryModeChange = (mode: DateEntryMode) => {
    setField('date_entry_mode', mode);
    if (mode === 'dates_mandatory') {
      setField('policy_type', 'with_dates');
      setField('distribution_enabled', true);
    } else if (mode === 'dates_optional') {
      setField('policy_type', 'without_dates');
    } else {
      setField('policy_type', 'without_dates');
      setField('distribution_enabled', false);
    }
  };

  const handleSave = () => {
    if (!form.date_from) { setOverlapWarning('Date From is required.'); return; }
    if (form.date_to && form.date_to < form.date_from) { setOverlapWarning('Date To cannot be earlier than Date From.'); return; }

    const existing = (policies ?? []).map(p => ({ id: p.id, date_from: p.date_from, date_to: p.date_to, policy_type: p.policy_type }));
    const overlap = checkDateOverlap(form.date_from, form.date_to, existing, editingId || undefined, form.date_entry_mode !== 'no_dates' ? form.policy_type : undefined);
    if (overlap.overlaps) {
      setOverlapWarning('The selected period overlaps with an existing policy.');
      return;
    }

    const updates = { ...form };
    if (!cappingEnabled) { updates.min_amount = null; updates.max_amount = null; }

    if (editingId) {
      updateMutation.mutate({ id: editingId, updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate({ policy: updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    }
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); }
  };

  // Get the correct distribution object based on mode
  const isHolidayMode = form.date_entry_mode !== 'no_dates';
  const dist: BonusDistribution = isHolidayMode
    ? ((form.levy_distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION)
    : ((form.distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION);
  const isDistributionActive = isHolidayMode && form.policy_type === 'with_dates' && form.distribution_enabled;

  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    if (isHolidayMode) setField('levy_distribution', newDist);
    else setField('distribution', newDist);
  };

  if (codesLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Income Code Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Select Income Code</CardTitle>
          <CardDescription>Choose an income code to configure its policy settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCodeId} onValueChange={(v) => { setSelectedCodeId(v); setShowForm(false); }}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select an income code..." />
            </SelectTrigger>
            <SelectContent>
              {incomeCodes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {incomeCodes.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No active income codes found. Add income codes in Administration → Master Data → Income Codes.</p>
          )}
        </CardContent>
      </Card>

      {/* Policy List */}
      {selectedCodeId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Policies for "{selectedCode?.code}"</CardTitle>
                <CardDescription>Configure how {selectedCode?.description} affects C3 calculations.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Policy</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : !policies?.length ? (
              <div className="text-center py-8 text-muted-foreground">No policies configured for this income code yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Date Mode</TableHead>
                    <TableHead>Policy Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{(() => { const d = parseDateSafe(p.date_from); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_from; })()}</TableCell>
                      <TableCell>{p.date_to ? (() => { const d = parseDateSafe(p.date_to); return d ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : p.date_to; })() : <span className="text-muted-foreground italic">Open-ended</span>}</TableCell>
                      <TableCell><Badge variant="outline">{DATE_ENTRY_MODE_LABELS[p.date_entry_mode as DateEntryMode] || p.date_entry_mode}</Badge></TableCell>
                      <TableCell>
                        {p.date_entry_mode !== 'no_dates' ? (
                          <Badge variant="outline" className={p.policy_type === 'with_dates' ? 'border-sky-300 text-sky-700' : 'border-violet-300 text-violet-700'}>
                            {p.policy_type === 'with_dates' ? 'With Dates' : 'Without Dates'}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {p.is_active ? <span className="text-emerald-600 font-semibold text-sm">● Active</span> : <span className="text-muted-foreground text-sm">○ Inactive</span>}
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
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingId ? 'Edit' : 'Add'} Policy for "{selectedCode?.code}"</CardTitle>
                <CardDescription>Configure the income code policy and its validity period.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {overlapWarning && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-sm text-destructive">{overlapWarning}</span>
              </div>
            )}

            {/* Date Entry Mode */}
            <SectionLabel>Date Entry Mode</SectionLabel>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">
                Select how dates will be handled for this income code during C3 submission.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DateModeCard selected={form.date_entry_mode === 'dates_mandatory'} onClick={() => handleDateEntryModeChange('dates_mandatory')} label="Dates Mandatory" hint="Users must always enter dates. Behaves like Holiday Pay (With Dates)." />
              <DateModeCard selected={form.date_entry_mode === 'dates_optional'} onClick={() => handleDateEntryModeChange('dates_optional')} label="Dates Optional" hint="Users can optionally enter dates. Supports both With and Without Dates policies." />
              <DateModeCard selected={form.date_entry_mode === 'no_dates'} onClick={() => handleDateEntryModeChange('no_dates')} label="No Dates" hint="No date entry. Behaves like Bonus Policy." />
            </div>

            {/* Policy Type Selector (only for dates_optional mode) */}
            {form.date_entry_mode === 'dates_optional' && (
              <>
                <SectionLabel>Policy Type</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PolicyTypeCard selected={form.policy_type === 'with_dates'} onClick={() => setField('policy_type', 'with_dates')} icon={<Calendar className="h-5 w-5" />} label="With Dates Provided" hint="Dates entered by user. Supports date-based distribution." color="sky" />
                  <PolicyTypeCard selected={form.policy_type === 'without_dates'} onClick={() => setField('policy_type', 'without_dates')} icon={<CalendarOff className="h-5 w-5" />} label="Without Dates" hint="Amount only, no date-based distribution." color="violet" />
                </div>
              </>
            )}

            {/* Distribution toggle (holiday modes with_dates) */}
            {isHolidayMode && (form.date_entry_mode === 'dates_mandatory' || (form.date_entry_mode === 'dates_optional' && form.policy_type === 'with_dates')) && (
              <>
                <SectionLabel>Date-Based Distribution</SectionLabel>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">Enable distribution by dates</div>
                    <div className="text-xs text-muted-foreground">When enabled, amount is split across months/weeks based on actual dates. Levy, SSC, Severance rules below will be ignored.</div>
                  </div>
                  <Switch checked={form.distribution_enabled} onCheckedChange={(v) => setField('distribution_enabled', v)} />
                </div>
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

            {/* ═══ HOLIDAY-STYLE CONFIG (dates_mandatory or dates_optional with_dates) ═══ */}
            {isHolidayMode && !isDistributionActive && (form.date_entry_mode === 'dates_mandatory' || form.policy_type === 'with_dates' || form.policy_type === 'without_dates') && (
              <>
                {/* Levy Rules */}
                <div className="border-2 border-sky-200 dark:border-sky-800 rounded-lg overflow-hidden">
                  <div className="bg-sky-50 dark:bg-sky-950/30 px-4 py-3 border-b border-sky-200 dark:border-sky-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="text-sm font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider">Levy Rules</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Include in Levy</Label>
                        <Switch checked={form.levy_include} onCheckedChange={(v) => setField('levy_include', v)} />
                      </div>
                    </div>
                  </div>
                  {form.levy_include && (
                    <div className="p-4 space-y-5">
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation Method</p>
                        <RadioOption selected={form.levy_calculation_method === 'merge'} onClick={() => setField('levy_calculation_method', 'merge')} label="Merge with regular earnings" hint="Combined into standard pay run for levy" color="sky" />
                        <RadioOption selected={form.levy_calculation_method === 'separate'} onClick={() => setField('levy_calculation_method', 'separate')} label="Calculate separately" hint="Processed in an isolated levy calculation" color="sky" />
                        {form.levy_calculation_method === 'separate' && (
                          <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
                            <RadioOption selected={!!form.levy_calc_flat_enabled} onClick={() => { setField('levy_calc_flat_enabled', true); setField('levy_calc_slab_enabled', false); }} label="Flat Percentage" hint="Fixed percentage on the base amount" color="sky" />
                            {form.levy_calc_flat_enabled && (
                              <div className="flex items-center gap-2 ml-7">
                                <Input type="number" className="w-24" placeholder="e.g. 15" value={form.levy_calc_flat_percentage ?? ''} onChange={e => setField('levy_calc_flat_percentage', e.target.value ? Number(e.target.value) : null)} min={0} max={100} />
                                <span className="text-sm font-semibold text-muted-foreground">%</span>
                              </div>
                            )}
                            <RadioOption selected={!!form.levy_calc_slab_enabled} onClick={() => { setField('levy_calc_slab_enabled', true); setField('levy_calc_flat_enabled', false); setField('levy_calc_flat_percentage', null); }} label="Levy Slab Based" hint="Calculated using predefined levy slabs" color="sky" />
                          </div>
                        )}
                      </div>
                      {/* Distribution for merge */}
                      {form.levy_calculation_method === 'merge' && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribution by Payroll Cycle</p>
                          <div className="space-y-4">
                            <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist} items={[{ key: 'w1', label: 'Include in 1st week' }, { key: 'w2', label: '2nd week' }, { key: 'w3', label: '3rd week' }, { key: 'w4', label: '4th week' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} color="sky" />
                            <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist} items={[{ key: 'b1', label: '1st payment' }, { key: 'b2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} color="sky" />
                            <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist} items={[{ key: 's1', label: '1st payment' }, { key: 's2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} color="sky" />
                            <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist} items={[{ key: 'm1', label: 'Monthly payment' }]} color="sky" />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* SSC Rules */}
                <div className="border-2 border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden">
                  <div className="bg-violet-50 dark:bg-violet-950/30 px-4 py-3 border-b border-violet-200 dark:border-violet-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <span className="text-sm font-semibold text-violet-800 dark:text-violet-300 uppercase tracking-wider">Social Security Rules</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Include in SSC</Label>
                        <Switch checked={form.ssc_include} onCheckedChange={(v) => setField('ssc_include', v)} />
                      </div>
                    </div>
                  </div>
                  {form.ssc_include && (
                    <div className="p-4 divide-y">
                      <ContribRow label="Employee Contribution" checked={!!form.ssc_contrib_employee} onChange={(v) => setField('ssc_contrib_employee', v)} />
                      <ContribRow label="Employer Contribution" checked={!!form.ssc_contrib_employer} onChange={(v) => setField('ssc_contrib_employer', v)} />
                      <ContribRow label="EIB (Employee Injury Benefit)" checked={!!form.ssc_contrib_eib} onChange={(v) => setField('ssc_contrib_eib', v)} />
                    </div>
                  )}
                </div>

                {/* Severance */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div><div className="text-sm font-medium">Include in Severance</div></div>
                  <Switch checked={form.include_in_severance} onCheckedChange={(v) => setField('include_in_severance', v)} />
                </div>
              </>
            )}

            {/* ═══ BONUS-STYLE CONFIG (no_dates mode) ═══ */}
            {form.date_entry_mode === 'no_dates' && (
              <>
                <SectionLabel>Applicability in C3</SectionLabel>
                <div className="space-y-3">
                  <ToggleRow label="Include in Levy" hint="When OFF, this income code amount will be excluded from employee and employer levy calculations" checked={!!form.include_in_levy} onChange={(v) => setField('include_in_levy', v)} />
                </div>

                <div className={!form.include_in_levy ? 'opacity-50 pointer-events-none' : ''}>
                <SectionLabel>Calculation Method {!form.include_in_levy && <Badge variant="outline" className="text-xs ml-2">Disabled — Levy excluded</Badge>}</SectionLabel>
                <div className="space-y-3">
                  <RadioOption selected={form.calculation_method === 'merge'} onClick={() => setField('calculation_method', 'merge')} label="Merge with regular earnings" hint="Combined into the standard pay run" />
                  <RadioOption selected={form.calculation_method === 'separate'} onClick={() => setField('calculation_method', 'separate')} label="Calculate separately" hint="Processed in an isolated calculation" />
                  {form.calculation_method === 'separate' && (
                    <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
                      <RadioOption selected={!!form.calc_flat_enabled} onClick={() => { setField('calc_flat_enabled', true); setField('calc_slab_enabled', false); }} label="Flat Percentage" hint="Fixed percentage applied on the base amount" />
                      {form.calc_flat_enabled && (
                        <div className="flex items-center gap-2 ml-7">
                          <Input type="number" className="w-24" placeholder="e.g. 15" value={form.calc_flat_percentage ?? ''} onChange={e => setField('calc_flat_percentage', e.target.value ? Number(e.target.value) : null)} min={0} max={100} />
                          <span className="text-sm font-semibold text-muted-foreground">%</span>
                        </div>
                      )}
                      <RadioOption selected={!!form.calc_slab_enabled} onClick={() => { setField('calc_slab_enabled', true); setField('calc_flat_enabled', false); setField('calc_flat_percentage', null); }} label="Levy Slab Based" hint="Calculated using predefined levy slabs" />
                    </div>
                  )}
                </div>

                {form.calculation_method === 'merge' && (
                  <>
                    <SectionLabel>Distribution by Payroll Cycle</SectionLabel>
                    <div className="space-y-4">
                      <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist} items={[{ key: 'w1', label: '1st week' }, { key: 'w2', label: '2nd week' }, { key: 'w3', label: '3rd week' }, { key: 'w4', label: '4th week' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                      <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist} items={[{ key: 'b1', label: '1st payment' }, { key: 'b2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                      <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist} items={[{ key: 's1', label: '1st payment' }, { key: 's2', label: 'Last payment' }, { key: 'divide', label: 'Divide equally', isDivide: true }]} />
                      <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist} items={[{ key: 'm1', label: 'Monthly payment' }]} />
                    </div>
                  </>
                )}
                </div>

                <SectionLabel>Contribution Base Calculation</SectionLabel>
                <div className="border rounded-lg divide-y">
                  <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={v => setField('contrib_employee', v)} />
                  <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={v => setField('contrib_employer', v)} />
                  <ContribRow label="EIB (Employee Injury Benefit)" checked={!!form.contrib_eir} onChange={v => setField('contrib_eir', v)} />
                  <ContribRow label="Severance Payment" checked={!!form.contrib_severance} onChange={v => setField('contrib_severance', v)} />
                </div>
              </>
            )}

            {/* Capping */}
            <div className="flex items-center gap-3">
              <Checkbox id="ic-capping" checked={cappingEnabled} onCheckedChange={(v) => { setCappingEnabled(!!v); if (!v) { setField('min_amount', null); setField('max_amount', null); } }} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
              <SectionLabel>Capping on Eligible Amount</SectionLabel>
            </div>
            {cappingEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Minimum Amount</Label><Input type="number" placeholder="e.g. 500" value={form.min_amount ?? ''} onChange={e => setField('min_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                <div className="space-y-1.5"><Label>Maximum Amount</Label><Input type="number" placeholder="e.g. 50000" value={form.max_amount ?? ''} onChange={e => setField('max_amount', e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
            )}

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
            <AlertDialogDescription>This will permanently delete this income code policy.</AlertDialogDescription>
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

function DateModeCard({ selected, onClick, label, hint }: { selected: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <div className={`flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        {selected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="h-3 w-3 text-primary-foreground" /></div>}
      </div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function PolicyTypeCard({ selected, onClick, icon, label, hint, color }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string; color: string }) {
  const borderColor = selected
    ? color === 'sky' ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30' : 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30'
    : 'border-border bg-muted/30 hover:bg-muted/50';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${borderColor}`} onClick={onClick}>
      <div className={`mt-0.5 shrink-0 ${selected ? (color === 'sky' ? 'text-sky-600' : 'text-violet-600') : 'text-muted-foreground'}`}>{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      {selected && <div className={`ml-auto mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${color === 'sky' ? 'bg-sky-600' : 'bg-violet-600'}`}><Check className="h-3 w-3 text-white" /></div>}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-b-0 ${disabled ? 'opacity-70' : ''}`}>
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
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
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div>
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
