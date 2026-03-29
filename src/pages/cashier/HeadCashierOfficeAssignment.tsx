import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Crown, AlertTriangle, Save } from 'lucide-react';
import { useHeadCashier } from '@/hooks/useHeadCashier';
import { useCashierUsers, type CashierUser } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

const HeadCashierOfficeAssignment: React.FC = () => {
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { headCashier, isCurrentUserHeadCashier, isLoading: hcLoading } = useHeadCashier(today);
  const { data: cashierUsers, isLoading: cuLoading } = useCashierUsers();

  // Fetch offices
  const { data: offices } = useQuery({
    queryKey: ['tb-office-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tb_office').select('code, description').order('code');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's overrides
  const { data: overrides, isLoading: ovLoading } = useQuery({
    queryKey: ['cashier-office-overrides', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_cashier_office_override')
        .select('*')
        .eq('override_date', today);
      if (error) throw error;
      return data || [];
    },
  });

  const [saving, setSaving] = useState<string | null>(null);

  const handleAssignOffice = async (cashierUserId: string, officeCode: string) => {
    if (!profile?.user_code) return;
    setSaving(cashierUserId);
    try {
      const { data, error } = await supabase.rpc('assign_cashier_office_override' as any, {
        p_cashier_user_id: cashierUserId,
        p_date: today,
        p_office_code: officeCode,
        p_assigned_by: profile.user_code,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        toast.error(result?.message || 'Failed to assign office');
      } else {
        toast.success('Office override saved');
        queryClient.invalidateQueries({ queryKey: ['cashier-office-overrides'] });
      }
    } catch (err: any) {
      toast.error('Error assigning office', { description: err.message });
    } finally {
      setSaving(null);
    }
  };

  const isLoading = hcLoading || cuLoading || ovLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isCurrentUserHeadCashier) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Cashier Office Assignment
        </h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only the Head Cashier for today can access this screen.
            {headCashier ? ` Current Head Cashier: ${headCashier.full_name} (${headCashier.user_code})` : ' No Head Cashier is assigned for today.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getOverride = (userId: string) => overrides?.find((o: any) => o.cashier_user_id === userId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Cashier Office Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Override the office location for cashiers for today ({today}).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="default">
          <Crown className="h-3 w-3 mr-1" />
          Head Cashier: {headCashier?.full_name}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cashier</TableHead>
                <TableHead>User Code</TableHead>
                <TableHead>Default Office</TableHead>
                <TableHead>Today's Override</TableHead>
                <TableHead>Assign Office</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(cashierUsers || []).map((u: CashierUser) => {
                const ov = getOverride(u.id);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell>{u.user_code || '—'}</TableCell>
                    <TableCell>{u.office_description || u.office_code || '—'}</TableCell>
                    <TableCell>
                      {ov ? (
                        <Badge variant="secondary">{(ov as any).office_code}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No override</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={(ov as any)?.office_code || ''}
                          onValueChange={(val) => handleAssignOffice(u.id, val)}
                          disabled={saving === u.id}
                        >
                          <SelectTrigger className="w-48 h-8 text-xs">
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
                        {saving === u.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeadCashierOfficeAssignment;
