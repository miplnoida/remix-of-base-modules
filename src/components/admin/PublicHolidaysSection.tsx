import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Pencil, Trash2, Copy, CalendarDays, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTbOffices } from '@/hooks/useAdminData';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/dateFormat';
import { format } from 'date-fns';

interface PublicHoliday {
  id: string;
  office_code: string;
  holiday_date: string;
  holiday_name: string;
  year: number;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);

const PublicHolidaysSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { data: offices = [] } = useTbOffices();

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedOffice, setSelectedOffice] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>();
  const [formOffice, setFormOffice] = useState('');

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState(String(currentYear));
  const [copyTargetYear, setCopyTargetYear] = useState(String(currentYear + 1));
  const [copyOffice, setCopyOffice] = useState('');

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['public-holidays', selectedYear, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('public_holidays')
        .select('*')
        .eq('year', Number(selectedYear))
        .order('holiday_date');

      if (selectedOffice !== 'all') {
        query = query.eq('office_code', selectedOffice);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PublicHoliday[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (holiday: { id?: string; office_code: string; holiday_date: string; holiday_name: string; year: number }) => {
      if (holiday.id) {
        const { error } = await supabase
          .from('public_holidays')
          .update({
            holiday_name: holiday.holiday_name,
            holiday_date: holiday.holiday_date,
            office_code: holiday.office_code,
            year: holiday.year,
            modified_by: userCode || 'SYSTEM',
            modified_at: new Date().toISOString(),
          })
          .eq('id', holiday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('public_holidays')
          .insert({
            office_code: holiday.office_code,
            holiday_date: holiday.holiday_date,
            holiday_name: holiday.holiday_name,
            year: holiday.year,
            entered_by: userCode || 'SYSTEM',
            modified_by: userCode || 'SYSTEM',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      toast.success(editingHoliday ? 'Holiday updated' : 'Holiday added');
      closeDialog();
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('A holiday already exists for this date and office');
      } else {
        toast.error(err.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('public_holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      toast.success('Holiday deleted');
    },
  });

  const copyMutation = useMutation({
    mutationFn: async ({ sourceYear, targetYear, officeCode }: { sourceYear: number; targetYear: number; officeCode: string }) => {
      // Check if target year already has entries
      const { data: existing } = await supabase
        .from('public_holidays')
        .select('id')
        .eq('year', targetYear)
        .eq('office_code', officeCode)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error(`Holidays already exist for ${officeCode} in ${targetYear}. Delete them first to copy.`);
      }

      // Get source year holidays
      const { data: source, error: srcErr } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', sourceYear)
        .eq('office_code', officeCode);

      if (srcErr) throw srcErr;
      if (!source || source.length === 0) throw new Error(`No holidays found for ${officeCode} in ${sourceYear}`);

      const yearDiff = targetYear - sourceYear;
      const newHolidays = source.map((h: any) => {
        const oldDate = new Date(h.holiday_date);
        const newDate = new Date(oldDate);
        newDate.setFullYear(newDate.getFullYear() + yearDiff);
        return {
          office_code: h.office_code,
          holiday_date: format(newDate, 'yyyy-MM-dd'),
          holiday_name: h.holiday_name,
          year: targetYear,
          entered_by: userCode || 'SYSTEM',
          modified_by: userCode || 'SYSTEM',
        };
      });

      const { error: insErr } = await supabase.from('public_holidays').insert(newHolidays);
      if (insErr) throw insErr;
      return newHolidays.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      toast.success(`${count} holidays copied successfully`);
      setCopyDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingHoliday(null);
    setFormName('');
    setFormDate(undefined);
    setFormOffice(selectedOffice !== 'all' ? selectedOffice : '');
    setDialogOpen(true);
  };

  const openEdit = (h: PublicHoliday) => {
    setEditingHoliday(h);
    setFormName(h.holiday_name);
    setFormDate(new Date(h.holiday_date));
    setFormOffice(h.office_code);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
  };

  const handleSave = () => {
    if (!formOffice) { toast.error('Select an office'); return; }
    if (!formDate) { toast.error('Select a date'); return; }
    if (!formName.trim()) { toast.error('Enter a holiday name'); return; }

    const dateStr = format(formDate, 'yyyy-MM-dd');
    const year = formDate.getFullYear();

    saveMutation.mutate({
      id: editingHoliday?.id,
      office_code: formOffice,
      holiday_date: dateStr,
      holiday_name: formName.trim(),
      year,
    });
  };

  const officeMap = useMemo(() => {
    const m: Record<string, string> = {};
    offices.forEach((o: any) => { m[o.code] = o.description || o.code; });
    return m;
  }, [offices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Public Holidays
            </CardTitle>
            <CardDescription>Declare public holidays per office location and year</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-1" /> Copy Year
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Holiday
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Office</Label>
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map((o: any) => (
                  <SelectItem key={o.code} value={o.code}>{o.description || o.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary">{holidays.length} holidays</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Holiday Name</TableHead>
              <TableHead>Office</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No holidays declared for {selectedYear}{selectedOffice !== 'all' ? ` at ${officeMap[selectedOffice] || selectedOffice}` : ''}.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-sm">{formatDisplayDate(h.holiday_date)}</TableCell>
                  <TableCell className="font-medium">{h.holiday_name}</TableCell>
                  <TableCell>{officeMap[h.office_code] || h.office_code}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this holiday?')) deleteMutation.mutate(h.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Public Holiday'}</DialogTitle>
            <DialogDescription>Declare a public holiday for a specific office location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Office</Label>
              <Select value={formOffice} onValueChange={setFormOffice}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map((o: any) => (
                    <SelectItem key={o.code} value={o.code}>{o.description || o.code} ({o.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Holiday Date</Label>
              <DatePicker date={formDate} onDateChange={setFormDate} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Holiday Name</Label>
              <Input placeholder="e.g. New Year's Day" value={formName} onChange={e => setFormName(e.target.value)} maxLength={100} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingHoliday ? 'Update' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Year Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={v => !v && setCopyDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Holidays to Another Year</DialogTitle>
            <DialogDescription>Copy all holidays from one year to another for a specific office. The target year must not have existing holidays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Office</Label>
              <Select value={copyOffice} onValueChange={setCopyOffice}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map((o: any) => (
                    <SelectItem key={o.code} value={o.code}>{o.description || o.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source Year</Label>
                <Select value={copySourceYear} onValueChange={setCopySourceYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Year</Label>
                <Select value={copyTargetYear} onValueChange={setCopyTargetYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!copyOffice) { toast.error('Select an office'); return; }
                if (copySourceYear === copyTargetYear) { toast.error('Source and target year must be different'); return; }
                copyMutation.mutate({ sourceYear: Number(copySourceYear), targetYear: Number(copyTargetYear), officeCode: copyOffice });
              }}
              disabled={copyMutation.isPending}
            >
              {copyMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Copy Holidays
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicHolidaysSection;
