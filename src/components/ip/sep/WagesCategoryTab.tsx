import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

interface WagesCategoryTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const WagesCategoryTab: React.FC<WagesCategoryTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, categories, addCategory, loading } = selfEmployed;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({
    effective_start_date: '',
    wage_category: '',
  });

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  const handleAdd = async () => {
    if (!selectedActivity || !selfRefNo || !form.effective_start_date || !form.wage_category) return;

    // Auto-calculate end date (+6 months)
    const startDate = new Date(form.effective_start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);

    await addCategory({
      ssn,
      self_ref_no: selfRefNo,
      activity_seq_no: selectedActivity.activity_seq_no,
      effective_start_date: form.effective_start_date,
      effective_end_date: endDate.toISOString(),
      wage_category: parseFloat(form.wage_category),
    });
    setShowAddDialog(false);
    setForm({ effective_start_date: '', wage_category: '' });
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
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
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
            <div>
              <Label>Effective Start Date *</Label>
              <Input type="date" value={form.effective_start_date} onChange={(e) => setForm({ ...form, effective_start_date: e.target.value })} />
            </div>
            <div>
              <Label>Wage Category *</Label>
              <Input type="number" step="0.01" value={form.wage_category} onChange={(e) => setForm({ ...form, wage_category: e.target.value })} placeholder="e.g., 3.00" />
            </div>
            {form.effective_start_date && (
              <div className="text-sm text-muted-foreground">
                End date will be auto-calculated as: {(() => {
                  const d = new Date(form.effective_start_date);
                  d.setMonth(d.getMonth() + 6);
                  return format(d, 'dd/MM/yyyy');
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.effective_start_date || !form.wage_category || loading}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
