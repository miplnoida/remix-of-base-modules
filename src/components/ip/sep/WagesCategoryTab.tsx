import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, AlertCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { SelfEmployedService } from '@/services/selfEmployedService';
import { toast } from 'sonner';

interface WagesCategoryTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const WagesCategoryTab: React.FC<WagesCategoryTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, categories, addCategory, loading } = selfEmployed;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [wageCatOptions, setWageCatOptions] = useState<number[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    effective_start_date: '',
    wage_category: '',
  });

  // Load wage category dropdown options from tb_self_emp_contrib_rate
  useEffect(() => {
    const load = async () => {
      setLoadingOptions(true);
      try {
        const options = await SelfEmployedService.getWageCategoryOptions();
        setWageCatOptions(options);
      } catch (err: any) {
        console.error('Failed to load wage category options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  // Auto-calculated end date
  const calculatedEndDate = useMemo(() => {
    if (!form.effective_start_date) return null;
    return addMonths(new Date(form.effective_start_date), 6);
  }, [form.effective_start_date]);

  const handleAdd = async () => {
    setFormError(null);
    if (!selectedActivity || !selfRefNo || !form.effective_start_date || !form.wage_category) {
      setFormError('All fields are required.');
      return;
    }

    const endDateStr = calculatedEndDate!.toISOString();

    try {
      await addCategory({
        ssn,
        self_ref_no: selfRefNo,
        activity_seq_no: selectedActivity.activity_seq_no,
        effective_start_date: form.effective_start_date,
        effective_end_date: endDateStr,
        wage_category: parseFloat(form.wage_category),
      });
      setShowAddDialog(false);
      setForm({ effective_start_date: '', wage_category: '' });
    } catch (err: any) {
      // The overlap error from service will be shown via toast from the hook
    }
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing categories for Activity Seq: <strong>{selectedActivity?.activity_seq_no || '-'}</strong>
        </div>
        {isEditable && (
          <Button variant="outline" size="sm" onClick={() => { setShowAddDialog(true); setFormError(null); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Wage Category
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSN</TableHead>
                <TableHead>SREF</TableHead>
                <TableHead>Activity Seq</TableHead>
                <TableHead>Effective Start</TableHead>
                <TableHead>Effective End</TableHead>
                <TableHead>Wage Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{cat.ssn}</TableCell>
                  <TableCell className="font-mono">{cat.self_ref_no}</TableCell>
                  <TableCell className="font-mono">{cat.activity_seq_no}</TableCell>
                  <TableCell>{cat.effective_start_date ? format(new Date(cat.effective_start_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{cat.effective_end_date ? format(new Date(cat.effective_end_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{cat.wage_category ?? '-'}</TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No wage categories assigned
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wage Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
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
                  {wageCatOptions.map((wc) => (
                    <SelectItem key={wc} value={String(wc)}>
                      {wc.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.effective_start_date || !form.wage_category || loading}>
              {loading ? 'Saving...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
