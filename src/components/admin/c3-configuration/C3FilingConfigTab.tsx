import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFilingConfigPeriods, useUpsertFilingConfigPeriod, useDeactivateFilingConfigPeriod } from '@/hooks/useFilingConfigPeriods';
import { FilingConfigPeriod, FilingConfigPeriodFormData } from '@/types/filingConfigPeriod';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useUserCode } from '@/hooks/useUserCode';

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
  const { formatDate } = useDateFormat();
  const { userCode } = useUserCode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FilingConfigPeriodFormData>({ ...DEFAULT_FORM });
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

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
    setDialogOpen(true);
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
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.date_from) return;
    upsertMutation.mutate(
      {
        id: editingId || undefined,
        date_from: form.date_from,
        date_to: form.date_to || null,
        week_start_day: form.week_start_day,
        filing_window_unit: form.filing_window_unit,
        filing_window_value: form.filing_window_value,
        penalty_initial_threshold: form.penalty_initial_threshold,
        penalty_subsequent_threshold: form.penalty_subsequent_threshold,
        user_code: userCode || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingId(null);
        },
      }
    );
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

  return (
    <>
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
          <Button onClick={openCreate} size="sm" className="gap-1">
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
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} disabled={!p.is_active}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {p.is_active && (
                            <Button size="sm" variant="ghost" onClick={() => setDeactivateId(p.id)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Filing Configuration Period</DialogTitle>
            <DialogDescription>
              Define the effective date range and filing parameters for this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_from">Date From <span className="text-destructive">*</span></Label>
                <Input
                  id="date_from"
                  type="date"
                  value={form.date_from}
                  onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_to">Date To <span className="text-muted-foreground text-xs">(leave empty for open-ended)</span></Label>
                <Input
                  id="date_to"
                  type="date"
                  value={form.date_to || ''}
                  onChange={(e) => setForm({ ...form, date_to: e.target.value || '' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week Start Day</Label>
                <Select value={String(form.week_start_day)} onValueChange={(v) => setForm({ ...form, week_start_day: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filing Window Unit</Label>
                <Select value={String(form.filing_window_unit)} onValueChange={(v) => setForm({ ...form, filing_window_unit: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Filing Window Value</Label>
                <Input
                  type="number" min={1}
                  value={form.filing_window_value}
                  onChange={(e) => setForm({ ...form, filing_window_value: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Threshold</Label>
                <Input
                  type="number" min={1}
                  value={form.penalty_initial_threshold}
                  onChange={(e) => setForm({ ...form, penalty_initial_threshold: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsequent Threshold</Label>
                <Input
                  type="number" min={1}
                  value={form.penalty_subsequent_threshold}
                  onChange={(e) => setForm({ ...form, penalty_subsequent_threshold: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending || !form.date_from}>
              {upsertMutation.isPending ? 'Saving...' : 'Save Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
