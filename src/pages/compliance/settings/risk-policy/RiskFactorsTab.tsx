import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Power, Save, RotateCcw, Loader2, Edit, Trash2, Info, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ThresholdTier {
  min: number;
  max: number;
  score: number;
  label?: string;
}

interface RiskConfigRow {
  id: string;
  factor_code: string;
  factor_name: string;
  description: string | null;
  weight: number;
  max_score: number;
  scoring_method: string | null;
  is_enabled: boolean | null;
  thresholds: ThresholdTier[] | null;
  data_source: string | null;
  calculation_formula: string | null;
  category: string | null;
}

const SCORING_METHODS = [
  { value: 'linear', label: 'Linear', desc: 'Score scales proportionally with the input value' },
  { value: 'tiered', label: 'Tiered Thresholds', desc: 'Score jumps based on defined ranges' },
  { value: 'threshold', label: 'Boolean Threshold', desc: 'Binary: score is 0 or max based on a condition' },
  { value: 'formula', label: 'Formula-Based', desc: 'Custom formula calculates the score' },
];

const DATA_SOURCES = [
  { value: 'ARREARS_LEDGER', label: 'Arrears Ledger', desc: 'Outstanding contribution arrears' },
  { value: 'VIOLATION_HISTORY', label: 'Violation History', desc: 'Count/severity of past violations' },
  { value: 'C3_SUBMISSION_HISTORY', label: 'C3 Submission History', desc: 'Filing compliance records' },
  { value: 'PAYMENT_HISTORY', label: 'Payment History', desc: 'Payment timeliness and patterns' },
  { value: 'LEGAL_HISTORY', label: 'Legal History', desc: 'Past and active legal proceedings' },
  { value: 'AUDIT_RESULTS', label: 'Audit Results', desc: 'Inspection/audit findings' },
  { value: 'EMPLOYEE_COUNT', label: 'Employee Count', desc: 'Number of registered employees' },
  { value: 'MANUAL', label: 'Manual Entry', desc: 'Manually assigned scores' },
];

const CATEGORIES = [
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'BEHAVIOURAL', label: 'Behavioural' },
  { value: 'ZONE', label: 'Zone/Region' },
  { value: 'INDUSTRY', label: 'Industry' },
];

const emptyFactor: Partial<RiskConfigRow> = {
  factor_code: '',
  factor_name: '',
  description: '',
  weight: 10,
  max_score: 100,
  scoring_method: 'tiered',
  is_enabled: true,
  data_source: 'MANUAL',
  calculation_formula: '',
  category: 'COMPLIANCE',
  thresholds: [
    { min: 0, max: 0, score: 0, label: 'None' },
    { min: 1, max: 25, score: 25, label: 'Low' },
    { min: 26, max: 50, score: 50, label: 'Medium' },
    { min: 51, max: 75, score: 75, label: 'High' },
    { min: 76, max: 100, score: 100, label: 'Critical' },
  ],
};

export default function RiskFactorsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [localWeights, setLocalWeights] = useState<Record<string, { weight: number; is_enabled: boolean }>>({});
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<Partial<RiskConfigRow> | null>(null);
  const [dialogTab, setDialogTab] = useState('basic');
  const initializedRef = useRef(false);

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ['ce_risk_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_config')
        .select('*')
        .order('weight', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RiskConfigRow[];
    },
  });

  // Sync local weights only when factors first load or after a save
  useEffect(() => {
    if (factors.length > 0 && !hasLocalChanges) {
      const weights: Record<string, { weight: number; is_enabled: boolean }> = {};
      factors.forEach(f => {
        weights[f.id] = { weight: Number(f.weight), is_enabled: f.is_enabled !== false };
      });
      setLocalWeights(weights);
      initializedRef.current = true;
    }
  }, [factors, hasLocalChanges]);

  // Save weight/enable changes with optimistic update
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [id, vals] of Object.entries(localWeights)) {
        const { error } = await supabase
          .from('ce_risk_config')
          .update({ weight: vals.weight, is_enabled: vals.is_enabled } as any)
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setHasLocalChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ce_risk_config'] });
      toast.success('Risk factor configuration saved');
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  // Create/Update factor
  const upsertMutation = useMutation({
    mutationFn: async (factor: Partial<RiskConfigRow>) => {
      const payload = {
        factor_name: factor.factor_name,
        description: factor.description,
        weight: factor.weight,
        max_score: factor.max_score,
        scoring_method: factor.scoring_method,
        is_enabled: factor.is_enabled,
        data_source: factor.data_source,
        calculation_formula: factor.calculation_formula,
        category: factor.category,
        thresholds: factor.thresholds ? JSON.stringify(factor.thresholds) : null,
      };
      if (factor.id) {
        const { error } = await supabase
          .from('ce_risk_config')
          .update(payload as any)
          .eq('id', factor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ce_risk_config')
          .insert({ ...payload, factor_code: factor.factor_code } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setHasLocalChanges(false);
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

  const getWeight = (id: string) => localWeights[id]?.weight ?? 0;
  const getEnabled = (id: string) => localWeights[id]?.is_enabled ?? true;

  const totalWeight = Object.values(localWeights)
    .filter(v => v.is_enabled)
    .reduce((sum, v) => sum + v.weight, 0);

  const updateWeight = useCallback((id: string, value: number[]) => {
    setLocalWeights(prev => ({
      ...prev,
      [id]: { ...prev[id], weight: value[0] },
    }));
    setHasLocalChanges(true);
  }, []);

  const toggleEnabled = useCallback((id: string) => {
    setLocalWeights(prev => ({
      ...prev,
      [id]: { ...prev[id], is_enabled: !prev[id]?.is_enabled },
    }));
    setHasLocalChanges(true);
  }, []);

  const resetWeights = useCallback(() => {
    const weights: Record<string, { weight: number; is_enabled: boolean }> = {};
    factors.forEach(f => {
      weights[f.id] = { weight: Number(f.weight), is_enabled: f.is_enabled !== false };
    });
    setLocalWeights(weights);
    setHasLocalChanges(false);
  }, [factors]);

  const filteredFactors = factors.filter(f =>
    f.factor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.factor_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingFactor({ ...emptyFactor });
    setDialogTab('basic');
    setDialogOpen(true);
  };

  const handleOpenEdit = (factor: RiskConfigRow) => {
    setEditingFactor({
      ...factor,
      thresholds: Array.isArray(factor.thresholds) ? factor.thresholds : [],
    });
    setDialogTab('basic');
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

  // Threshold management in dialog
  const addThreshold = () => {
    if (!editingFactor) return;
    const current = editingFactor.thresholds || [];
    const lastMax = current.length > 0 ? current[current.length - 1].max : 0;
    setEditingFactor({
      ...editingFactor,
      thresholds: [...current, { min: lastMax + 1, max: lastMax + 100, score: 0, label: '' }],
    });
  };

  const updateThreshold = (index: number, field: keyof ThresholdTier, value: string | number) => {
    if (!editingFactor?.thresholds) return;
    const updated = [...editingFactor.thresholds];
    updated[index] = { ...updated[index], [field]: field === 'label' ? value : Number(value) };
    setEditingFactor({ ...editingFactor, thresholds: updated });
  };

  const removeThreshold = (index: number) => {
    if (!editingFactor?.thresholds) return;
    setEditingFactor({
      ...editingFactor,
      thresholds: editingFactor.thresholds.filter((_, i) => i !== index),
    });
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'FINANCIAL': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'COMPLIANCE': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'BEHAVIOURAL': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search risk factors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="text-sm px-3 py-1">
              Total Weight: {totalWeight}%
            </Badge>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Factor
            </Button>
            {hasLocalChanges && (
              <>
                <Button variant="outline" size="sm" onClick={resetWeights}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Weights'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Risk Calculation Flow Info */}
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">How Risk Scoring Works:</strong> Each factor pulls data from a specific source (e.g., Arrears Ledger, Violation History). 
              The raw value is converted to a score (0–100) using the configured scoring method and thresholds. 
              The final employer risk score = <code className="text-xs bg-background px-1 py-0.5 rounded">Σ (factor_score × weight%)</code> across all active factors.
            </div>
          </div>
        </div>

        {/* Factors with Sliders */}
        <div className="space-y-4">
          {filteredFactors.map((factor) => {
            const weight = getWeight(factor.id);
            const enabled = getEnabled(factor.id);
            return (
              <div
                key={factor.id}
                className={`p-4 border rounded-lg space-y-3 transition-opacity ${!enabled ? 'opacity-50 bg-muted/30' : 'bg-card'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono">{factor.factor_code}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${getCategoryColor(factor.category)}`}>
                        {factor.category || 'GENERAL'}
                      </Badge>
                      <p className="font-medium text-foreground">{factor.factor_name}</p>
                      {factor.scoring_method && (
                        <Badge variant="secondary" className="text-[10px]">{factor.scoring_method}</Badge>
                      )}
                    </div>
                    {factor.description && (
                      <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>Source: <strong>{DATA_SOURCES.find(d => d.value === factor.data_source)?.label || factor.data_source || 'Not set'}</strong></span>
                      {factor.thresholds && Array.isArray(factor.thresholds) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help text-primary">
                              <Calculator className="h-3 w-3" /> {(factor.thresholds as ThresholdTier[]).length} tiers
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              {(factor.thresholds as ThresholdTier[]).map((t, i) => (
                                <div key={i} className="text-xs">
                                  {t.label || `Tier ${i + 1}`}: {t.min}–{t.max} → score {t.score}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary w-16 text-right">{weight}%</span>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(factor)} title="Edit factor">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEnabled(factor.id)}
                      title={enabled ? 'Disable factor' : 'Enable factor'}
                    >
                      <Power className={`h-4 w-4 ${enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(factor.id)} title="Delete factor">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {enabled && (
                  <Slider
                    value={[weight]}
                    onValueChange={(val) => updateWeight(factor.id, val)}
                    max={50}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                )}
              </div>
            );
          })}
          {filteredFactors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No risk factors found</div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Factors</div>
            <div className="text-2xl font-semibold mt-1">{factors.length}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Active Factors</div>
            <div className="text-2xl font-semibold mt-1 text-green-600">
              {Object.values(localWeights).filter(v => v.is_enabled).length}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Weight Status</div>
            <div className={`text-2xl font-semibold mt-1 ${totalWeight === 100 ? 'text-green-600' : 'text-destructive'}`}>
              {totalWeight === 100 ? '✓ Balanced' : `${totalWeight}% (need 100%)`}
            </div>
          </div>
        </div>

        {/* Create/Edit Dialog - Enhanced with Tabs */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFactor?.id ? 'Edit Risk Factor' : 'Add New Risk Factor'}</DialogTitle>
              <DialogDescription>
                Configure how this factor measures employer risk and converts data into a score
              </DialogDescription>
            </DialogHeader>
            {editingFactor && (
              <Tabs value={dialogTab} onValueChange={setDialogTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="scoring">Scoring & Data</TabsTrigger>
                  <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Factor Code *</Label>
                      <Input
                        value={editingFactor.factor_code || ''}
                        onChange={(e) => setEditingFactor({ ...editingFactor, factor_code: e.target.value })}
                        placeholder="e.g., arrears_trend"
                        disabled={!!editingFactor.id}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Unique identifier, cannot be changed after creation</p>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={editingFactor.category || 'COMPLIANCE'}
                        onValueChange={(v) => setEditingFactor({ ...editingFactor, category: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                      placeholder="What does this factor measure and why is it important?"
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
                </TabsContent>

                <TabsContent value="scoring" className="space-y-4">
                  <div>
                    <Label>Data Source</Label>
                    <Select
                      value={editingFactor.data_source || 'MANUAL'}
                      onValueChange={(v) => setEditingFactor({ ...editingFactor, data_source: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DATA_SOURCES.map(d => (
                          <SelectItem key={d.value} value={d.value}>
                            <div>
                              <span>{d.label}</span>
                              <span className="text-muted-foreground text-xs ml-2">— {d.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Where does this factor get its raw data from during score calculation?
                    </p>
                  </div>
                  <div>
                    <Label>Scoring Method</Label>
                    <Select
                      value={editingFactor.scoring_method || 'tiered'}
                      onValueChange={(v) => setEditingFactor({ ...editingFactor, scoring_method: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCORING_METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <div>
                              <span>{m.label}</span>
                              <span className="text-muted-foreground text-xs ml-2">— {m.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Calculation Formula / Logic</Label>
                    <Textarea
                      value={editingFactor.calculation_formula || ''}
                      onChange={(e) => setEditingFactor({ ...editingFactor, calculation_formula: e.target.value })}
                      placeholder="e.g., IF total_arrears > 100000 THEN 100 ELIF total_arrears > 50000 THEN 75 ELSE 0"
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Describe how raw data is converted to a risk score. Used as documentation and for the calculation engine.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="thresholds" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Score Tiers</Label>
                      <p className="text-xs text-muted-foreground">Define ranges that map raw values to risk scores</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addThreshold}>
                      <Plus className="h-3 w-3 mr-1" /> Add Tier
                    </Button>
                  </div>
                  {editingFactor.thresholds && editingFactor.thresholds.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                        <span>Label</span>
                        <span>Min</span>
                        <span>Max</span>
                        <span>Score</span>
                        <span></span>
                      </div>
                      {editingFactor.thresholds.map((tier, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 items-center">
                          <Input
                            value={tier.label || ''}
                            onChange={(e) => updateThreshold(i, 'label', e.target.value)}
                            placeholder="e.g., Low"
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={tier.min}
                            onChange={(e) => updateThreshold(i, 'min', e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={tier.max}
                            onChange={(e) => updateThreshold(i, 'max', e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            value={tier.score}
                            onChange={(e) => updateThreshold(i, 'score', e.target.value)}
                            className="h-8 text-xs"
                            min={0}
                            max={100}
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeThreshold(i)} className="h-8 w-8 p-0">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                      No thresholds defined. Click "Add Tier" to create score ranges.
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    <strong>Example:</strong> For "Arrears Amount" factor with tiered scoring:
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      <li>$0–$5,000 → Score 0 (Minimal risk)</li>
                      <li>$5,001–$20,000 → Score 25 (Low risk)</li>
                      <li>$20,001–$50,000 → Score 50 (Moderate)</li>
                      <li>$50,001–$100,000 → Score 75 (High)</li>
                      <li>$100,001+ → Score 100 (Critical)</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDialogSave} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving...' : editingFactor?.id ? 'Update Factor' : 'Create Factor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
