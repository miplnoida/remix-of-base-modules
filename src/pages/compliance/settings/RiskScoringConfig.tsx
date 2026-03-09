import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const riskFactors = [
  { code: 'arrears', name: 'Arrears Amount', weight: 25, maxScore: 100 },
  { code: 'violations', name: 'Repeated Violations', weight: 25, maxScore: 100 },
  { code: 'filings', name: 'Missed Filings', weight: 20, maxScore: 100 },
  { code: 'legal', name: 'Legal History', weight: 15, maxScore: 100 },
  { code: 'payment', name: 'Payment Behavior', weight: 15, maxScore: 100 },
];

const bands = [
  { name: 'Low', range: '0–25', color: 'bg-success/10 text-success border-success/20' },
  { name: 'Medium', range: '26–50', color: 'bg-warning/10 text-warning border-warning/20' },
  { name: 'High', range: '51–75', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { name: 'Critical', range: '76–100', color: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const RiskScoringConfig = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Risk Scoring Configuration</h1>
          </div>
          <p className="text-muted-foreground">
            Configure risk factor weights and band thresholds for employer risk classification
          </p>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Bands</CardTitle>
          <CardDescription>Score ranges that determine employer risk classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {bands.map((band) => (
              <div key={band.name} className="text-center p-4 border rounded-lg">
                <Badge variant="outline" className={band.color}>{band.name}</Badge>
                <p className="mt-2 text-lg font-bold text-foreground">{band.range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Factor Weights</CardTitle>
          <CardDescription>Total weights must sum to 100</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {riskFactors.map((factor) => (
            <div key={factor.code} className="grid grid-cols-3 gap-4 items-center border-b pb-4 last:border-0">
              <div>
                <p className="font-medium text-foreground">{factor.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{factor.code}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weight (%)</Label>
                <Input type="number" value={factor.weight} className="h-8" readOnly />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Score</Label>
                <Input type="number" value={factor.maxScore} className="h-8" readOnly />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Configuration is read-only until database tables are created.
      </p>
    </div>
  );
};

export default RiskScoringConfig;
