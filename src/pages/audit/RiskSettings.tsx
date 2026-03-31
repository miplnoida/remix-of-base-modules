import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Shield, Settings, BarChart3, Calculator, Target, Building2, Eye, Save, AlertTriangle, Plus, Trash2, Edit, Check, X, Info } from 'lucide-react';
import { PageShell } from '@/components/common';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import {
  useIALikelihoodLevels, useIAImpactLevels,
  useIARiskClassificationThresholds,
} from '@/hooks/useAuditConfigData';
import { useRiskConfigMaster, useRiskConfigMasterMutations } from '@/hooks/useRiskConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// ============= Risk Parameters Tab =============
function RiskParametersTab() {
  const likelihood = useIALikelihoodLevels();
  const impact = useIAImpactLevels();
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ label: '', score: '', description: '' });

  const startEdit = (item: any) => {
    setEditItem(item);
    setEditForm({ label: item.label, score: String(item.score), description: item.description || '' });
  };

  const saveEdit = (type: 'likelihood' | 'impact') => {
    const hook = type === 'likelihood' ? likelihood : impact;
    hook.update.mutate({
      id: editItem.id,
      label: editForm.label,
      score: Number(editForm.score),
      description: editForm.description,
    });
    setEditItem(null);
  };

  const renderTable = (title: string, data: any[], type: 'likelihood' | 'impact', description: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Score</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">{item.score}</Badge>
                </TableCell>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.description}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => startEdit({ ...item, _type: type })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="h-4 w-4 shrink-0" />
        <span>Risk parameters define the scales used for assessing likelihood and impact. Changes here affect all risk assessments across the system.</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {renderTable('Likelihood Scale', likelihood.data, 'likelihood', 'Defines how likely a risk event is to occur')}
        {renderTable('Impact Scale', impact.data, 'impact', 'Defines the severity of impact if a risk event occurs')}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editItem?._type === 'likelihood' ? 'Likelihood' : 'Impact'} Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Score</Label>
              <Input type="number" value={editForm.score} onChange={(e) => setEditForm(p => ({ ...p, score: e.target.value }))} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={editForm.label} onChange={(e) => setEditForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => saveEdit(editItem?._type)}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= Risk Formula Tab =============
function RiskFormulaTab() {
  const { data: config, isLoading } = useRiskConfigMaster();
  const { update } = useRiskConfigMasterMutations();
  const { userCode } = useUserCode();
  const [formula, setFormula] = useState('likelihood_x_impact');
  const [formulaDisplay, setFormulaDisplay] = useState('Likelihood × Impact');

  useEffect(() => {
    if (config) {
      setFormula(config.formula_type);
      setFormulaDisplay(config.formula_display);
    }
  }, [config]);

  const FORMULAS = [
    { value: 'likelihood_x_impact', label: 'Likelihood × Impact', desc: 'Standard multiplication model. Score range: 1–25 (for 5×5 scale).' },
    { value: 'likelihood_plus_impact', label: 'Likelihood + Impact', desc: 'Additive model. Score range: 2–10 (for 5×5 scale).' },
    { value: 'weighted_average', label: 'Weighted Average', desc: 'Average of both values. Score range: 1–5 (for 5×5 scale).' },
  ];

  const handleSave = () => {
    if (!config) return;
    const selected = FORMULAS.find(f => f.value === formula);
    update.mutate({
      id: config.id,
      formula_type: formula,
      formula_display: selected?.label || formulaDisplay,
      updated_by: userCode || 'SYSTEM',
    });
  };

  const selectedFormula = FORMULAS.find(f => f.value === formula);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Scoring Formula
          </CardTitle>
          <CardDescription>Define how risk scores are calculated from individual parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {FORMULAS.map(f => (
              <div
                key={f.value}
                onClick={() => setFormula(f.value)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formula === f.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formula === f.value ? 'border-primary' : 'border-muted-foreground/40'
                  }`}>
                    {formula === f.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium">{f.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-6">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Example Calculation */}
          <Separator />
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Example Calculation</h4>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-background px-3 py-1.5 rounded border">Likelihood = <strong>4</strong></span>
              <span className="text-muted-foreground">
                {formula === 'likelihood_x_impact' ? '×' : formula === 'likelihood_plus_impact' ? '+' : 'avg with'}
              </span>
              <span className="bg-background px-3 py-1.5 rounded border">Impact = <strong>3</strong></span>
              <span className="text-muted-foreground">=</span>
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/30 font-bold">
                Score = {formula === 'likelihood_x_impact' ? 12 : formula === 'likelihood_plus_impact' ? 7 : 4}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={update.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save Formula
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Risk Rating Bands Tab =============
function RiskBandsTab() {
  const thresholds = useIARiskClassificationThresholds();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [editBand, setEditBand] = useState<any>(null);
  const [bandForm, setBandForm] = useState({ label: '', min_score: '', max_score: '', color: '#22c55e' });
  const [showAdd, setShowAdd] = useState(false);

  const bands = useMemo(() => (thresholds.data || []).sort((a: any, b: any) => a.min_score - b.min_score), [thresholds.data]);

  const validateBands = (newBands: any[]): string | null => {
    const sorted = [...newBands].sort((a, b) => a.min_score - b.min_score);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].min_score > sorted[i].max_score) return `${sorted[i].label}: min > max`;
      if (i > 0) {
        if (sorted[i].min_score !== sorted[i - 1].max_score + 1) {
          return `Gap or overlap between "${sorted[i - 1].label}" and "${sorted[i].label}"`;
        }
      }
    }
    return null;
  };

  const startEdit = (band: any) => {
    setEditBand(band);
    setBandForm({
      label: band.label,
      min_score: String(band.min_score),
      max_score: String(band.max_score),
      color: band.color || '#22c55e',
    });
  };

  const saveBand = () => {
    const payload = {
      label: bandForm.label,
      min_score: Number(bandForm.min_score),
      max_score: Number(bandForm.max_score),
      color: bandForm.color,
      updated_by: userCode || 'SYSTEM',
    };

    if (editBand) {
      // Check for overlaps with other bands
      const otherBands = bands.filter((b: any) => b.id !== editBand.id);
      const err = validateBands([...otherBands, payload]);
      if (err) {
        toast({ title: 'Validation Error', description: err, variant: 'destructive' });
        return;
      }
      thresholds.update.mutate({ id: editBand.id, ...payload });
    } else {
      const err = validateBands([...bands, payload]);
      if (err) {
        toast({ title: 'Validation Error', description: err, variant: 'destructive' });
        return;
      }
      thresholds.create.mutate({ ...payload, sort_order: bands.length + 1, is_active: true });
    }
    setEditBand(null);
    setShowAdd(false);
  };

  const deleteBand = (id: string) => {
    thresholds.remove.mutate(id);
  };

  const COLORS = [
    { value: '#22c55e', label: 'Green' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#f97316', label: 'Orange' },
    { value: '#ef4444', label: 'Red' },
    { value: '#7f1d1d', label: 'Dark Red' },
    { value: '#3b82f6', label: 'Blue' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span>Changing rating bands will affect all risk assessments across the system. Ensure full score coverage with no gaps or overlaps.</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Risk Rating Bands
            </CardTitle>
            <CardDescription>Define score ranges and their corresponding risk labels</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setShowAdd(true); setEditBand(null); setBandForm({ label: '', min_score: '', max_score: '', color: '#22c55e' }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Band
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Color</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Min Score</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Range</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bands.map((band: any) => (
                <TableRow key={band.id}>
                  <TableCell>
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: band.color }} />
                  </TableCell>
                  <TableCell className="font-medium">{band.label}</TableCell>
                  <TableCell>{band.min_score}</TableCell>
                  <TableCell>{band.max_score}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3 rounded"
                        style={{
                          backgroundColor: band.color,
                          width: `${((band.max_score - band.min_score + 1) / 25) * 100}%`,
                          minWidth: '20px',
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {band.max_score - band.min_score + 1} pts
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(band)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteBand(band.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Visual score bar */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium mb-2 text-muted-foreground">Score Coverage (1–25)</p>
            <div className="flex h-6 rounded overflow-hidden border">
              {bands.map((band: any) => (
                <div
                  key={band.id}
                  className="flex items-center justify-center text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: band.color,
                    width: `${((band.max_score - band.min_score + 1) / 25) * 100}%`,
                  }}
                  title={`${band.label}: ${band.min_score}–${band.max_score}`}
                >
                  {band.label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={!!editBand || showAdd} onOpenChange={() => { setEditBand(null); setShowAdd(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBand ? 'Edit' : 'Add'} Rating Band</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input value={bandForm.label} onChange={(e) => setBandForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g., Critical" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Score</Label>
                <Input type="number" value={bandForm.min_score} onChange={(e) => setBandForm(p => ({ ...p, min_score: e.target.value }))} />
              </div>
              <div>
                <Label>Max Score</Label>
                <Input type="number" value={bandForm.max_score} onChange={(e) => setBandForm(p => ({ ...p, max_score: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setBandForm(p => ({ ...p, color: c.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      bandForm.color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
                <Input
                  type="color"
                  value={bandForm.color}
                  onChange={(e) => setBandForm(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBand(null); setShowAdd(false); }}>Cancel</Button>
            <Button onClick={saveBand}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= Department Risk Method Tab =============
function DeptMethodTab() {
  const { data: config } = useRiskConfigMaster();
  const { update } = useRiskConfigMasterMutations();
  const { userCode } = useUserCode();
  const [method, setMethod] = useState('maximum');

  useEffect(() => {
    if (config) setMethod(config.dept_risk_method);
  }, [config]);

  const METHODS = [
    {
      value: 'maximum',
      label: 'Maximum Function Risk',
      desc: 'Department risk = the highest risk score among all its functions. Best when you want the department rating to reflect its riskiest area.',
      icon: '⬆️',
    },
    {
      value: 'average',
      label: 'Average Function Risk',
      desc: 'Department risk = the average of all function risk scores. Best for a balanced view across all areas.',
      icon: '📊',
    },
    {
      value: 'weighted',
      label: 'Weighted Risk (Future)',
      desc: 'Department risk = weighted average based on function criticality. Requires weight assignment per function.',
      icon: '⚖️',
      disabled: true,
    },
  ];

  const handleSave = () => {
    if (!config) return;
    update.mutate({ id: config.id, dept_risk_method: method, updated_by: userCode || 'SYSTEM' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Department Risk Calculation
          </CardTitle>
          <CardDescription>Choose how department-level risk is derived from its functions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {METHODS.map(m => (
            <div
              key={m.value}
              onClick={() => !m.disabled && setMethod(m.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                m.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                method === m.value && !m.disabled
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.label}</span>
                    {m.disabled && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={update.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Preview Panel =============
function PreviewPanel() {
  const { data: likelihoodData = [] } = useIALikelihoodLevels();
  const { data: impactData = [] } = useIAImpactLevels();
  const { data: config } = useRiskConfigMaster();
  const thresholds = useIARiskClassificationThresholds();
  const bands = useMemo(() => (thresholds.data || []).sort((a: any, b: any) => a.min_score - b.min_score), [thresholds.data]);

  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);

  const calculateScore = (l: number, i: number): number => {
    const f = config?.formula_type || 'likelihood_x_impact';
    if (f === 'likelihood_x_impact') return l * i;
    if (f === 'likelihood_plus_impact') return l + i;
    return Math.round((l + i) / 2);
  };

  const score = calculateScore(likelihood, impact);
  const rating = useMemo(() => {
    for (const band of bands) {
      if (score >= band.min_score && score <= band.max_score) {
        return { label: band.label, color: band.color };
      }
    }
    return { label: 'Unknown', color: '#6b7280' };
  }, [score, bands]);

  const likelihoodLabel = likelihoodData.find((l: any) => l.score === likelihood)?.label || '';
  const impactLabel = impactData.find((i: any) => i.score === impact)?.label || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Eye className="h-4 w-4 shrink-0" />
        <span>Use this panel to test your risk configuration. Adjust likelihood and impact to see the resulting score and rating.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Likelihood</Label>
                <Badge variant="outline">{likelihood} — {likelihoodLabel}</Badge>
              </div>
              <Slider
                value={[likelihood]}
                onValueChange={([v]) => setLikelihood(v)}
                min={config?.scale_min || 1}
                max={config?.scale_max || 5}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                {likelihoodData.map((l: any) => (
                  <span key={l.id}>{l.score}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Impact</Label>
                <Badge variant="outline">{impact} — {impactLabel}</Badge>
              </div>
              <Slider
                value={[impact]}
                onValueChange={([v]) => setImpact(v)}
                min={config?.scale_min || 1}
                max={config?.scale_max || 5}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                {impactData.map((i: any) => (
                  <span key={i.id}>{i.score}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Formula: {config?.formula_display || 'Likelihood × Impact'}</p>
              <p className="text-lg">
                {likelihood} {config?.formula_type === 'likelihood_plus_impact' ? '+' : '×'} {impact}
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold" style={{ color: rating.color }}>
                {score}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Risk Score</p>
            </div>
            <Badge
              className="text-lg px-6 py-2 text-white"
              style={{ backgroundColor: rating.color }}
            >
              {rating.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* 5x5 mini matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Matrix Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-muted-foreground border">L \ I</th>
                  {impactData.map((i: any) => (
                    <th key={i.id} className="p-2 text-xs text-center border">{i.score}<br /><span className="text-muted-foreground">{i.label}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...likelihoodData].reverse().map((l: any) => (
                  <tr key={l.id}>
                    <td className="p-2 text-xs border font-medium">{l.score} — {l.label}</td>
                    {impactData.map((i: any) => {
                      const s = calculateScore(l.score, i.score);
                      const r = bands.find((b: any) => s >= b.min_score && s <= b.max_score);
                      const isSelected = l.score === likelihood && i.score === impact;
                      return (
                        <td
                          key={i.id}
                          className={`p-2 text-center text-xs font-bold border cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-foreground ring-offset-1' : ''
                          }`}
                          style={{ backgroundColor: r?.color || '#6b7280', color: 'white' }}
                          onClick={() => { setLikelihood(l.score); setImpact(i.score); }}
                        >
                          {s}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Main Component =============
export default function RiskSettings() {
  const [activeTab, setActiveTab] = useState('parameters');

  return (
    <PageShell
      title="Risk Configuration"
      subtitle="Centralized risk settings for the Internal Audit module"
      icon={Shield}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="parameters">
            <Target className="h-4 w-4 mr-1.5" /> Parameters
          </TabsTrigger>
          <TabsTrigger value="formula">
            <Calculator className="h-4 w-4 mr-1.5" /> Formula
          </TabsTrigger>
          <TabsTrigger value="bands">
            <BarChart3 className="h-4 w-4 mr-1.5" /> Rating Bands
          </TabsTrigger>
          <TabsTrigger value="dept-method">
            <Building2 className="h-4 w-4 mr-1.5" /> Dept Method
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-1.5" /> Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parameters"><RiskParametersTab /></TabsContent>
        <TabsContent value="formula"><RiskFormulaTab /></TabsContent>
        <TabsContent value="bands"><RiskBandsTab /></TabsContent>
        <TabsContent value="dept-method"><DeptMethodTab /></TabsContent>
        <TabsContent value="preview"><PreviewPanel /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
