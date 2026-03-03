import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield } from 'lucide-react';

const data = [
  { name: 'Compliant', value: 12840, color: 'hsl(144 65% 34%)' },
  { name: 'Minor Issues', value: 1820, color: 'hsl(44 90% 57%)' },
  { name: 'Non-Compliant', value: 310, color: 'hsl(2 74% 50%)' },
  { name: 'Under Review', value: 462, color: 'hsl(217 91% 60%)' },
];

const total = data.reduce((s, d) => s + d.value, 0);
const compliantPct = ((data[0].value / total) * 100).toFixed(1);

export function ComplianceDonut() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Shield className="h-5 w-5 text-primary" />
          Employer Compliance Status
        </CardTitle>
        <p className="text-xs text-muted-foreground">Current compliance distribution – {total.toLocaleString()} employers</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="h-[220px] w-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214 20% 91%)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(val: number) => [val.toLocaleString(), undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{compliantPct}%</span>
              <span className="text-[11px] text-muted-foreground">Compliant</span>
            </div>
          </div>
          <div className="flex-1 space-y-3 w-full">
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-foreground">{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{d.value.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {((d.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
