import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Edit, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ViolationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  severity_default: string | null;
  auto_detect: boolean | null;
  grace_period_days: number | null;
  applicable_funds: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const fetchViolationTypes = async (): Promise<ViolationType[]> => {
  const { data, error } = await supabase
    .from('ce_violation_types')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ViolationType[];
};

const ViolationTypes = () => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: violationTypes = [], isLoading } = useQuery({
    queryKey: ['ce_violation_types'],
    queryFn: fetchViolationTypes,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ce_violation_types')
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success('Violation type updated');
    },
    onError: () => toast.error('Failed to update violation type'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = [...new Set(violationTypes.map(v => v.category).filter(Boolean))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Violation Types</h1>
          </div>
          <p className="text-muted-foreground">Configure violation type definitions used across the compliance module</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Violation Type</Button>
      </div>

      <div className="flex gap-3">
        {categories.map(cat => (
          <Badge key={cat} variant="outline" className="py-1 px-3">
            {cat}: {violationTypes.filter(v => v.category === cat).length}
          </Badge>
        ))}
      </div>

      <div className="grid gap-3">
        {violationTypes.map((vt) => (
          <Card key={vt.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{vt.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{vt.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{vt.category}</Badge>
                      {vt.auto_detect && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Detect</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{vt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex gap-1">
                    {(vt.applicable_funds || []).map(f => <Badge key={f} variant="outline" className="text-[10px] h-5">{f}</Badge>)}
                  </div>
                  <Badge variant={
                    vt.severity_default === 'Critical' ? 'destructive' :
                    vt.severity_default === 'High' ? 'default' : 'secondary'
                  } className="text-[10px]">
                    {vt.severity_default}
                  </Badge>
                  <Switch
                    checked={vt.is_active ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: vt.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setExpandedCode(expandedCode === vt.code ? null : vt.code)}>
                    {expandedCode === vt.code ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {expandedCode === vt.code && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{vt.category}</span></div>
                  <div><span className="text-muted-foreground">Grace Period:</span> <span className="font-medium text-foreground">{vt.grace_period_days} days</span></div>
                  <div><span className="text-muted-foreground">Auto-Detection:</span> <span className="font-medium text-foreground">{vt.auto_detect ? 'Yes' : 'No (Manual)'}</span></div>
                  <div><span className="text-muted-foreground">Applicable Funds:</span> <span className="font-medium text-foreground">{(vt.applicable_funds || []).join(', ')}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {violationTypes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No violation types configured</div>
        )}
      </div>
    </div>
  );
};

export default ViolationTypes;
