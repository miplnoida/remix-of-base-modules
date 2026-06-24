import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Eye, Loader2, Inbox, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { withRegno } from '@/hooks/useRegnoParam';
import { EmployerLinkChip } from '@/components/compliance/EmployerLinkChip';

const BreachMonitoring = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  const { data: breaches = [], isLoading } = useQuery({
    queryKey: ['ce_breach_monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_breach_monitoring')
        .select('*')
        .order('breach_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('ce_breach_monitoring')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Breach marked ${v.status}`);
      qc.invalidateQueries({ queryKey: ['ce_breach_monitoring'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update breach'),
    onSettled: () => setSubmittingId(null),
  });

  const act = (id: string, status: 'Resolved' | 'Escalated to Legal') => {
    setSubmittingId(id);
    update.mutate({ id, status });
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Breach Monitoring</h1>
        </div>
        <p className="text-muted-foreground">Automatic detection and tracking of payment arrangement breaches</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Breaches</p><p className="text-2xl font-bold text-destructive">{breaches.filter(b => b.status === 'Active').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Escalated</p><p className="text-2xl font-bold text-warning">{breaches.filter(b => b.status?.startsWith('Escalated')).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-success">{breaches.filter(b => b.status === 'Resolved').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Auto-Detected</p><p className="text-2xl font-bold text-primary">{breaches.filter(b => b.auto_detected).length}</p></CardContent></Card>
      </div>

      {breaches.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><Inbox className="h-12 w-12 text-muted-foreground mb-3" /><p className="text-muted-foreground">No breaches recorded</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Breach ID</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Missed Amt</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Consecutive</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Detection</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {breaches.map(b => {
                    const busy = submittingId === b.id;
                    const closed = b.status === 'Resolved' || b.status?.startsWith('Escalated');
                    return (
                      <tr key={b.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{b.breach_id}</td>
                        <td className="py-2 px-3">
                          <p className="font-medium text-foreground">{b.employer_name}</p>
                          {b.reg_no ? <EmployerLinkChip regno={b.reg_no} /> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 px-3 text-foreground">{b.breach_type}</td>
                        <td className="py-2 px-3 text-foreground">{b.breach_date}</td>
                        <td className="py-2 px-3 text-right font-medium text-foreground">${Number(b.missed_amount ?? 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={(b.consecutive_misses ?? 0) >= 3 ? 'destructive' : (b.consecutive_misses ?? 0) >= 2 ? 'default' : 'secondary'} className="text-[10px]">
                            {b.consecutive_misses ?? 0}x
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={b.status === 'Active' ? 'destructive' : b.status === 'Resolved' ? 'default' : 'secondary'} className="text-[10px]">{b.status}</Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-[10px]">{b.auto_detected ? 'Auto' : 'Manual'}</Badge>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {b.reg_no && (
                            <Button variant="ghost" size="sm" title="Open Employer 360"
                              onClick={() => navigate(withRegno('/compliance/field/employer-360', b.reg_no!))}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {!closed && (
                            <>
                              <Button variant="ghost" size="sm" disabled={busy} title="Mark Resolved"
                                onClick={() => act(b.id, 'Resolved')}>
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              </Button>
                              <Button variant="ghost" size="sm" disabled={busy} title="Escalate to Legal"
                                onClick={() => act(b.id, 'Escalated to Legal')}>
                                <ArrowUpRight className="h-4 w-4 text-warning" />
                              </Button>
                            </>
                          )}
                          {busy && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BreachMonitoring;
