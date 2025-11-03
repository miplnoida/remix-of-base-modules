import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkloadData } from '@/adapters/legalDashboardAdapter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface WorkloadChartProps {
  data: WorkloadData[] | null;
  loading: boolean;
}

export function WorkloadChart({ data, loading }: WorkloadChartProps) {
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const handleBarClick = (data: any) => {
    navigate('/legal/cases');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Workload by Officer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="officer"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Legend
              wrapperStyle={{ color: 'hsl(var(--foreground))' }}
              iconType="rect"
            />
            <Bar
              dataKey="openCases"
              stackId="a"
              fill="hsl(var(--chart-1))"
              name="Open Cases"
              onClick={handleBarClick}
              cursor="pointer"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="hearingsAssigned"
              stackId="a"
              fill="hsl(var(--chart-2))"
              name="Hearings Assigned"
              onClick={handleBarClick}
              cursor="pointer"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="ordersPending"
              stackId="a"
              fill="hsl(var(--chart-3))"
              name="Orders Pending"
              onClick={handleBarClick}
              cursor="pointer"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
