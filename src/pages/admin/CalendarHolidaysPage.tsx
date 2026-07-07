import { useState } from 'react';
import {
  useCalendarHolidays,
  useCreateCalendarHoliday,
  useDeactivateCalendarHoliday,
  useReactivateCalendarHoliday,
} from '@/platform/organization/useOrganization';
import { HOLIDAY_TYPES } from '@/platform/organization/organizationTypes';
import type { HolidayType } from '@/platform/organization/organizationTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';

export default function CalendarHolidaysPage() {
  const [search, setSearch] = useState('');
  const { data: holidays = [], isLoading } = useCalendarHolidays({ search });
  const create = useCreateCalendarHoliday();
  const deactivate = useDeactivateCalendarHoliday();
  const reactivate = useReactivateCalendarHoliday();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    holidayDate: '',
    holidayName: '',
    holidayType: 'PUBLIC' as HolidayType,
    officeCode: '',
    appliesNationally: true,
    affectsWorkflowDeadlines: true,
    affectsPaymentProcessing: false,
    description: '',
    isActive: true,
  });

  const handleCreate = async () => {
    if (!form.holidayDate || !form.holidayName) {
      toast.error('Holiday date and name are required');
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        officeCode: form.officeCode || null,
        description: form.description || null,
      });
      toast.success('Holiday added');
      setOpen(false);
      setForm({
        holidayDate: '', holidayName: '', holidayType: 'PUBLIC',
        officeCode: '', appliesNationally: true,
        affectsWorkflowDeadlines: true, affectsPaymentProcessing: false,
        description: '', isActive: true,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add holiday');
    }
  };

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Calendar &amp; Holidays</h1>
            <p className="text-sm text-muted-foreground">
              Manage public and organization holidays that affect workflows and payments.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Holiday</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.holidayDate}
                    onChange={(e) => setForm({ ...form, holidayDate: e.target.value })} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={form.holidayName}
                    onChange={(e) => setForm({ ...form, holidayName: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.holidayType}
                    onValueChange={(v) => setForm({ ...form, holidayType: v as HolidayType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Office (leave blank for all offices)</Label>
                  <Input value={form.officeCode}
                    onChange={(e) => setForm({ ...form, officeCode: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.appliesNationally}
                    onCheckedChange={(v) => setForm({ ...form, appliesNationally: !!v })} />
                  <Label>Applies nationally</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.affectsWorkflowDeadlines}
                    onCheckedChange={(v) => setForm({ ...form, affectsWorkflowDeadlines: !!v })} />
                  <Label>Affects workflow deadlines</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.affectsPaymentProcessing}
                    onCheckedChange={(v) => setForm({ ...form, affectsPaymentProcessing: !!v })} />
                  <Label>Affects payment processing</Label>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={create.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Input
          placeholder="Search holidays…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>National</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Payments</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>
            )}
            {!isLoading && holidays.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-muted-foreground">No holidays yet.</TableCell></TableRow>
            )}
            {holidays.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.holidayDate}</TableCell>
                <TableCell>{h.holidayName}</TableCell>
                <TableCell><Badge variant="outline">{h.holidayType}</Badge></TableCell>
                <TableCell>{h.appliesNationally ? 'Yes' : 'No'}</TableCell>
                <TableCell>{h.officeCode ?? '—'}</TableCell>
                <TableCell>{h.affectsWorkflowDeadlines ? 'Yes' : 'No'}</TableCell>
                <TableCell>{h.affectsPaymentProcessing ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={h.isActive ? 'default' : 'secondary'}>
                    {h.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {h.isActive
                    ? <Button size="sm" variant="outline" onClick={() => deactivate.mutate(h.id)}>Deactivate</Button>
                    : <Button size="sm" variant="outline" onClick={() => reactivate.mutate(h.id)}>Reactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PermissionWrapper>
  );
}
