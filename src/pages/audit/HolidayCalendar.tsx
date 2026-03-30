import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { PageShell } from '@/components/common';
import { DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useIAHolidays, useIAHolidayMutations } from '@/hooks/useAuditData';
import { formatDateForDisplay, formatDateForStorage } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';
import { format, parseISO, getMonth } from 'date-fns';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HolidayCalendar() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: holidays = [], isLoading } = useIAHolidays(selectedYear);
  const { create, update, remove } = useIAHolidayMutations();
  const { userCode } = useUserCode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [form, setForm] = useState({ name: '', date: '', country: 'Saint Kitts and Nevis', is_ssb_specific: false });

  const openAdd = () => {
    setEditingHoliday(null);
    setForm({ name: '', date: '', country: 'Saint Kitts and Nevis', is_ssb_specific: false });
    setDialogOpen(true);
  };

  const openEdit = (h: any) => {
    setEditingHoliday(h);
    setForm({ name: h.name, date: h.date, country: h.country || 'Saint Kitts and Nevis', is_ssb_specific: h.is_ssb_specific || false });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      year: new Date(form.date).getFullYear(),
      is_active: true,
      ...(editingHoliday ? { updated_by: userCode } : { created_by: userCode }),
    };
    if (editingHoliday) {
      update.mutate({ id: editingHoliday.id, ...payload });
    } else {
      create.mutate(payload);
    }
    setDialogOpen(false);
  };

  // Monthly distribution for mini calendar
  const monthlyDistribution = MONTHS.map((month, idx) => {
    const count = holidays.filter((h: any) => h.date && getMonth(parseISO(h.date)) === idx).length;
    return { month, count };
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'date', header: 'Date', render: (r) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-medium">{formatDateForDisplay(r.date)}</span>
        <Badge variant="outline" className="text-[10px]">{r.date ? format(parseISO(r.date), 'EEEE') : ''}</Badge>
      </div>
    )},
    { key: 'name', header: 'Holiday Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'country', header: 'Country' },
    { key: 'is_ssb_specific', header: 'Type', render: (r) => (
      <Badge variant={r.is_ssb_specific ? 'default' : 'secondary'}>
        {r.is_ssb_specific ? 'SSB Specific' : 'Public Holiday'}
      </Badge>
    )},
  ];

  return (
    <PageShell
      title="Holiday Calendar"
      subtitle="Manage public holidays and SSB-specific non-working days"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Holiday Calendar' }]}
      isLoading={isLoading}
    >
      {/* Year selector + stats */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{holidays.length} holidays in {selectedYear}</Badge>
        <div className="ml-auto">
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Holiday
          </Button>
        </div>
      </div>

      {/* Monthly distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {monthlyDistribution.map(({ month, count }) => (
              <div key={month} className={`text-center rounded-lg p-2 border ${count > 0 ? 'bg-primary/10 border-primary/20' : 'bg-muted/30 border-border/50'}`}>
                <p className="text-xs text-muted-foreground">{month}</p>
                <p className={`text-lg font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Holiday table */}
      <Card>
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={holidays}
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(row.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            emptyMessage="No holidays found for this year."
          />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Independence Day" />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ssb_specific" checked={form.is_ssb_specific} onChange={(e) => setForm({ ...form, is_ssb_specific: e.target.checked })} />
              <Label htmlFor="ssb_specific">SSB-Specific Holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.date}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
