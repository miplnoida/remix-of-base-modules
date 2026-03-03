import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Heart } from 'lucide-react';

const benefitTypes = [
  { type: 'Sickness', amount: 2.4, count: 1820 },
  { type: 'Maternity', amount: 1.8, count: 642 },
  { type: 'Age', amount: 5.6, count: 4231 },
  { type: 'Invalidity', amount: 1.2, count: 389 },
  { type: 'Funeral', amount: 0.4, count: 210 },
  { type: 'Employment Injury', amount: 0.9, count: 164 },
];

const barColors = [
  'hsl(217 91% 60%)',
  'hsl(280 60% 55%)',
  'hsl(153 73% 21%)',
  'hsl(44 90% 57%)',
  'hsl(2 74% 50%)',
  'hsl(144 65% 34%)',
];

export function BenefitsDistribution() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Heart className="h-5 w-5 text-primary" />
          Benefits Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground">Current fiscal year – EC$ millions by benefit type</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benefitTypes} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 91%)" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(217 10% 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(217 10% 50%)" tickFormatter={(v) => `$${v}M`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(214 20% 91%)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(val: number) => [`$${val}M`, 'Amount']}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={36}>
                {benefitTypes.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
