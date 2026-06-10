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
  UNKNOWN: 'hsl(0, 0%, 60%)',
};

// Issue #3 — Custom label renderer. Recharts' default labels overlap badly
// when slices are small. We position labels outside the slice with a leader
// line, hide labels for tiny slices (<5%), and rely on the legend + tooltip
// for the full breakdown.
function renderOutsideLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent, name, value } = props;
  if (!percent || percent < 0.05) return null; // hide tiny slices to avoid overlap
  const RAD = Math.PI / 180;
  const r = outerRadius + 18;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize={11}
      fill="hsl(var(--foreground))"
    >
      {`${name} (${value})`}
    </text>
  );
}

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
          <ResponsiveContainer width="100%" height={340}>
            <PieChart margin={{ top: 16, right: 80, bottom: 16, left: 80 }}>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                dataKey="value"
                nameKey="name"
                minAngle={4}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                label={renderOutsideLabel}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {distribution.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name] || 'hsl(0,0%,60%)'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} employers`, name]} />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
