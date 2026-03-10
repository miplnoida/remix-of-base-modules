import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Power, Save, RotateCcw, Loader2, Edit, Trash2 } from 'lucide-react';
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
  thresholds: any;
}

const SCORING_METHODS = [
  { value: 'linear', label: 'Linear' },
  { value: 'tiered', label: 'Tiered Thresholds' },
  { value: 'threshold', label: 'Boolean Threshold' },
  { value: 'formula', label: 'Formula-Based' },
];

const emptyFactor: Partial<RiskConfigRow> = {
  factor_code: '',
  factor_name: '',
  description: '',
  weight: 10,
  max_score: 100,
  scoring_method: 'linear',
  is_enabled: true,
};

export default function RiskFactorsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [localFactors, setLocalFactors] = useState<RiskConfigRow[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<Partial<RiskConfigRow> | null>(null);

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

  // Save weight/enable changes
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

  // Create/Update factor
  const upsertMutation = useMutation({
    mutationFn: async (factor: Partial<RiskConfigRow>) => {
      if (factor.id) {
        const { error } = await supabase
          .from('ce_risk_config')
          .update({
            factor_name: factor.factor_name,
            description: factor.description,
            weight: factor.weight,
            max_score: factor.max_score,
            scoring_method: factor.scoring_method,
            is_enabled: factor.is_enabled,
          } as any)
          .eq('id', factor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ce_risk_config')
          .insert({
            factor_code: factor.factor_code,
            factor_name: factor.factor_name,
            description: factor.description,
            weight: factor.weight,
            max_score: factor.max_score,
            scoring_method: factor.scoring_method,
            is_enabled: factor.is_enabled ?? true,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_config'] });
      toast.success(editingFactor?.id ? 'Risk factor updated' : 'Risk factor created');
      setDialogOpen(false);
      setEditingFactor(null);
    },
    onError: () => toast.error('Failed to save risk factor'),
  });

  // Delete factor
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ce_risk_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_risk_config'] });
      toast.success('Risk factor deleted');
    },
    onError: () => toast.error('Failed to delete risk factor'),
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

  const handleOpenCreate = () => {
    setEditingFactor({ ...emptyFactor });
    setDialogOpen(true);
  };

  const handleOpenEdit = (factor: RiskConfigRow) => {
    setEditingFactor({ ...factor });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this risk factor?')) return;
    deleteMutation.mutate(id);
  };

  const handleDialogSave = () => {
    if (!editingFactor?.factor_code || !editingFactor?.factor_name) {
      toast.error('Factor code and name are required');
      return;
    }
    upsertMutation.mutate(editingFactor);
  };

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
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Factor
          </Button>
          {hasLocalChanges && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setLocalFactors(factors); setHasLocalChanges(false); }}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Weights'}
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
                  {factor.scoring_method && (
                    <Badge variant="secondary" className="text-[10px]">{factor.scoring_method}</Badge>
                  )}
                </div>
                {factor.description && (
                  <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary w-16 text-right">{factor.weight}%</span>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(factor)} title="Edit factor">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleEnabled(factor.id)}
                  title={factor.is_enabled !== false ? 'Disable factor' : 'Enable factor'}
                >
                  <Power className={`h-4 w-4 ${factor.is_enabled !== false ? 'text-green-600' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(factor.id)} title="Delete factor">
                  <Trash2 className="h-4 w-4 text-destructive" />
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
        {filteredFactors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No risk factors found</div>
        )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFactor?.id ? 'Edit Risk Factor' : 'Add New Risk Factor'}</DialogTitle>
            <DialogDescription>
              {editingFactor?.id ? 'Update the risk factor details' : 'Define a new risk factor for employer scoring'}
            </DialogDescription>
          </DialogHeader>
          {editingFactor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Factor Code *</Label>
                  <Input
                    value={editingFactor.factor_code || ''}
                    onChange={(e) => setEditingFactor({ ...editingFactor, factor_code: e.target.value })}
                    placeholder="e.g., arrears_trend"
                    disabled={!!editingFactor.id}
                  />
                </div>
                <div>
                  <Label>Scoring Method</Label>
                  <Select
                    value={editingFactor.scoring_method || 'linear'}
                    onValueChange={(v) => setEditingFactor({ ...editingFactor, scoring_method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCORING_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Factor Name *</Label>
                <Input
                  value={editingFactor.factor_name || ''}
                  onChange={(e) => setEditingFactor({ ...editingFactor, factor_name: e.target.value })}
                  placeholder="e.g., Arrears Trend (Increasing)"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingFactor.description || ''}
                  onChange={(e) => setEditingFactor({ ...editingFactor, description: e.target.value })}
                  placeholder="What does this factor measure?"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Weight (%)</Label>
                  <Input
                    type="number"
                    value={editingFactor.weight || 10}
                    onChange={(e) => setEditingFactor({ ...editingFactor, weight: Number(e.target.value) })}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>
                <div>
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    value={editingFactor.max_score || 100}
                    onChange={(e) => setEditingFactor({ ...editingFactor, max_score: Number(e.target.value) })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDialogSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : editingFactor?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
