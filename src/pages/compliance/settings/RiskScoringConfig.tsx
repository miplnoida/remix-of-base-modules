import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Save, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

const RiskScoringConfig = () => {
  const [factors, setFactors] = useState([
    { code: 'arrears', name: 'Arrears Amount', weight: 25, description: 'Total outstanding arrears across all funds (SS, LV, PE)' },
    { code: 'violations', name: 'Repeated Violations', weight: 25, description: 'Number and recency of compliance violations in rolling 12 months' },
    { code: 'filings', name: 'Missed Filings', weight: 20, description: 'Count of missed or late C3 submissions in rolling 12 months' },
    { code: 'legal', name: 'Legal History', weight: 15, description: 'Prior legal escalations, court appearances, judgments' },
    { code: 'payment', name: 'Payment Behavior', weight: 15, description: 'Payment timeliness, partial payments, arrangement compliance' },
  ]);

  const [bands, setBands] = useState([
    { name: 'Low', min: 0, max: 25, color: 'text-success', bg: 'bg-success/10 border-success/20', action: 'Standard monitoring' },
    { name: 'Medium', min: 26, max: 50, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', action: 'Enhanced monitoring, quarterly review' },
    { name: 'High', min: 51, max: 75, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', action: 'Active case management, inspection priority' },
    { name: 'Critical', min: 76, max: 100, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', action: 'Immediate escalation, legal review' },
  ]);

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  const updateWeight = (code: string, value: number[]) => {
    setFactors(prev => prev.map(f => f.code === code ? { ...f, weight: value[0] } : f));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Risk Scoring Configuration</h1>
          </div>
          <p className="text-muted-foreground">Configure risk factor weights and band thresholds for employer risk classification</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button className="gap-2"><Save className="h-4 w-4" />Save Configuration</Button>
        </div>
      </div>

      {/* Risk Bands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Bands</CardTitle>
          <CardDescription>Score ranges that determine employer risk classification and recommended actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {bands.map((band) => (
              <div key={band.name} className="p-4 border border-border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${band.bg} ${band.color}`}>{band.name}</Badge>
                  <span className="text-lg font-bold text-foreground">{band.min}–{band.max}</span>
                </div>
                <p className="text-xs text-muted-foreground">{band.action}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Min</Label>
                    <Input type="number" value={band.min} className="h-7 text-xs" readOnly />
                  </div>
                  <div>
                    <Label className="text-[10px]">Max</Label>
                    <Input type="number" value={band.max} className="h-7 text-xs" readOnly />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Factor Weights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Risk Factor Weights</CardTitle>
              <CardDescription>Adjust the relative importance of each risk factor</CardDescription>
            </div>
            <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="text-sm px-3">
              Total: {totalWeight}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {factors.map((factor) => (
            <div key={factor.code} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{factor.name}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
                <span className="text-lg font-bold text-primary w-16 text-right">{factor.weight}%</span>
              </div>
              <Slider
                value={[factor.weight]}
                onValueChange={(val) => updateWeight(factor.code, val)}
                max={50}
                min={5}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskScoringConfig;
