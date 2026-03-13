import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RiskHeatMapProps {
  data: Array<{
    name: string;
    likelihood: number;
    impact: number;
    riskLevel: string;
  }>;
}

const RISK_COLORS: Record<string, string> = {
  Critical: 'hsl(var(--destructive))',
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#22c55e',
};

export function RiskHeatMap({ data }: RiskHeatMapProps) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No risk data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Risk Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0, 5]} label={{ value: 'Likelihood', position: 'bottom', offset: 5 }} />
            <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 5]} label={{ value: 'Impact', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-background border rounded-md shadow-md p-2 text-xs">
                    <p className="font-medium">{d.name}</p>
                    <p>Likelihood: {d.likelihood}</p>
                    <p>Impact: {d.impact}</p>
                    <p>Risk: {d.riskLevel}</p>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill="hsl(var(--primary))">
              {data.map((entry, index) => (
                <Cell key={index} fill={RISK_COLORS[entry.riskLevel] || RISK_COLORS.Medium} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {level}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
