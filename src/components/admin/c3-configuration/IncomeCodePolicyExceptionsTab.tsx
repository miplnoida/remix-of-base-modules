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
import { Loader2, Plus, Edit, Trash2, Info, Save, X, Check, AlertTriangle, Calendar, CalendarOff, Tag } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useIncomeCodes, useIncomeCodePolicyExceptions, useCreateIncomeCodePolicyException, useUpdateIncomeCodePolicyException, useDeleteIncomeCodePolicyException, checkDateOverlap } from '@/hooks/useIncomeCodePolicy';
import { useUserCode } from '@/hooks/useUserCode';
import type { IncomeCodePolicyException, BonusDistribution, ExceptionType, DateEntryMode } from '@/types/incomeCodePolicy';
import { MONTH_NAMES, DEFAULT_DISTRIBUTION, DATE_ENTRY_MODE_LABELS } from '@/types/incomeCodePolicy';

type ExceptionForm = Omit<IncomeCodePolicyException, 'id' | 'created_on' | 'modified_on'>;

const EMPTY_EXCEPTION: ExceptionForm = {
  income_code_id: '',
  date_entry_mode: 'no_dates',
  date_from: '',
  date_to: null,
  exception_type: 'onetime',
  exception_month: new Date().getMonth() + 1,
  year_from: new Date().getFullYear(),
  year_to: null,
  policy_type: 'without_dates',
  override_default: false,
  distribution_enabled: null,
  levy_include: null,
  levy_calculation_method: null,
  levy_calc_flat_enabled: null,
  levy_calc_flat_percentage: null,
  levy_calc_slab_enabled: null,
  levy_distribution: null,
  ssc_include: null,
  ssc_contrib_employee: null,
  ssc_contrib_employer: null,
  ssc_contrib_eib: null,
  include_in_levy: null,
  include_in_severance: null,
  calculation_method: null,
  calc_flat_enabled: null,
  calc_flat_percentage: null,
  calc_slab_enabled: null,
  distribution: null,
  contrib_employee: null,
  contrib_employer: null,
  contrib_eir: null,
  contrib_severance: null,
  min_amount: null,
  max_amount: null,
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
  return { date_from: `${form.year_from}-${month}-01`, date_to: form.year_to ? `${form.year_to}-${month}-01` : null };
}

export function IncomeCodePolicyExceptionsTab() {
  const { data: incomeCodes = [], isLoading: codesLoading } = useIncomeCodes(true);
  const [selectedCodeId, setSelectedCodeId] = useState<string>('');
  const { data: exceptions, isLoading } = useIncomeCodePolicyExceptions(selectedCodeId || undefined);
  const createMutation = useCreateIncomeCodePolicyException();
  const updateMutation = useUpdateIncomeCodePolicyException();
  const deleteMutation = useDeleteIncomeCodePolicyException();
  const { userCode } = useUserCode();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExceptionForm>({ ...EMPTY_EXCEPTION });
  const [cappingEnabled, setCappingEnabled] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const selectedCode = incomeCodes.find(c => c.id === selectedCodeId);

  const openCreate = () => {
    if (!selectedCodeId) return;
    setEditingId(null);
    setForm({ ...EMPTY_EXCEPTION, income_code_id: selectedCodeId });
    setCappingEnabled(false);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const openEdit = (exc: IncomeCodePolicyException) => {
    setEditingId(exc.id);
    const { id, created_on, modified_on, ...rest } = exc;
    setForm(rest as ExceptionForm);
    setCappingEnabled(exc.min_amount != null || exc.max_amount != null);
    setOverlapWarning(null);
    setShowForm(true);
  };

  const setField = <K extends keyof ExceptionForm>(key: K, value: ExceptionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setOverlapWarning(null);
  };

  const isHolidayMode = form.date_entry_mode !== 'no_dates';
  const dist: BonusDistribution = isHolidayMode
    ? ((form.levy_distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION)
    : ((form.distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION);

  const setDist = (cycle: keyof BonusDistribution, key: string) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;
    Object.keys(cycleObj).forEach(k => { cycleObj[k] = false; });
    cycleObj[key] = true;
    if (isHolidayMode) setField('levy_distribution', newDist);
    else setField('distribution', newDist);
  };

  const handleSave = () => {
    if (!form.exception_month || !form.year_from) { setOverlapWarning('Exception Month and Year are required.'); return; }
    if (form.exception_type === 'recurring' && form.year_to && form.year_to < form.year_from) { setOverlapWarning('Year To cannot be earlier than Year From.'); return; }

    const { date_from, date_to } = computeDatesFromIdentity(form);
    const existing = (exceptions ?? []).map(e => ({ id: e.id, date_from: e.date_from, date_to: e.date_to, policy_type: e.policy_type }));
    const overlap = checkDateOverlap(date_from, date_to, existing, editingId || undefined, form.policy_type);
    if (overlap.overlaps) { setOverlapWarning('Overlaps with an existing exception.'); return; }

    const updates = { ...form, date_from, date_to };
    if (!cappingEnabled) { updates.min_amount = null; updates.max_amount = null; }
    if (!updates.override_default) {
      updates.levy_calculation_method = null; updates.levy_calc_flat_enabled = null; updates.levy_calc_flat_percentage = null;
      updates.levy_calc_slab_enabled = null; updates.levy_distribution = null; updates.ssc_include = null;
      updates.ssc_contrib_employee = null; updates.ssc_contrib_employer = null; updates.ssc_contrib_eib = null;
      updates.distribution_enabled = null; updates.include_in_severance = null; updates.min_amount = null; updates.max_amount = null;
      updates.calculation_method = null; updates.calc_flat_enabled = null; updates.calc_flat_percentage = null;
      updates.calc_slab_enabled = null; updates.distribution = null; updates.contrib_employee = null;
      updates.contrib_employer = null; updates.contrib_eir = null; updates.contrib_severance = null;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate({ exception: updates, userCode: userCode || undefined }, { onSuccess: () => setShowForm(false) });
    }
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); }
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
          <CardDescription>Choose an income code to manage its policy exceptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCodeId} onValueChange={(v) => { setSelectedCodeId(v); setShowForm(false); }}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Select an income code..." /></SelectTrigger>
            <SelectContent>
              {incomeCodes.map(c => (<SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Exception List */}
      {selectedCodeId && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  Exceptions for "{selectedCode?.code}"
                </CardTitle>
                <CardDescription>Month-specific overrides for this income code's policy.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate} variant="outline" className="border-orange-300"><Plus className="h-4 w-4 mr-1" />Add Exception</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : !exceptions?.length ? (
              <div className="text-center py-8 text-muted-foreground">No exceptions configured.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Mode</TableHead>
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
                      <TableCell><Badge variant={exc.exception_type === 'recurring' ? 'default' : 'outline'}>{exc.exception_type === 'recurring' ? 'Recurring' : 'One-Time'}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{DATE_ENTRY_MODE_LABELS[exc.date_entry_mode as DateEntryMode] || exc.date_entry_mode}</Badge></TableCell>
                      <TableCell>{MONTH_NAMES[exc.exception_month - 1]}</TableCell>
                      <TableCell>{exc.year_from}{exc.year_to ? ` – ${exc.year_to}` : ''}</TableCell>
                      <TableCell>{exc.override_default ? <Check className="h-4 w-4 text-orange-600" /> : '—'}</TableCell>
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
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-orange-700 dark:text-orange-400">{editingId ? 'Edit' : 'Add'} Exception for "{selectedCode?.code}"</CardTitle>
                <CardDescription>Define month-specific overrides. Enable "Override Default" to customize settings.</CardDescription>
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
                  <SelectContent>{MONTH_NAMES.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}</SelectContent>
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
                    <Label>Year To</Label>
                    <Input type="number" value={form.year_to ?? ''} onChange={(e) => setField('year_to', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                </>
              )}
            </div>

            {/* Date Entry Mode */}
            <SectionLabel>Date Entry Mode</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['dates_mandatory', 'dates_optional', 'no_dates'] as DateEntryMode[]).map(mode => (
                <div key={mode} className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${form.date_entry_mode === mode ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={() => setField('date_entry_mode', mode)}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{DATE_ENTRY_MODE_LABELS[mode]}</span>
                    {form.date_entry_mode === mode && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="h-3 w-3 text-primary-foreground" /></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description ?? ''} onChange={(e) => setField('description', e.target.value || null)} placeholder="Optional description" />
            </div>

            {/* Override toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <Checkbox
                id="ic-override"
                checked={form.override_default}
                onCheckedChange={(v) => {
                  const val = !!v;
                  setField('override_default', val);
                  if (val) {
                    if (isHolidayMode) {
                      if (form.levy_calculation_method == null) setField('levy_calculation_method', 'merge');
                      if (form.levy_distribution == null) setField('levy_distribution', DEFAULT_DISTRIBUTION);
                      if (form.ssc_include == null) setField('ssc_include', true);
                      if (form.ssc_contrib_employee == null) setField('ssc_contrib_employee', true);
                      if (form.ssc_contrib_employer == null) setField('ssc_contrib_employer', true);
                      if (form.levy_include == null) setField('levy_include', true);
                    } else {
                      if (form.calculation_method == null) setField('calculation_method', 'merge');
                      if (form.distribution == null) setField('distribution', DEFAULT_DISTRIBUTION);
                      if (form.contrib_employee == null) setField('contrib_employee', true);
                      if (form.contrib_employer == null) setField('contrib_employer', true);
                    }
                  }
                }}
                className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
              />
              <div>
                <Label htmlFor="ic-override" className="text-sm font-medium cursor-pointer">Override Default Policy</Label>
                <p className="text-xs text-muted-foreground">Customize Levy, SSC, and other settings for this exception.</p>
              </div>
            </div>

            {/* Override sections - simplified for brevity, following same pattern */}
            {form.override_default && (
              <div className="space-y-6 border-l-4 border-orange-300 dark:border-orange-700 pl-4">
                {isHolidayMode ? (
                  <>
                    {/* Levy Rules */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider">Levy Rules</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Include in Levy</Label>
                          <Switch checked={!!form.levy_include} onCheckedChange={(v) => setField('levy_include', v)} />
                        </div>
                      </div>
                      {form.levy_include && (
                        <div className="space-y-3">
                          <RadioOption selected={form.levy_calculation_method === 'merge'} onClick={() => setField('levy_calculation_method', 'merge')} label="Merge" hint="Combined into standard pay run" />
                          <RadioOption selected={form.levy_calculation_method === 'separate'} onClick={() => setField('levy_calculation_method', 'separate')} label="Separate" hint="Isolated calculation" />
                        </div>
                      )}
                    </div>
                    {/* SSC Rules */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wider">SSC Rules</span>
                        <Switch checked={!!form.ssc_include} onCheckedChange={(v) => setField('ssc_include', v)} />
                      </div>
                      {form.ssc_include && (
                        <div className="divide-y">
                          <ContribRow label="Employee" checked={!!form.ssc_contrib_employee} onChange={(v) => setField('ssc_contrib_employee', v)} />
                          <ContribRow label="Employer" checked={!!form.ssc_contrib_employer} onChange={(v) => setField('ssc_contrib_employer', v)} />
                          <ContribRow label="EIB" checked={!!form.ssc_contrib_eib} onChange={(v) => setField('ssc_contrib_eib', v)} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Include in Severance</span>
                      <Switch checked={!!form.include_in_severance} onCheckedChange={(v) => setField('include_in_severance', v)} />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Include in Levy toggle for no_dates mode */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <span className="text-sm font-medium">Include in Levy</span>
                        <p className="text-xs text-muted-foreground">When OFF, this income code amount will be excluded from levy calculations</p>
                      </div>
                      <Switch checked={form.include_in_levy !== false} onCheckedChange={(v) => setField('include_in_levy', v)} />
                    </div>
                    {/* Bonus-style overrides */}
                    <div className={`border rounded-lg p-4 space-y-3 ${form.include_in_levy === false ? 'opacity-50 pointer-events-none' : ''}`}>
                      <span className="text-sm font-semibold uppercase tracking-wider">Calculation Method {form.include_in_levy === false && <Badge variant="outline" className="text-xs ml-2">Disabled — Levy excluded</Badge>}</span>
                      <RadioOption selected={form.calculation_method === 'merge'} onClick={() => setField('calculation_method', 'merge')} label="Merge" hint="Combined into standard pay run" />
                      <RadioOption selected={form.calculation_method === 'separate'} onClick={() => setField('calculation_method', 'separate')} label="Separate" hint="Isolated calculation" />
                    </div>
                    <div className="border rounded-lg divide-y">
                      <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={(v) => setField('contrib_employee', v)} />
                      <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={(v) => setField('contrib_employer', v)} />
                      <ContribRow label="EIB" checked={!!form.contrib_eir} onChange={(v) => setField('contrib_eir', v)} />
                      <ContribRow label="Severance" checked={!!form.contrib_severance} onChange={(v) => setField('contrib_severance', v)} />
                    </div>
                  </>
                )}

                {/* Capping */}
                <div className="flex items-center gap-3">
                  <Checkbox checked={cappingEnabled} onCheckedChange={(v) => { setCappingEnabled(!!v); if (!v) { setField('min_amount', null); setField('max_amount', null); } }} />
                  <span className="text-sm font-medium">Enable Capping</span>
                </div>
                {cappingEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Min Amount</Label><Input type="number" value={form.min_amount ?? ''} onChange={e => setField('min_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                    <div className="space-y-1.5"><Label>Max Amount</Label><Input type="number" value={form.max_amount ?? ''} onChange={e => setField('max_amount', e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                )}
              </div>
            )}

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
            <AlertDialogDescription>This will permanently delete this exception.</AlertDialogDescription>
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

function RadioOption({ selected, onClick, label, hint }: { selected: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-border bg-muted/30 hover:bg-muted/50'}`} onClick={onClick}>
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'}`}>
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
