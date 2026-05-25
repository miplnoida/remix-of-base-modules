/**
 * Delivery Tracking — shows sent/delivered/failed notices and their attempts.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { markDelivered, fetchDeliveryLog } from '@/services/noticeService';
import { markFailed } from '@/services/noticeWorkflowService';
import { useUserCode } from '@/hooks/useUserCode';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

const STATUS_VARIANTS: Record<string, string> = {
  SENT: 'bg-blue-500/15 text-blue-700 border-blue-300',
  DELIVERED: 'bg-green-500/15 text-green-700 border-green-300',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/30',
  ACKNOWLEDGED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
};

export default function DeliveryTrackingPage() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const enabled = isComplianceFeatureEnabled('notices.deliveryTracking');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ce_notices_delivery'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_notices').select('*')
        .in('status', ['SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED'])
        .order('sent_at', { ascending: false, nullsFirst: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = {} } = useQuery({
    queryKey: ['ce_notices_delivery_logs', rows.map((r: any) => r.id).join(',')],
    enabled: rows.length > 0,
    queryFn: async () => {
      const m: Record<string, any[]> = {};
      for (const r of rows) m[(r as any).id] = await fetchDeliveryLog((r as any).id);
      return m;
    },
  });

  const deliverMut = useMutation({
    mutationFn: (id: string) => markDelivered(id, userCode || 'system'),
    onSuccess: () => { toast.success('Marked delivered'); qc.invalidateQueries({ queryKey: ['ce_notices_delivery'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const failMut = useMutation({
    mutationFn: (id: string) => markFailed(id, 'Manual flag', userCode || 'system'),
    onSuccess: () => { toast.success('Marked failed'); qc.invalidateQueries({ queryKey: ['ce_notices_delivery'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Delivery Tracking" subtitle="Track notice dispatch, delivery, and failures." />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Delivery tracking is disabled in feature toggles.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice #</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No notices in delivery flow.</TableCell></TableRow>
                    )}
                    {rows.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.notice_number}</TableCell>
                        <TableCell>{n.employer_name || n.employer_id}</TableCell>
                        <TableCell>{n.delivery_method || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_VARIANTS[n.status]}>{n.status}</Badge></TableCell>
                        <TableCell className="text-xs">{n.sent_at ? new Date(n.sent_at).toLocaleString('en-GB') : '—'}</TableCell>
                        <TableCell className="text-xs">{(logs[n.id] || []).length}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          {n.status === 'SENT' && (
                            <>
                              <PermissionButton moduleName={MODULE} actionName="edit" size="sm" variant="outline"
                                onClick={() => deliverMut.mutate(n.id)} disabled={deliverMut.isPending}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Delivered
                              </PermissionButton>
                              <PermissionButton moduleName={MODULE} actionName="edit" size="sm" variant="outline"
                                onClick={() => failMut.mutate(n.id)} disabled={failMut.isPending}>
                                <AlertTriangle className="h-4 w-4 mr-1" /> Mark Failed
                              </PermissionButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionWrapper>
  );
}
