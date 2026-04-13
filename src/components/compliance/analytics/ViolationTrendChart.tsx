import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface TrendRow {
  month_key: string;
  month_label: string;
  created_count: number;
  resolved_count: number;
  escalated_count: number;
}

export function ViolationTrendChart() {
  const { data: trends = [], isLoading } = useQuery({
    queryKey: ['ce_v_violation_trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_violation_trends' as any)
        .select('*')
        .order('month_key' as any);
      if (error) throw error;
      return (data || []) as unknown as TrendRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Violation Trends (12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created_count" name="Created" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved_count" name="Resolved" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="escalated_count" name="Escalated" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
