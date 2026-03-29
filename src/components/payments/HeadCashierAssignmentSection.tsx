import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Lock, Save } from 'lucide-react';
import { useHeadCashier } from '@/hooks/useHeadCashier';
import { useCashierUsers, type CashierUser } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

const HeadCashierAssignmentSection: React.FC = () => {
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const isPastDate = selectedDate ? isBefore(startOfDay(selectedDate), startOfDay(new Date())) : false;

  const { headCashier, isLoading: hcLoading } = useHeadCashier(dateStr);
  const { data: cashierUsers, isLoading: cuLoading } = useCashierUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedUserId || !profile?.user_code) return;
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_head_cashier' as any, {
        p_user_id: selectedUserId,
        p_date: dateStr,
        p_assigned_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Assignment failed');
      } else {
        toast.success(`Head Cashier assigned: ${result.user_code}`);
        setSelectedUserId('');
        queryClient.invalidateQueries({ queryKey: ['head-cashier'] });
      }
    } catch (err: any) {
      toast.error('Failed to assign Head Cashier', { description: err.message });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4" />
          Head Cashier Assignment
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Assign one user as Head Cashier per day. The role is automatically revoked after the assigned date expires.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 w-48">
            <Label className="text-xs">Assignment Date</Label>
            <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
          </div>
          {hcLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mb-2" />
          ) : headCashier ? (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                {headCashier.full_name} ({headCashier.user_code})
              </Badge>
              {isPastDate && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">No Head Cashier assigned for this date.</p>
          )}
        </div>

        {!isPastDate && (
          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label className="text-xs">Select Cashier</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={cuLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={cuLoading ? 'Loading...' : 'Select a cashier...'} />
                </SelectTrigger>
                <SelectContent>
                  {(cashierUsers || []).map((u: CashierUser) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.user_code} ({u.user_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAssign} disabled={!selectedUserId || assigning}>
              {assigning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Assign
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HeadCashierAssignmentSection;
