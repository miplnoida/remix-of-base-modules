import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

const monthlyData = [
  { month: 'Jul', contributions: 10.2, benefits: 6.8 },
  { month: 'Aug', contributions: 10.5, benefits: 7.1 },
  { month: 'Sep', contributions: 11.0, benefits: 7.4 },
  { month: 'Oct', contributions: 11.3, benefits: 7.2 },
  { month: 'Nov', contributions: 11.8, benefits: 7.9 },
  { month: 'Dec', contributions: 12.1, benefits: 8.0 },
  { month: 'Jan', contributions: 12.5, benefits: 8.2 },
  { month: 'Feb', contributions: 12.9, benefits: 8.1 },
];

const formatValue = (value: number) => `$${value}M`;

export function ContributionTrendChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <TrendingUp className="h-5 w-5 text-primary" />
          Contributions vs Benefits Paid
        </CardTitle>
        <p className="text-xs text-muted-foreground">Monthly trend – last 8 months (EC$, millions)</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(153 73% 21%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(153 73% 21%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradBenefits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(217 10% 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(217 10% 50%)" tickFormatter={formatValue} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(214 20% 91%)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(val: number) => [`$${val}M`, undefined]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="contributions"
                name="Contributions"
                stroke="hsl(153 73% 21%)"
                strokeWidth={2}
                fill="url(#gradContrib)"
              />
              <Area
                type="monotone"
                dataKey="benefits"
                name="Benefits Paid"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                fill="url(#gradBenefits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
