import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserPlus } from 'lucide-react';

const pipelineData = [
  { stage: 'Submitted', count: 245, fill: 'hsl(217 91% 60%)' },
  { stage: 'Under Review', count: 128, fill: 'hsl(44 90% 57%)' },
  { stage: 'Verified', count: 96, fill: 'hsl(153 73% 21%)' },
  { stage: 'Approved', count: 412, fill: 'hsl(144 65% 34%)' },
  { stage: 'Rejected', count: 34, fill: 'hsl(2 74% 50%)' },
];

export function RegistrationPipeline() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <UserPlus className="h-5 w-5 text-primary" />
          Registration Pipeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">Current month – applications by status</p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
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
                {pipelineData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
