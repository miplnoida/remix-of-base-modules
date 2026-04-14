import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Crown, Save, Building2, CalendarClock, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { useCashierUsers, type CashierUser } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isAfter, startOfDay, isBefore } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const HeadCashierAssignment: React.FC = () => {
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: cashierUsers, isLoading: cuLoading } = useCashierUsers();

  // Fetch offices
  const { data: offices } = useQuery({
    queryKey: ['tb-office-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tb_office').select('code, description').eq('is_active', true).order('code');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all defaults
  const { data: defaults, isLoading: defLoading } = useQuery({
    queryKey: ['hc-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_head_cashier_default')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch active/upcoming overrides
  const { data: overrides, isLoading: ovLoading } = useQuery({
    queryKey: ['hc-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_head_cashier_override')
        .select('*')
        .eq('is_active', true)
        .gte('override_end', today)
        .order('override_start');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Resolve effective head cashier per office for today
  const { data: resolved, isLoading: resLoading } = useQuery({
    queryKey: ['hc-resolved-today', today, offices?.map((o: any) => o.code).join(',')],
    enabled: !!offices && offices.length > 0,
    queryFn: async () => {
      const results: Record<string, any> = {};
      for (const office of (offices || [])) {
        const { data, error } = await supabase.rpc('resolve_head_cashier' as any, {
          p_date: today,
          p_office_code: office.code,
        });
        if (!error && data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (parsed?.found) results[office.code] = parsed;
        }
      }
      return results;
    },
    staleTime: 30_000,
  });

  // ── Default assignment state ──
  const [editingOffice, setEditingOffice] = useState<string | null>(null);
  const [defaultUserId, setDefaultUserId] = useState<string>('');
  const [savingDefault, setSavingDefault] = useState(false);

  // ── Override form state ──
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [ovOffice, setOvOffice] = useState<string>('');
  const [ovUserId, setOvUserId] = useState<string>('');
  const [ovStart, setOvStart] = useState<Date | undefined>(new Date());
  const [ovEnd, setOvEnd] = useState<Date | undefined>(new Date());
  const [ovReason, setOvReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hc-defaults'] }),
      queryClient.invalidateQueries({ queryKey: ['hc-overrides'] }),
      queryClient.invalidateQueries({ queryKey: ['hc-resolved-today'] }),
      queryClient.invalidateQueries({ queryKey: ['head-cashier'] }),
    ]);
  };

  const handleSaveDefault = async (officeCode: string) => {
    if (!defaultUserId || !profile?.user_code) return;
    const selectedCashier = cashierUsers?.find((u: CashierUser) => u.id === defaultUserId);
    if (!selectedCashier) return;

    setSavingDefault(true);
    try {
      const { data, error } = await supabase.rpc('set_default_head_cashier' as any, {
        p_office_code: officeCode,
        p_user_id: defaultUserId,
        p_user_code: selectedCashier.user_code,
        p_full_name: selectedCashier.full_name || selectedCashier.user_code,
        p_assigned_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Failed to set default');
      } else {
        toast.success(`Default Head Cashier set for ${officeCode}: ${selectedCashier.user_code}`);
        setEditingOffice(null);
        setDefaultUserId('');
        await invalidateAll();
      }
    } catch (err: any) {
      toast.error('Error setting default', { description: err.message });
    } finally {
      setSavingDefault(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!ovOffice || !ovUserId || !ovStart || !ovEnd || !profile?.user_code) return;
    const selectedCashier = cashierUsers?.find((u: CashierUser) => u.id === ovUserId);
    if (!selectedCashier) return;

    setSavingOverride(true);
    try {
      const { data, error } = await supabase.rpc('create_head_cashier_override' as any, {
        p_office_code: ovOffice,
        p_user_id: ovUserId,
        p_user_code: selectedCashier.user_code,
        p_full_name: selectedCashier.full_name || selectedCashier.user_code,
        p_start: format(ovStart, 'yyyy-MM-dd'),
        p_end: format(ovEnd, 'yyyy-MM-dd'),
        p_reason: ovReason || null,
        p_assigned_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Failed to create override');
      } else {
        toast.success('Override created successfully');
        setShowOverrideForm(false);
        setOvOffice('');
        setOvUserId('');
        setOvReason('');
        await invalidateAll();
      }
    } catch (err: any) {
      toast.error('Error creating override', { description: err.message });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!profile?.user_code) return;
    setDeletingId(id);
    try {
      const { data, error } = await supabase.rpc('delete_head_cashier_override' as any, {
        p_override_id: id,
        p_deleted_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Failed to delete override');
      } else {
        toast.success('Override removed');
        await invalidateAll();
      }
    } catch (err: any) {
      toast.error('Error deleting override', { description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const getDefaultForOffice = (code: string) => defaults?.find((d: any) => d.office_code === code);

  const getOverrideStatus = (officeCode: string) => {
    const r = resolved?.[officeCode];
    if (!r) return null;
    if (r.source === 'override') return { type: 'override' as const, user_code: r.user_code, full_name: r.full_name };
    return { type: 'default' as const, user_code: r.user_code, full_name: r.full_name };
  };

  const isLoading = cuLoading || defLoading || ovLoading || resLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6" />
          Head Cashier Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a default Head Cashier per branch. Use temporary overrides for specific date ranges.
        </p>
      </div>

      {/* Section 1: Default Head Cashier Per Branch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Default Head Cashier Per Branch
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            The default assignment stays active indefinitely until changed. Overrides take precedence for their date range.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Default Head Cashier</TableHead>
                  <TableHead>Today's Effective</TableHead>
                  <TableHead className="w-64">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(offices || []).map((office: any) => {
                  const def = getDefaultForOffice(office.code);
                  const status = getOverrideStatus(office.code);
                  const isEditing = editingOffice === office.code;

                  return (
                    <TableRow key={office.code}>
                      <TableCell className="font-mono font-semibold">{office.code}</TableCell>
                      <TableCell>{office.description}</TableCell>
                      <TableCell>
                        {def ? (
                          <span className="text-sm">
                            {def.full_name || def.user_code} <span className="text-muted-foreground">({def.user_code})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <Badge variant={status.type === 'override' ? 'secondary' : 'default'} className="text-xs">
                            {status.type === 'override' ? (
                              <><CalendarClock className="h-3 w-3 mr-1" />Override: {status.user_code}</>
                            ) : (
                              <><ShieldCheck className="h-3 w-3 mr-1" />Default: {status.user_code}</>
                            )}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Select value={defaultUserId} onValueChange={setDefaultUserId}>
                              <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue placeholder="Select cashier..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(cashierUsers || []).map((u: CashierUser) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.full_name || u.user_code} ({u.user_code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="default" onClick={() => handleSaveDefault(office.code)} disabled={!defaultUserId || savingDefault}>
                              {savingDefault ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingOffice(null); setDefaultUserId(''); }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => { setEditingOffice(office.code); setDefaultUserId(''); }}>
                            {def ? 'Change' : 'Set Default'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Temporary Overrides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Temporary Overrides
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Active and upcoming overrides. The system automatically reverts to the default after the override period ends.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowOverrideForm(!showOverrideForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Override
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showOverrideForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Office / Branch</Label>
                    <Select value={ovOffice} onValueChange={setOvOffice}>
                      <SelectTrigger><SelectValue placeholder="Select office..." /></SelectTrigger>
                      <SelectContent>
                        {(offices || []).map((o: any) => (
                          <SelectItem key={o.code} value={o.code}>{o.code} — {o.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Override Cashier</Label>
                    <Select value={ovUserId} onValueChange={setOvUserId}>
                      <SelectTrigger><SelectValue placeholder="Select cashier..." /></SelectTrigger>
                      <SelectContent>
                        {(cashierUsers || []).map((u: CashierUser) => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name || u.user_code} ({u.user_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <DatePicker date={ovStart} onDateChange={setOvStart} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <DatePicker date={ovEnd} onDateChange={setOvEnd} />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-md">
                  <Label className="text-xs">Reason (optional)</Label>
                  <Input value={ovReason} onChange={(e) => setOvReason(e.target.value)} placeholder="e.g. Leave coverage" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateOverride} disabled={!ovOffice || !ovUserId || !ovStart || !ovEnd || savingOverride}>
                    {savingOverride ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Override
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowOverrideForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {ovLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !overrides?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active or upcoming overrides.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Override Cashier</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((ov: any) => {
                  const isActive = today >= ov.override_start && today <= ov.override_end;
                  const isUpcoming = today < ov.override_start;
                  return (
                    <TableRow key={ov.id}>
                      <TableCell className="font-mono font-semibold">{ov.office_code}</TableCell>
                      <TableCell>{ov.full_name || ov.user_code} <span className="text-muted-foreground">({ov.user_code})</span></TableCell>
                      <TableCell className="text-sm">{ov.override_start}</TableCell>
                      <TableCell className="text-sm">{ov.override_end}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        ) : isUpcoming ? (
                          <Badge variant="secondary" className="text-xs">Upcoming</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Expired</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{ov.reason || '—'}</TableCell>
                      <TableCell className="text-sm">{ov.assigned_by}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteOverride(ov.id)}
                          disabled={deletingId === ov.id}
                        >
                          {deletingId === ov.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeadCashierAssignment;
