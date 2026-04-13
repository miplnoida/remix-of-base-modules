import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ArrangementHealth {
  arrangement_id: string | null;
  employer_name: string | null;
  arrangement_status: string | null;
  total_expected: number | null;
  total_paid: number | null;
  missed_payments: number | null;
  health_status: string | null;
}

const HEALTH_COLORS: Record<string, { className: string; icon: typeof CheckCircle }> = {
  HEALTHY: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
  AT_RISK: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  BREACHED: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export function ArrangementHealthWidget() {
  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ['ce_v_arrangement_health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_arrangement_health' as any)
        .select('*')
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as ArrangementHealth[];
    },
  });

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount)
      : '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Arrangement Health Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : arrangements.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No arrangements found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Missed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrangements.map((a) => {
                const health = HEALTH_COLORS[a.health_status || ''] || HEALTH_COLORS.HEALTHY;
                const HealthIcon = health.icon;
                return (
                  <TableRow key={a.arrangement_id}>
                    <TableCell className="font-medium text-sm">{a.employer_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.arrangement_status || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={health.className}>
                        <HealthIcon className="h-3 w-3 mr-1" />
                        {a.health_status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(a.total_expected)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(a.total_paid)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {a.missed_payments != null && a.missed_payments > 0 ? (
                        <span className="text-destructive">{a.missed_payments}</span>
                      ) : '0'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
