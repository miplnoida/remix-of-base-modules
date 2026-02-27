import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useIAHolidays, useIAHolidayMutations } from '@/hooks/useAuditData';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { PageShell, DataTable, EntityModal, ConfirmDialog, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

export default function HolidayManagement() {
  const { profile } = useSupabaseAuth();
  const { data: holidays = [], isLoading, isError } = useIAHolidays();
  const { create, update, remove } = useIAHolidayMutations();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', country: 'St. Kitts & Nevis', is_ssb_specific: false });

  const resetForm = () => setForm({ name: '', date: '', country: 'St. Kitts & Nevis', is_ssb_specific: false });
  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAdd = () => {
    if (!form.name || !form.date) return;
    create.mutate({ ...form, created_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setIsAddOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editHoliday || !form.name || !form.date) return;
    update.mutate({ id: editHoliday.id, ...form, updated_by: (profile as any)?.user_code || '' }, { onSuccess: () => { setEditHoliday(null); resetForm(); } });
  };

  const openEdit = (h: any) => {
    setForm({ name: h.name, date: h.date, country: h.country || 'St. Kitts & Nevis', is_ssb_specific: h.is_ssb_specific || false });
    setEditHoliday(h);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'date', header: 'Date', render: (row) => <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div> },
    { key: 'name', header: 'Holiday Name' },
    { key: 'country', header: 'Country/Region' },
    { key: 'type', header: 'Type', render: (row) => row.is_ssb_specific ? <Badge variant="outline">SSB-Specific</Badge> : <StatusBadge status="Public Holiday" /> },
  ];

  const formFields = (
    <div className="space-y-4">
      <div><Label>Holiday Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Independence Day" /></div>
      <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
      <div><Label>Country/Region</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="St. Kitts & Nevis" /></div>
      <div className="flex items-center space-x-2">
        <Checkbox id="ssbSpecific" checked={form.is_ssb_specific} onCheckedChange={c => setForm(f => ({ ...f, is_ssb_specific: !!c }))} />
        <Label htmlFor="ssbSpecific" className="cursor-pointer">SSB-specific holiday</Label>
      </div>
    </div>
  );

  return (
    <PageShell
      title="Holiday Management"
      subtitle="Manage public holidays and SSB-specific holidays"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Holiday Management' }]}
      isLoading={isLoading}
      error={isError ? 'Failed to load holidays' : null}
      actions={<Button onClick={() => { resetForm(); setIsAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Holiday</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Public Holidays</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.filter(h => !h.is_ssb_specific).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">SSB Holidays</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.filter(h => h.is_ssb_specific).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.length}</div></CardContent></Card>
      </div>

      <DataTable
        columns={columns}
        data={sortedHolidays}
        onEdit={(row) => openEdit(row)}
        renderActions={(row) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Calendar className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
        emptyMessage='No holidays found. Click "Add Holiday" to get started.'
      />

      <EntityModal open={isAddOpen} onOpenChange={o => { if (!o) resetForm(); setIsAddOpen(o); }} title="Add New Holiday" mode="create" onSave={handleAdd} isSaving={create.isPending} saveLabel="Add Holiday">
        {formFields}
      </EntityModal>

      <EntityModal open={editHoliday !== null} onOpenChange={o => { if (!o) { setEditHoliday(null); resetForm(); } }} title="Edit Holiday" mode="edit" onSave={handleEdit} isSaving={update.isPending} saveLabel="Save Changes">
        {formFields}
      </EntityModal>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)} title="Delete Holiday" description="Are you sure you want to delete this holiday?" onConfirm={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }} variant="destructive" />
    </PageShell>
  );
}
