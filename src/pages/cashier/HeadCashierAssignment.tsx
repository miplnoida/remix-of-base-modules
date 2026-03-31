import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Crown, Lock, Save, Building2 } from 'lucide-react';
import { useCashierUsers, type CashierUser } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const HeadCashierAssignment: React.FC = () => {
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const isPastDate = selectedDate ? isBefore(startOfDay(selectedDate), startOfDay(new Date())) : false;

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

  // Fetch all head cashier assignments for the selected date (all offices)
  const { data: assignments, isLoading: assLoading } = useQuery({
    queryKey: ['head-cashier-assignments', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_head_cashier_assignment')
        .select('*, profiles:user_id(full_name, user_code, office_code)')
        .eq('assignment_date', dateStr)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedUserId || !selectedOffice || !profile?.user_code) return;
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_head_cashier' as any, {
        p_user_id: selectedUserId,
        p_date: dateStr,
        p_assigned_by: profile.user_code,
        p_office_code: selectedOffice,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Assignment failed');
      } else {
        toast.success(`Head Cashier assigned for ${selectedOffice}: ${result.user_code}`);
        setSelectedUserId('');
        queryClient.invalidateQueries({ queryKey: ['head-cashier-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['head-cashier'] });
      }
    } catch (err: any) {
      toast.error('Failed to assign Head Cashier', { description: err.message });
    } finally {
      setAssigning(false);
    }
  };

  const getAssignmentForOffice = (officeCode: string) => {
    return assignments?.find((a: any) => a.office_code === officeCode);
  };

  const isLoading = cuLoading || assLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6" />
          Head Cashier Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Assign one Head Cashier per branch per day. Any eligible cashier can be assigned regardless of their own office location.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1.5 w-48">
          <Label className="text-xs">Assignment Date</Label>
          <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
        </div>
        {isPastDate && (
          <Badge variant="secondary" className="mb-1">
            <Lock className="h-3 w-3 mr-1" />
            Past Date (Read Only)
          </Badge>
        )}
      </div>

      {/* Current Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Head Cashier Assignments for {dateStr}
          </CardTitle>
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
                  <TableHead>Assigned Head Cashier</TableHead>
                  <TableHead>User Code</TableHead>
                  <TableHead>Assigned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(offices || []).map((office: any) => {
                  const assignment = getAssignmentForOffice(office.code);
                  const assignedProfile = assignment?.profiles;
                  return (
                    <TableRow key={office.code}>
                      <TableCell className="font-mono font-semibold">{office.code}</TableCell>
                      <TableCell>{office.description}</TableCell>
                      <TableCell>
                        {assignedProfile ? (
                          <Badge variant="default" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            {assignedProfile.full_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {assignment?.user_code || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment?.assigned_by || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Form - only for non-past dates */}
      {!isPastDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign Head Cashier</CardTitle>
            <p className="text-xs text-muted-foreground">
              Select a branch and an eligible cashier. The cashier does not need to belong to that branch.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5 w-56">
                <Label className="text-xs">Office / Branch</Label>
                <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select office..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(offices || []).map((o: any) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.code} — {o.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 max-w-sm">
                <Label className="text-xs">Select Cashier</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={cuLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={cuLoading ? 'Loading...' : 'Select a cashier...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(cashierUsers || []).map((u: CashierUser) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.user_code} ({u.user_code}) — {u.office_description || u.office_code || 'No office'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleAssign} disabled={!selectedUserId || !selectedOffice || assigning}>
                {assigning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HeadCashierAssignment;
