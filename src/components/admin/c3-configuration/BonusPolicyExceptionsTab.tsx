import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Info, Save, X, Check, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBonusPolicyExceptions, useCreateBonusPolicyException, useUpdateBonusPolicyException, useDeleteBonusPolicyException, checkDateOverlap } from '@/hooks/useBonusPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import MonthYearPicker from '@/components/c3/MonthYearPicker';
import { formatDisplayDate, parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';
import type { BonusPolicyException, BonusDistribution, ExceptionType, CalculationMethod } from '@/types/bonusPolicy';
import { MONTH_NAMES, DEFAULT_DISTRIBUTION } from '@/types/bonusPolicy';

const EMPTY_EXCEPTION: Omit<BonusPolicyException, 'id' | 'created_on' | 'modified_on'> = {
  date_from: formatDateForStorage(new Date()),
  date_to: null,
  exception_type: 'onetime',
  exception_month: new Date().getMonth() + 1,
  year_from: new Date().getFullYear(),
  year_to: null,
  override_default: false,
  include_in_levy: true,
  include_in_severance: true,
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

export function BonusPolicyExceptionsTab() {
  const { data: exceptions, isLoading } = useBonusPolicyExceptions();
  const createMutation = useCreateBonusPolicyException();
  const updateMutation = useUpdateBonusPolicyException();
  const deleteMutation = useDeleteBonusPolicyException();
  const { userCode } = useUserCode();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BonusPolicyException, 'id' | 'created_on' | 'modified_on'>>(EMPTY_EXCEPTION);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startAdd = () => {
    setForm({ ...EMPTY_EXCEPTION });
    setIsAdding(true);
    setEditingId(null);
  };

  const openEdit = (exc: BonusPolicyException) => {
    setEditingId(exc.id);
    const { id, created_on, modified_on, ...rest } = exc;
    setForm(rest);
    setIsAdding(false);
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (isAdding) {
      await createMutation.mutateAsync({ exception: form, userCode });
    } else if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, updates: form, userCode });
    }
    cancel();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isEditing = isAdding || !!editingId;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Bonus Policy Exceptions
              </CardTitle>
              <CardDescription>
                Define month-specific overrides for bonus policy calculations
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={startAdd} variant="outline" className="border-amber-300">
                <Plus className="h-4 w-4 mr-2" />
                Add Exception
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="border rounded-lg p-4 mb-6 bg-amber-50/50 dark:bg-amber-950/20 space-y-4">
              <h4 className="font-medium">{isAdding ? 'New Exception' : 'Edit Exception'}</h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Exception Type</Label>
                  <Select value={form.exception_type} onValueChange={(v) => updateField('exception_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onetime">One-Time</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exception Month</Label>
                  <Select value={String(form.exception_month)} onValueChange={(v) => updateField('exception_month', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year From</Label>
                  <Input type="number" value={form.year_from} onChange={(e) => updateField('year_from', parseInt(e.target.value))} />
                </div>

                <div className="space-y-2">
                  <Label>Year To {form.exception_type === 'onetime' && '(optional)'}</Label>
                  <Input type="number" value={form.year_to ?? ''} onChange={(e) => updateField('year_to', e.target.value ? parseInt(e.target.value) : null)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <MonthYearPicker
                    value={(() => { const d = parseDateSafe(form.date_from); return d ? { year: d.getFullYear(), month: d.getMonth() + 1 } : undefined; })()}
                    onChange={(v) => updateField('date_from', formatDateForStorage(new Date(v.year, v.month - 1, 1)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To (optional)</Label>
                  <MonthYearPicker
                    value={(() => { const d = form.date_to ? parseDateSafe(form.date_to) : null; return d ? { year: d.getFullYear(), month: d.getMonth() + 1 } : undefined; })()}
                    onChange={(v) => updateField('date_to', formatDateForStorage(new Date(v.year, v.month - 1, 1)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value || null)} placeholder="Optional description" />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.override_default} onCheckedChange={(v) => updateField('override_default', v)} />
                  <Label className="text-sm">Override Default Policy</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={true} disabled />
                  <Label className="text-sm opacity-70">Include in Levy</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={true} disabled />
                  <Label className="text-sm opacity-70">Severance Payment</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => updateField('is_active', v)} />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} size="sm">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button onClick={cancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!exceptions?.length && !isEditing ? (
            <div className="text-center py-8 text-muted-foreground">
              No bonus policy exceptions configured.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year(s)</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(exceptions || []).map((exc) => (
                  <TableRow key={exc.id} className={editingId === exc.id ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <TableCell>
                      <Badge variant={exc.exception_type === 'recurring' ? 'default' : 'outline'}>
                        {exc.exception_type === 'recurring' ? 'Recurring' : 'One-Time'}
                      </Badge>
                    </TableCell>
                    <TableCell>{MONTH_NAMES[exc.exception_month - 1]}</TableCell>
                    <TableCell>{exc.year_from}{exc.year_to ? ` - ${exc.year_to}` : ''}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDisplayDate(exc.date_from)} — {exc.date_to ? formatDisplayDate(exc.date_to) : 'Open'}
                    </TableCell>
                    <TableCell>
                      {exc.override_default ? <Check className="h-4 w-4 text-amber-600" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exc.is_active ? 'default' : 'secondary'}>
                        {exc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{exc.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(exc)} disabled={isEditing}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(exc.id)} disabled={isEditing}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exception</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bonus policy exception. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
