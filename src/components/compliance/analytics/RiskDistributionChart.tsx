import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

const RISK_COLORS: Record<string, string> = {
  LOW: 'hsl(142, 76%, 36%)',
  MEDIUM: 'hsl(45, 93%, 47%)',
  HIGH: 'hsl(0, 84%, 60%)',
  CRITICAL: 'hsl(280, 67%, 50%)',
};

export function RiskDistributionChart() {
  const { data: distribution = [], isLoading } = useQuery({
    queryKey: ['ce_risk_distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_profiles')
        .select('risk_band');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const band = r.risk_band || 'UNKNOWN';
        counts[band] = (counts[band] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employer Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : distribution.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">No risk profiles found</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {distribution.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#888'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
