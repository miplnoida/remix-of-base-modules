import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Plus, Calendar, Edit, Trash2, Loader2 } from 'lucide-react';
import { useIAHolidays, useIAHolidayMutations } from '@/hooks/useAuditData';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Checkbox } from '@/components/ui/checkbox';

export default function HolidayManagement() {
  const { profile } = useSupabaseAuth();
  const { data: holidays = [], isLoading, isError, refetch } = useIAHolidays();
  const { create, update, remove } = useIAHolidayMutations();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<any>(null);
  const [form, setForm] = useState({ name: '', date: '', country: 'St. Kitts & Nevis', is_ssb_specific: false });

  const resetForm = () => setForm({ name: '', date: '', country: 'St. Kitts & Nevis', is_ssb_specific: false });

  const handleAdd = () => {
    if (!form.name || !form.date) return;
    create.mutate({ ...form, created_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setIsAddOpen(false); resetForm(); }
    });
  };

  const handleEdit = () => {
    if (!editHoliday || !form.name || !form.date) return;
    update.mutate({ id: editHoliday.id, ...form, updated_by: (profile as any)?.user_code || '' }, {
      onSuccess: () => { setEditHoliday(null); resetForm(); }
    });
  };

  const openEdit = (h: any) => {
    setForm({ name: h.name, date: h.date, country: h.country || 'St. Kitts & Nevis', is_ssb_specific: h.is_ssb_specific || false });
    setEditHoliday(h);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Loading holidays...</span></div>;
  if (isError) return <div className="text-center py-12"><p className="text-muted-foreground mb-4">Failed to load holidays</p><Button onClick={() => refetch()}>Retry</Button></div>;

  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formFields = (
    <div className="space-y-4">
      <div><Label>Holiday Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Independence Day" /></div>
      <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
      <div><Label>Country/Region</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="St. Kitts & Nevis" /></div>
      <div className="flex items-center space-x-2">
        <Checkbox id="ssbSpecific" checked={form.is_ssb_specific} onCheckedChange={c => setForm(f => ({ ...f, is_ssb_specific: !!c }))} />
        <Label htmlFor="ssbSpecific" className="cursor-pointer">SSB-specific holiday (not a public holiday)</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holiday Management</h1>
          <p className="text-muted-foreground">Manage public holidays and SSB-specific holidays | <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link></p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Holiday</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Holiday</DialogTitle></DialogHeader>
            {formFields}
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAdd} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Holiday'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Public Holidays</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.filter(h => !h.is_ssb_specific).length}</div><p className="text-xs text-muted-foreground mt-1">National holidays</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">SSB Holidays</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.filter(h => h.is_ssb_specific).length}</div><p className="text-xs text-muted-foreground mt-1">Organization-specific</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total Holidays</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{holidays.length}</div><p className="text-xs text-muted-foreground mt-1">All holidays</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Holiday Calendar</CardTitle></CardHeader>
        <CardContent>
          {sortedHolidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No holidays found. Click "Add Holiday" to get started.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Holiday Name</TableHead><TableHead>Country/Region</TableHead><TableHead>Type</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {sortedHolidays.map(holiday => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div></TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{holiday.country}</TableCell>
                    <TableCell>{holiday.is_ssb_specific ? <Badge variant="outline" className="bg-blue-50">SSB-Specific</Badge> : <Badge className="bg-green-500">Public Holiday</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(holiday)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => remove.mutate(holiday.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editHoliday !== null} onOpenChange={o => { if (!o) { setEditHoliday(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Holiday</DialogTitle></DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditHoliday(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
