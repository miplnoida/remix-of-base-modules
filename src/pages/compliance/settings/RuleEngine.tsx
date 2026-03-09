import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Cog, Plus, Zap, Calculator, TrendingUp, Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DetectionRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  trigger_event: string;
  frequency: string | null;
  priority: string | null;
  auto_create_violation: boolean | null;
  is_enabled: boolean | null;
}

interface CalculationRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  applies_to: string;
  formula_expression: string;
  source_config: string | null;
  is_enabled: boolean | null;
}

interface EscalationRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  from_status: string;
  to_status: string;
  condition_expression: string | null;
  days_threshold: number | null;
  auto_escalate: boolean | null;
  is_enabled: boolean | null;
}

const RuleEngine = () => {
  const [activeTab, setActiveTab] = useState('detection');
  const queryClient = useQueryClient();

  const { data: detectionRules = [], isLoading: loadingDetection } = useQuery({
    queryKey: ['ce_detection_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_detection_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as DetectionRule[];
    },
  });

  const { data: calculationRules = [], isLoading: loadingCalc } = useQuery({
    queryKey: ['ce_calculation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_calculation_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as CalculationRule[];
    },
  });

  const { data: escalationRules = [], isLoading: loadingEsc } = useQuery({
    queryKey: ['ce_escalation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_escalation_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as EscalationRule[];
    },
  });

  const toggleDetection = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_detection_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_detection_rules'] }); toast.success('Rule updated'); },
  });

  const toggleCalc = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_calculation_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_calculation_rules'] }); toast.success('Rule updated'); },
  });

  const toggleEsc = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_escalation_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_escalation_rules'] }); toast.success('Rule updated'); },
  });

  const isLoading = loadingDetection || loadingCalc || loadingEsc;

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
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Rule Engine</h1>
          </div>
          <p className="text-muted-foreground">Configure detection, calculation, and escalation rules for automated compliance enforcement</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Rule</Button>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="detection" className="gap-2"><Zap className="h-4 w-4" />Detection Rules ({detectionRules.length})</TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2"><Calculator className="h-4 w-4" />Calculation Rules ({calculationRules.length})</TabsTrigger>
            <TabsTrigger value="escalation" className="gap-2"><TrendingUp className="h-4 w-4" />Escalation Rules ({escalationRules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="detection">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Detection rules automatically create violations when compliance conditions are met.</p>
              {detectionRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.frequency}</Badge>
                      <Badge variant={rule.priority === 'Critical' ? 'destructive' : rule.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">{rule.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleDetection.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calculation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Calculation rules define how penalties, interest, and fines are computed. Financial rates are referenced from C3 Configuration.</p>
              {calculationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">Source: {rule.source_config}</Badge>
                    </div>
                    <p className="text-xs font-mono text-primary">{rule.formula_expression}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleCalc.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="escalation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Escalation rules define when violations or cases are automatically escalated based on time, amount, or status conditions.</p>
              {escalationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      {rule.auto_escalate && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Execute</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">When:</span> {rule.description}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">From:</span> {rule.from_status} → <span className="text-foreground">{rule.to_status}</span></p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleEsc.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default RuleEngine;
