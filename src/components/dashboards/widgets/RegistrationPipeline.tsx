import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserPlus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRegistrationPipeline } from '@/services/dashboardDataService';

export function RegistrationPipeline() {
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['dashboard_registration_pipeline'],
    queryFn: fetchRegistrationPipeline,
  });

  const chartData = (pipelineData ?? []).map(d => ({
    stage: d.stage,
    count: Number(d.count),
    fill: d.fill,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <UserPlus className="h-5 w-5 text-primary" />
          Employer Registration Pipeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">Employers by registration status</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[220px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No registration data available
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214 20% 91%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(217 10% 50%)" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} stroke="hsl(217 10% 50%)" width={85} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214 20% 91%)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
