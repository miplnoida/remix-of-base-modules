import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RiskConfig {
  id: string;
  factor_code: string;
  factor_name: string;
  description: string | null;
  weight: number;
  max_score: number;
  scoring_method: string | null;
  is_enabled: boolean | null;
}

const bands = [
  { name: 'Low', min: 0, max: 25, color: 'text-success', bg: 'bg-success/10 border-success/20', action: 'Standard monitoring' },
  { name: 'Medium', min: 26, max: 50, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', action: 'Enhanced monitoring, quarterly review' },
  { name: 'High', min: 51, max: 75, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', action: 'Active case management, inspection priority' },
  { name: 'Critical', min: 76, max: 100, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', action: 'Immediate escalation, legal review' },
];

const RiskScoringConfig = () => {
  const queryClient = useQueryClient();
  const [localFactors, setLocalFactors] = useState<RiskConfig[]>([]);

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['ce_risk_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_risk_config').select('*').order('weight', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RiskConfig[];
    },
  });

  useEffect(() => {
    if (factors.length > 0) setLocalFactors(factors);
  }, [factors]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const f of localFactors) {
        const { error } = await supabase
          .from('ce_risk_config')
          .update({ weight: f.weight } as any)
          .eq('id', f.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_config'] });
      toast.success('Risk configuration saved');
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  const totalWeight = localFactors.reduce((sum, f) => sum + Number(f.weight), 0);

  const updateWeight = (code: string, value: number[]) => {
    setLocalFactors(prev => prev.map(f => f.factor_code === code ? { ...f, weight: value[0] } : f));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <Button variant="outline" className="gap-2" onClick={() => setLocalFactors(factors)}><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />{saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

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
          {localFactors.map((factor) => (
            <div key={factor.factor_code} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{factor.factor_name}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
                <span className="text-lg font-bold text-primary w-16 text-right">{factor.weight}%</span>
              </div>
              <Slider
                value={[Number(factor.weight)]}
                onValueChange={(val) => updateWeight(factor.factor_code, val)}
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
