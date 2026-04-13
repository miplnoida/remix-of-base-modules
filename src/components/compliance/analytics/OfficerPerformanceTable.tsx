import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface OfficerPerf {
  officer_id: string | null;
  officer_name: string;
  total_assigned: number;
  active_count: number;
  resolved_count: number;
  overdue_count: number;
  avg_resolution_days: number | null;
  overdue_pct: number;
}

export function OfficerPerformanceTable() {
  const { data: officers = [], isLoading } = useQuery({
    queryKey: ['ce_v_officer_performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_officer_performance' as any)
        .select('*')
        .order('total_assigned' as any, { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OfficerPerf[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Officer Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : officers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No officer data</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Officer</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Overdue %</TableHead>
                <TableHead className="text-right">Avg Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {officers.map((o) => (
                <TableRow key={o.officer_id || 'null'}>
                  <TableCell className="font-medium">{o.officer_name}</TableCell>
                  <TableCell className="text-right">{o.total_assigned}</TableCell>
                  <TableCell className="text-right">{o.active_count}</TableCell>
                  <TableCell className="text-right">{o.resolved_count}</TableCell>
                  <TableCell className="text-right">
                    {o.overdue_count > 0 ? (
                      <Badge variant="destructive">{o.overdue_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={o.overdue_pct > 20 ? 'text-destructive font-bold' : ''}>
                      {o.overdue_pct}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {o.avg_resolution_days != null ? `${o.avg_resolution_days}d` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
