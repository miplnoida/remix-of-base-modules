import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Calendar, Save, X, Info, AlertTriangle } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFilingConfigPeriods, useUpsertFilingConfigPeriod, useDeactivateFilingConfigPeriod, useAnalyzeFilingConfigChange } from '@/hooks/useFilingConfigPeriods';
import { FilingConfigPeriod, FilingConfigPeriodFormData, FilingConfigAnalysis } from '@/types/filingConfigPeriod';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const UNIT_OPTIONS = [
  { value: '1', label: 'Months' },
  { value: '2', label: 'Days' },
];

const PARAM_ROWS = [
  { key: 'week_start_day', label: 'Week Start Day', description: 'The day the contribution week begins', type: 'weekday' },
  { key: 'filing_window_unit', label: 'Filing Window Unit', description: 'Unit of measure for the filing window (Months or Days)', type: 'unit' },
  { key: 'filing_window_value', label: 'Allowed Filing Window', description: 'Number of units allowed for filing after the period ends', type: 'number' },
  { key: 'penalty_initial_threshold', label: 'Initial Penalty Threshold', description: 'Number of periods before the initial penalty phase ends', type: 'number' },
  { key: 'penalty_subsequent_threshold', label: 'Subsequent Penalty Period', description: 'Number of periods for the subsequent penalty phase', type: 'number' },
] as const;

const DEFAULT_FORM: FilingConfigPeriodFormData = {
  date_from: '',
  date_to: '',
  week_start_day: 1,
  filing_window_unit: 1,
  filing_window_value: 1,
  penalty_initial_threshold: 1,
  penalty_subsequent_threshold: 12,
};

function getPeriodStatus(p: FilingConfigPeriod): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!p.is_active) return { label: 'Inactive', variant: 'destructive' };
  const today = new Date().toISOString().slice(0, 10);
  if (p.date_to === null) {
    if (p.date_from <= today) return { label: 'Active (Open-ended)', variant: 'default' };
    return { label: 'Future (Open-ended)', variant: 'outline' };
  }
  if (p.date_from <= today && p.date_to >= today) return { label: 'Active', variant: 'default' };
  if (p.date_to < today) return { label: 'Historical', variant: 'secondary' };
  return { label: 'Future', variant: 'outline' };
}

export function C3FilingConfigTab() {
  const { data: periods, isLoading, error } = useFilingConfigPeriods();
  const upsertMutation = useUpsertFilingConfigPeriod();
  const deactivateMutation = useDeactivateFilingConfigPeriod();
  const analyzeMutation = useAnalyzeFilingConfigChange();
  const { formatDate } = useDateFormat();
  const { userCode } = useUserCode();

  const [formMode, setFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FilingConfigPeriodFormData>({ ...DEFAULT_FORM });
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // Split confirmation state
  const [splitAnalysis, setSplitAnalysis] = useState<FilingConfigAnalysis | null>(null);
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p className="font-medium">Failed to load filing configuration</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setFormMode('create');
  };

  const openEdit = (p: FilingConfigPeriod) => {
    setEditingId(p.id);
    setForm({
      date_from: p.date_from,
      date_to: p.date_to || '',
      week_start_day: p.week_start_day,
      filing_window_unit: p.filing_window_unit,
      filing_window_value: p.filing_window_value,
      penalty_initial_threshold: p.penalty_initial_threshold,
      penalty_subsequent_threshold: p.penalty_subsequent_threshold,
    });
    setFormMode('edit');
  };

  const handleCancel = () => {
    setFormMode('hidden');
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
  };

  const getFormParams = () => ({
    id: editingId || undefined,
    date_from: form.date_from,
    date_to: form.date_to || null,
    week_start_day: form.week_start_day,
    filing_window_unit: form.filing_window_unit,
    filing_window_value: form.filing_window_value,
    penalty_initial_threshold: form.penalty_initial_threshold,
    penalty_subsequent_threshold: form.penalty_subsequent_threshold,
  });

  const handleSave = async () => {
    if (!form.date_from) return;

    try {
      const analysis = await analyzeMutation.mutateAsync(getFormParams());

      if (analysis.action === 'error') {
        toast.error(analysis.message || 'Validation failed');
        return;
      }

      if (analysis.action === 'split') {
        setSplitAnalysis(analysis);
        setShowSplitConfirm(true);
        return;
      }

      // Normal save
      upsertMutation.mutate(
        {
          ...getFormParams(),
          user_code: userCode || undefined,
          force_split: false,
        },
        { onSuccess: handleCancel }
      );
    } catch {
      // Error already handled by mutation
    }
  };

  const handleConfirmSplit = () => {
    setShowSplitConfirm(false);
    upsertMutation.mutate(
      {
        ...getFormParams(),
        user_code: userCode || undefined,
        force_split: true,
      },
      {
        onSuccess: () => {
          setSplitAnalysis(null);
          handleCancel();
        },
      }
    );
  };

  const handleCancelSplit = () => {
    setShowSplitConfirm(false);
    setSplitAnalysis(null);
  };

  const handleDeactivate = () => {
    if (!deactivateId) return;
    deactivateMutation.mutate(
      { id: deactivateId, user_code: userCode || undefined },
      { onSuccess: () => setDeactivateId(null) }
    );
  };

  const unitLabel = (v: number) => UNIT_OPTIONS.find(o => o.value === String(v))?.label || String(v);
  const weekdayLabel = (v: number) => WEEKDAY_OPTIONS.find(o => o.value === String(v))?.label || String(v);

  const getDynamicSuffix = (key: string, unitValue: number): string => {
    if (['filing_window_value', 'penalty_initial_threshold', 'penalty_subsequent_threshold'].includes(key)) {
      return unitValue === 2 ? 'days' : 'months';
    }
    return '';
  };

  const updateFormField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const isSaving = upsertMutation.isPending || analyzeMutation.isPending;

  return (
    <>
      {/* Period List */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Filing & Penalties Configuration
            </CardTitle>
            <CardDescription>
              Manage filing configuration periods with date ranges. Only one open-ended period is allowed at a time.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1" disabled={formMode !== 'hidden'}>
            <Plus className="h-4 w-4" /> Add Period
          </Button>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date From</TableHead>
                  <TableHead className="min-w-[100px]">Date To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Week Start</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Initial Threshold</TableHead>
                  <TableHead>Subsequent Threshold</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!periods || periods.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No filing configuration periods found. Click "Add Period" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {periods?.map((p) => {
                  const status = getPeriodStatus(p);
                  const isHistorical = status.label === 'Historical' || !p.is_active;
                  return (
                    <TableRow key={p.id} className={isHistorical ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{formatDate(p.date_from)}</TableCell>
                      <TableCell>{p.date_to ? formatDate(p.date_to) : <span className="text-muted-foreground italic">Open-ended</span>}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>{weekdayLabel(p.week_start_day)}</TableCell>
                      <TableCell>{p.filing_window_value} {unitLabel(p.filing_window_unit)}</TableCell>
                      <TableCell>{p.penalty_initial_threshold} {unitLabel(p.filing_window_unit)}</TableCell>
                      <TableCell>{p.penalty_subsequent_threshold} {unitLabel(p.filing_window_unit)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} disabled={!p.is_active || formMode !== 'hidden'}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {p.is_active && (
                            <Button size="sm" variant="ghost" onClick={() => setDeactivateId(p.id)} disabled={formMode !== 'hidden'}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inline Add/Edit Card */}
      {formMode !== 'hidden' && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{formMode === 'create' ? 'New' : 'Edit'} Filing Configuration Period</CardTitle>
              <CardDescription>
                Define the effective date range and filing parameters for this period.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving || !form.date_from} className="gap-1">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] sm:w-[300px]">Parameter</TableHead>
                    <TableHead className="min-w-[200px] sm:w-[250px]">Value</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Date From */}
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Date From</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-[300px]"><p>The start date for this configuration period (required)</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={form.date_from}
                        onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                        className="w-44"
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground text-sm">date</span>
                    </TableCell>
                  </TableRow>

                  {/* Date To */}
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Date To</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-[300px]"><p>The end date for this period. Leave empty for an open-ended (current) period.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={form.date_to || ''}
                        onChange={(e) => setForm({ ...form, date_to: e.target.value || '' })}
                        className="w-44"
                        placeholder="Open-ended"
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground text-sm">date (optional)</span>
                    </TableCell>
                  </TableRow>

                  {/* 5 config parameters */}
                  {PARAM_ROWS.map((param) => {
                    const value = form[param.key as keyof FilingConfigPeriodFormData];
                    const suffix = getDynamicSuffix(param.key, form.filing_window_unit);
                    return (
                      <TableRow key={param.key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{param.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                <TooltipContent className="max-w-[300px]"><p>{param.description}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell>
                          {param.type === 'weekday' ? (
                            <Select value={String(value)} onValueChange={(v) => updateFormField(param.key, v)}>
                              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WEEKDAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : param.type === 'unit' ? (
                            <Select value={String(value)} onValueChange={(v) => updateFormField(param.key, v)}>
                              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" min={1}
                                value={value as number}
                                onChange={(e) => updateFormField(param.key, e.target.value)}
                                className="w-24"
                              />
                              {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="capitalize text-muted-foreground text-sm">{param.type === 'weekday' || param.type === 'unit' ? 'selection' : 'number'}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Period</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the filing configuration period. It will remain in the history but will no longer be used for lookups. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={deactivateMutation.isPending}>
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Split Confirmation Dialog */}
      <AlertDialog open={showSplitConfirm} onOpenChange={(open) => !open && handleCancelSplit()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Historical Period Protection
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
                <p>
                  The configuration you are editing covers dates before the 1st of the current month. To protect historical data, the system will perform the following changes:
                </p>

                {splitAnalysis && (
                  <>
                    {/* Old record summary */}
                    <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1">
                      <p className="font-semibold text-foreground">Existing Configuration (will be preserved)</p>
                      <p>
                        Period: <span className="font-medium">{splitAnalysis.old_record_original_from}</span> → will be closed on <span className="font-medium text-destructive">{splitAnalysis.old_record_new_end}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Original end date: {splitAnalysis.old_record_original_to}
                      </p>
                    </div>

                    {/* New record summary */}
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
                      <p className="font-semibold text-foreground">New Configuration (will be created)</p>
                      <p>
                        Period: <span className="font-medium text-primary">{splitAnalysis.new_record_start}</span> → <span className="font-medium">{splitAnalysis.new_record_end}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your updated values will apply from the 1st of the current month onward.
                      </p>
                    </div>
                  </>
                )}

                <p className="text-muted-foreground">
                  Do you want to proceed with this change?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSplit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSplit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                'Confirm & Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
