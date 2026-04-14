import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Save } from 'lucide-react';
import { useHeadCashier } from '@/hooks/useHeadCashier';
import { useCashierUsers, type CashierUser } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const HeadCashierAssignmentSection: React.FC = () => {
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { headCashier, isLoading: hcLoading, source } = useHeadCashier();
  const { data: cashierUsers, isLoading: cuLoading } = useCashierUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedUserId || !profile?.user_code) return;

    const selectedCashier = (cashierUsers || []).find((u: CashierUser) => u.id === selectedUserId);
    const officeCode = selectedCashier?.office_code || null;

    if (!officeCode) {
      toast.error('Cannot assign Head Cashier: no office location found for the selected user.');
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('set_default_head_cashier' as any, {
        p_office_code: officeCode,
        p_user_id: selectedUserId,
        p_user_code: selectedCashier!.user_code,
        p_full_name: selectedCashier!.full_name || selectedCashier!.user_code,
        p_assigned_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Assignment failed');
      } else {
        toast.success(`Default Head Cashier set: ${result.user_code} for office ${officeCode}`);
        setSelectedUserId('');
        queryClient.invalidateQueries({ queryKey: ['head-cashier'] });
        queryClient.invalidateQueries({ queryKey: ['hc-defaults'] });
      }
    } catch (err: any) {
      toast.error('Failed to set default Head Cashier', { description: err.message });
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
          Set the default Head Cashier per branch. Overrides can be managed on the dedicated assignment page.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {hcLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : headCashier ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                {headCashier.full_name} ({headCashier.user_code})
              </Badge>
              {source && (
                <Badge variant={source === 'override' ? 'secondary' : 'outline'} className="text-xs">
                  {source === 'override' ? 'Override' : 'Default'}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No Head Cashier assigned.</p>
          )}
        </div>

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
            Set Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeadCashierAssignmentSection;
