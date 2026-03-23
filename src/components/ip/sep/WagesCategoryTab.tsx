import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { SelfEmployCategory } from '@/services/selfEmployedService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IncomeCategoryOption {
  category_code: string;
  wage_upper: number | null;
}

interface WagesCategoryTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const WagesCategoryTab: React.FC<WagesCategoryTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, categories, addCategory, updateCategory, deleteCategory, loading } = selfEmployed;
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SelfEmployCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SelfEmployCategory | null>(null);
  const [incomeCatOptions, setIncomeCatOptions] = useState<IncomeCategoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    selected_activity_seq: '',
    effective_start_date: '',
    wage_category: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoadingOptions(true);
      try {
        const { data, error } = await (supabase as any)
          .from('tb_income_cat')
          .select('category_code, wage_upper')
          .order('category_code');
        if (error) throw error;
        setIncomeCatOptions((data || []) as IncomeCategoryOption[]);
      } catch (err: any) {
        console.error('Failed to load income category options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  const calculatedEndDate = useMemo(() => {
    if (!form.effective_start_date) return null;
    return addMonths(new Date(form.effective_start_date), 6);
  }, [form.effective_start_date]);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categories> = {};
    for (const cat of categories) {
      if (!groups[cat.activity_seq_no]) groups[cat.activity_seq_no] = [];
      groups[cat.activity_seq_no].push(cat);
    }
    return groups;
  }, [categories]);

  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({ selected_activity_seq: '', effective_start_date: '', wage_category: '' });
    setFormError(null);
    setShowDialog(true);
  };

  const openEditDialog = (cat: SelfEmployCategory) => {
    setEditingRecord(cat);
    setForm({
      selected_activity_seq: cat.activity_seq_no,
      effective_start_date: cat.effective_start_date ? cat.effective_start_date.split('T')[0] : '',
      wage_category: cat.wage_category != null ? String(cat.wage_category) : '',
    });
    setFormError(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!selfRefNo || !form.selected_activity_seq || !form.effective_start_date || !form.wage_category) {
      setFormError('All fields are required.');
      return;
    }

    const endDateStr = calculatedEndDate!.toISOString();

    try {
      if (editingRecord) {
        await updateCategory(
          editingRecord.self_ref_no,
          editingRecord.activity_seq_no,
          editingRecord.effective_start_date,
          {
            effective_start_date: form.effective_start_date,
            effective_end_date: endDateStr,
            wage_category: parseFloat(form.wage_category),
            activity_seq_no: form.selected_activity_seq,
          }
        );
      } else {
        await addCategory({
          ssn,
          self_ref_no: selfRefNo,
          activity_seq_no: form.selected_activity_seq,
          effective_start_date: form.effective_start_date,
          effective_end_date: endDateStr,
          wage_category: parseFloat(form.wage_category),
        });
      }
      setShowDialog(false);
      setEditingRecord(null);
    } catch (err: any) {
      // error shown via toast from hook
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(
      deleteTarget.self_ref_no,
      deleteTarget.activity_seq_no,
      deleteTarget.effective_start_date
    );
    setDeleteTarget(null);
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Register as self-employed first to manage wage categories.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {isEditable && (
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" /> Add Wage Category
          </Button>
        )}
      </div>

      {Object.keys(groupedCategories).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No wage categories assigned
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedCategories).map(([seqNo, cats]) => {
        const matchedActivity = activities.find(a => a.activity_seq_no === seqNo);
        const groupLabel = matchedActivity
          ? `Seq. ${seqNo} - ${matchedActivity.activity_type || 'N/A'}`
          : `Seq. ${seqNo}`;

        return (
          <Card key={seqNo}>
            <CardContent className="p-0">
              <div className="px-4 py-2 bg-muted/50 border-b text-sm font-medium text-foreground">
                {groupLabel}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Self Ref. No.</TableHead>
                    <TableHead>Effective Start</TableHead>
                    <TableHead>Effective End</TableHead>
                    <TableHead>Wage Category</TableHead>
                    {isEditable && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cats.map((cat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{cat.self_ref_no}</TableCell>
                      <TableCell>{cat.effective_start_date ? formatDisplayDate(cat.effective_start_date) : '-'}</TableCell>
                      <TableCell>{cat.effective_end_date ? formatDisplayDate(cat.effective_end_date) : '-'}</TableCell>
                      <TableCell>{cat.wage_category ?? '-'}</TableCell>
                      {isEditable && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(cat)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(cat)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Wage Category' : 'Add Wage Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            <div>
              <Label>Activity *</Label>
              <Select
                value={form.selected_activity_seq}
                onValueChange={(val) => setForm({ ...form, selected_activity_seq: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((act) => (
                    <SelectItem key={act.activity_seq_no} value={act.activity_seq_no}>
                      Seq {act.activity_seq_no} — {act.activity_type || 'N/A'} (commenced {act.date_commenced ? formatDisplayDate(act.date_commenced) : '—'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effective Start Date *</Label>
              <Input
                type="date"
                value={form.effective_start_date}
                onChange={(e) => setForm({ ...form, effective_start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Effective End Date (auto-calculated)</Label>
              <Input
                type="text"
                readOnly
                disabled
                value={calculatedEndDate ? format(calculatedEndDate, 'dd/MM/yyyy') : '—'}
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Wage Category *</Label>
              <Select
                value={form.wage_category}
                onValueChange={(val) => setForm({ ...form, wage_category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? 'Loading...' : 'Select wage category'} />
                </SelectTrigger>
                <SelectContent>
                  {incomeCatOptions.map((ic) => (
                    <SelectItem key={ic.category_code} value={String(ic.wage_upper)}>
                      Cat {ic.category_code} — ${Number(ic.wage_upper ?? 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.effective_start_date || !form.wage_category || loading}>
              {loading ? 'Saving...' : editingRecord ? 'Update' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wage Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the wage category
              {deleteTarget?.wage_category ? ` (${deleteTarget.wage_category})` : ''}
              {deleteTarget?.effective_start_date ? ` effective from ${formatDisplayDate(deleteTarget.effective_start_date)}` : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
