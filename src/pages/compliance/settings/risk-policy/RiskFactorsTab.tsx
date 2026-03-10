import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Power, Save, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RiskConfigRow {
  id: string;
  factor_code: string;
  factor_name: string;
  description: string | null;
  weight: number;
  max_score: number;
  scoring_method: string | null;
  is_enabled: boolean | null;
}

export default function RiskFactorsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [localFactors, setLocalFactors] = useState<RiskConfigRow[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['ce_risk_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_config')
        .select('*')
        .order('weight', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as unknown as RiskConfigRow[];
      setLocalFactors(rows);
      setHasLocalChanges(false);
      return rows;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const f of localFactors) {
        const { error } = await supabase
          .from('ce_risk_config')
          .update({ weight: f.weight, is_enabled: f.is_enabled } as any)
          .eq('id', f.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_config'] });
      toast.success('Risk factor configuration saved');
      setHasLocalChanges(false);
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  const totalWeight = localFactors
    .filter(f => f.is_enabled !== false)
    .reduce((sum, f) => sum + Number(f.weight), 0);

  const updateWeight = (id: string, value: number[]) => {
    setLocalFactors(prev => prev.map(f => f.id === id ? { ...f, weight: value[0] } : f));
    setHasLocalChanges(true);
  };

  const toggleEnabled = (id: string) => {
    setLocalFactors(prev => prev.map(f => f.id === id ? { ...f, is_enabled: !f.is_enabled } : f));
    setHasLocalChanges(true);
  };

  const filteredFactors = localFactors.filter(f =>
    f.factor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.factor_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search risk factors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="text-sm px-3 py-1">
            Total Weight: {totalWeight}%
          </Badge>
          {hasLocalChanges && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setLocalFactors(factors); setHasLocalChanges(false); }}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Factors with Sliders */}
      <div className="space-y-4">
        {filteredFactors.map((factor) => (
          <div
            key={factor.id}
            className={`p-4 border rounded-lg space-y-3 transition-opacity ${factor.is_enabled === false ? 'opacity-50 bg-muted/30' : 'bg-card'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{factor.factor_code}</Badge>
                  <p className="font-medium text-foreground">{factor.factor_name}</p>
                </div>
                {factor.description && (
                  <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-primary w-16 text-right">{factor.weight}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleEnabled(factor.id)}
                  title={factor.is_enabled !== false ? 'Disable factor' : 'Enable factor'}
                >
                  <Power className={`h-4 w-4 ${factor.is_enabled !== false ? 'text-green-600' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </div>
            {factor.is_enabled !== false && (
              <Slider
                value={[Number(factor.weight)]}
                onValueChange={(val) => updateWeight(factor.id, val)}
                max={50}
                min={5}
                step={5}
                className="w-full"
              />
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Max Score: {factor.max_score}</span>
              {factor.scoring_method && <span>Method: {factor.scoring_method}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Factors</div>
          <div className="text-2xl font-semibold mt-1">{localFactors.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Factors</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            {localFactors.filter(f => f.is_enabled !== false).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Weight Status</div>
          <div className={`text-2xl font-semibold mt-1 ${totalWeight === 100 ? 'text-green-600' : 'text-destructive'}`}>
            {totalWeight === 100 ? '✓ Balanced' : `${totalWeight}% (need 100%)`}
          </div>
        </div>
      </div>
    </div>
  );
}
