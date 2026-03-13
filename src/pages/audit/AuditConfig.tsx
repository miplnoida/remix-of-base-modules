import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Bell, Shield, Flag, MapPin, Plus, Trash2, Target, Clock, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfigChangeRequests, useConfigChangeRequestMutations } from '@/hooks/useConfigChangeRequests';

import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell } from '@/components/common';
import {
  useIAAuditSettings, useIAAuditSettingMutations,
  useIARiskCriteria, useIARiskCriteriaMutations,
  useIAActivityTypes, useIAActivityTypeMutations,
  useIARiskScoringModel, useIARiskScoringModelMutations,
  useIARiskCriteriaWeights, useIARiskCriteriaWeightMutations,
  useIAFrequencyMapping,
  useIALikelihoodLevels, useIAImpactLevels,
  useIAControlEffectivenessLevels, useIARiskClassificationThresholds,
} from '@/hooks/useAuditConfigData';

export default function AuditConfig() {
  
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || 'system';

  const { data: allSettings = [], isLoading: settingsLoading } = useIAAuditSettings();
  const { data: riskCriteria = [], isLoading: riskLoading } = useIARiskCriteria();
  const { data: activityTypes = [], isLoading: typesLoading } = useIAActivityTypes();
  const { upsert: upsertSettings } = useIAAuditSettingMutations();
  const { update: updateRisk, create: createRisk, remove: removeRisk } = useIARiskCriteriaMutations();
  const { update: updateType } = useIAActivityTypeMutations();

  // Scoring model
  const { data: scoringModel, isLoading: modelLoading } = useIARiskScoringModel();
  const { update: updateModel } = useIARiskScoringModelMutations();
  const { data: criteriaWeights = [] } = useIARiskCriteriaWeights(scoringModel?.id);
  const { create: createWeight, update: updateWeight, remove: removeWeight } = useIARiskCriteriaWeightMutations();
  const { data: frequencyMap = {} } = useIAFrequencyMapping();

  // Risk Management config hooks
  const { data: likelihoodLevels = [], create: createLikelihood, update: updateLikelihood, remove: removeLikelihood } = useIALikelihoodLevels();
  const { data: impactLevels = [], create: createImpact, update: updateImpact, remove: removeImpact } = useIAImpactLevels();
  const { data: effectivenessLevels = [], create: createEffectiveness, update: updateEffectiveness, remove: removeEffectiveness } = useIAControlEffectivenessLevels();
  const { data: classificationThresholds = [], create: createThreshold, update: updateThreshold, remove: removeThreshold } = useIARiskClassificationThresholds();

  // Threshold state
  const [thresholds, setThresholds] = useState({ critical: 90, high: 75, medium: 50 });
  useEffect(() => {
    if (scoringModel) {
      setThresholds({
        critical: Number(scoringModel.critical_threshold) || 90,
        high: Number(scoringModel.high_threshold) || 75,
        medium: Number(scoringModel.medium_threshold) || 50,
      });
    }
  }, [scoringModel]);

  // Frequency state
  const [freqSettings, setFreqSettings] = useState<Record<string, string>>({ Critical: '6', High: '12', Medium: '24', Low: '36' });
  useEffect(() => {
    if (Object.keys(frequencyMap).length > 0) {
      setFreqSettings({
        Critical: String(frequencyMap['Critical'] || 6),
        High: String(frequencyMap['High'] || 12),
        Medium: String(frequencyMap['Medium'] || 24),
        Low: String(frequencyMap['Low'] || 36),
      });
    }
  }, [frequencyMap]);

  // New criterion form
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState('');

  // New row forms for Risk Management
  const [newLikelihood, setNewLikelihood] = useState({ label: '', score: '', description: '' });
  const [newImpact, setNewImpact] = useState({ label: '', score: '', description: '' });
  const [newEffectiveness, setNewEffectiveness] = useState({ label: '', reduction_percentage: '', description: '' });
  const [newClassification, setNewClassification] = useState({ label: '', min_score: '', max_score: '', color: '#gray' });

  // Config Change Requests
  const { data: changeRequests = [] } = useConfigChangeRequests();
  const { review: reviewChangeRequest } = useConfigChangeRequestMutations();
  const pendingRequests = changeRequests.filter((r: any) => r.status === 'Pending');
  const decidedRequests = changeRequests.filter((r: any) => r.status !== 'Pending');

  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allSettings.forEach((s: any) => {
      if (!map[s.setting_category]) map[s.setting_category] = {};
      map[s.setting_category][s.setting_key] = s.setting_value;
    });
    return map;
  }, [allSettings]);

  // Notifications & SLA
  const [slaSettings, setSlaSettings] = useState({ defaultResponseDays: '14', reminderDaysBefore: '3', autoNotifyOnPlanApproval: false });
  const [featureFlags, setFeatureFlags] = useState({ enableReportBuilder: true });
  const [refSettings, setRefSettings] = useState({ defaultFiscalYear: '2026', locations: 'St Kitts, Nevis' });

  useEffect(() => {
    if (settingsMap.sla) {
      const s = settingsMap.sla;
      setSlaSettings({ defaultResponseDays: s.defaultResponseDays || '14', reminderDaysBefore: s.reminderDaysBefore || '3', autoNotifyOnPlanApproval: s.autoNotifyOnPlanApproval === 'true' });
    }
    if (settingsMap.features) {
      const f = settingsMap.features;
      setFeatureFlags({ enableReportBuilder: f.enableReportBuilder !== 'false' });
    }
    if (settingsMap.reference) {
      const r = settingsMap.reference;
      setRefSettings({ defaultFiscalYear: r.defaultFiscalYear || '2026', locations: r.locations || 'St Kitts, Nevis' });
    }
  }, [settingsMap]);

  const saveCategory = (category: string, data: Record<string, any>) => {
    const entries = Object.entries(data).map(([key, value]) => ({
      setting_category: category, setting_key: key, setting_value: String(value), updated_by: userCode,
    }));
    upsertSettings.mutate(entries);
  };

  const totalWeight = criteriaWeights.reduce((sum: number, c: any) => sum + Number(c.weight || 0), 0);

  const handleAddCriterion = () => {
    if (!newCriterionName.trim() || !newCriterionWeight.trim() || !scoringModel?.id) return;
    createWeight.mutate({
      model_id: scoringModel.id,
      criterion_name: newCriterionName.trim(),
      weight: Number(newCriterionWeight),
      max_score: 100,
      sort_order: criteriaWeights.length + 1,
      is_active: true,
    });
    setNewCriterionName('');
    setNewCriterionWeight('');
  };

  const handleSaveThresholds = () => {
    if (!scoringModel?.id) return;
    updateModel.mutate({
      id: scoringModel.id,
      critical_threshold: thresholds.critical,
      high_threshold: thresholds.high,
      medium_threshold: thresholds.medium,
      low_threshold: 0,
      updated_by: userCode,
    });
  };

  const handleSaveFrequency = () => {
    const entries = Object.entries(freqSettings).map(([key, value]) => ({
      setting_category: 'risk_frequency', setting_key: key, setting_value: value, updated_by: userCode,
    }));
    upsertSettings.mutate(entries);
  };

  const isLoading = settingsLoading || riskLoading || typesLoading || modelLoading;

  return (
    <PageShell
      title="System Configuration"
      subtitle="Configure Internal Audit system settings"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'System Configuration' }]}
      isLoading={isLoading}
    >
      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="risk"><Shield className="w-4 h-4 mr-2" />Risk Assessment</TabsTrigger>
          <TabsTrigger value="riskMgmt"><BarChart3 className="w-4 h-4 mr-2" />Risk Management</TabsTrigger>
          <TabsTrigger value="configApprovals" className="relative">
            <CheckCircle className="w-4 h-4 mr-2" />Config Approvals
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1 text-[10px]">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sla"><Bell className="w-4 h-4 mr-2" />Notifications & SLA</TabsTrigger>
          <TabsTrigger value="features"><Flag className="w-4 h-4 mr-2" />Feature Flags</TabsTrigger>
          <TabsTrigger value="reference"><MapPin className="w-4 h-4 mr-2" />Reference Settings</TabsTrigger>
          <TabsTrigger value="activities"><Settings className="w-4 h-4 mr-2" />Activity Types</TabsTrigger>
        </TabsList>

        {/* ===== Risk Assessment Configuration ===== */}
        <TabsContent value="risk" className="space-y-6">
          {/* Criteria Weights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Risk Criteria & Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span>Total Weight:</span>
                <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className={totalWeight === 100 ? 'bg-green-600' : ''}>
                  {totalWeight}%
                </Badge>
                {totalWeight !== 100 && <span className="text-destructive text-xs">Weights must sum to 100%</span>}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criterion</TableHead>
                    <TableHead className="w-24">Weight (%)</TableHead>
                    <TableHead className="w-24">Max Score</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteriaWeights.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.criterion_name}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8" value={c.weight} min={0} max={100}
                          onChange={(e) => updateWeight.mutate({ id: c.id, weight: Number(e.target.value), updated_by: userCode } as any)} />
                      </TableCell>
                      <TableCell>{c.max_score}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeWeight.mutate(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {criteriaWeights.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No criteria configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Add new criterion */}
              <div className="flex items-end gap-3 pt-2 border-t">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Criterion Name</Label>
                  <Input value={newCriterionName} onChange={(e) => setNewCriterionName(e.target.value)} placeholder="e.g., Management Concern" />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Weight (%)</Label>
                  <Input type="number" value={newCriterionWeight} onChange={(e) => setNewCriterionWeight(e.target.value)} min={1} max={100} />
                </div>
                <Button onClick={handleAddCriterion} disabled={!newCriterionName.trim() || !newCriterionWeight.trim()}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Risk Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Risk Level Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Define the score boundaries for each risk level. Scores are evaluated top-down (Critical first).</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Critical ≥</Label>
                  <Input type="number" value={thresholds.critical} onChange={(e) => setThresholds(t => ({ ...t, critical: Number(e.target.value) }))} min={0} max={100} />
                </div>
                <div className="space-y-2">
                  <Label>High ≥</Label>
                  <Input type="number" value={thresholds.high} onChange={(e) => setThresholds(t => ({ ...t, high: Number(e.target.value) }))} min={0} max={100} />
                </div>
                <div className="space-y-2">
                  <Label>Medium ≥</Label>
                  <Input type="number" value={thresholds.medium} onChange={(e) => setThresholds(t => ({ ...t, medium: Number(e.target.value) }))} min={0} max={100} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Low = scores below Medium threshold ({thresholds.medium})</p>
              <Button onClick={handleSaveThresholds} disabled={updateModel.isPending}>
                {updateModel.isPending ? 'Saving...' : 'Save Thresholds'}
              </Button>
            </CardContent>
          </Card>

          {/* Audit Frequency Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Audit Frequency Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Define how often each risk level should be audited (in months).</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['Critical', 'High', 'Medium', 'Low'] as const).map(level => (
                  <div key={level} className="space-y-2">
                    <Label>{level} Risk</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={freqSettings[level] || ''} onChange={(e) => setFreqSettings(f => ({ ...f, [level]: e.target.value }))} min={1} max={60} />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">months</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveFrequency} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Frequency Mapping'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Risk Management Configuration ===== */}
        <TabsContent value="riskMgmt" className="space-y-6">
          {/* Likelihood Levels */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Likelihood Levels</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-20">Score</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {likelihoodLevels.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.label} onBlur={(e) => { if (e.target.value !== l.label) updateLikelihood.mutate({ id: l.id, label: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-16 h-8" defaultValue={l.score} onBlur={(e) => { if (Number(e.target.value) !== l.score) updateLikelihood.mutate({ id: l.id, score: Number(e.target.value) }); }} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.description || ''} onBlur={(e) => { if (e.target.value !== (l.description || '')) updateLikelihood.mutate({ id: l.id, description: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeLikelihood.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-end gap-3 pt-2 border-t">
                <div className="flex-1 space-y-1"><Label className="text-xs">Label</Label><Input value={newLikelihood.label} onChange={e => setNewLikelihood(s => ({ ...s, label: e.target.value }))} placeholder="e.g., Very High" /></div>
                <div className="w-20 space-y-1"><Label className="text-xs">Score</Label><Input type="number" value={newLikelihood.score} onChange={e => setNewLikelihood(s => ({ ...s, score: e.target.value }))} /></div>
                <div className="flex-1 space-y-1"><Label className="text-xs">Description</Label><Input value={newLikelihood.description} onChange={e => setNewLikelihood(s => ({ ...s, description: e.target.value }))} /></div>
                <Button onClick={() => { if (!newLikelihood.label || !newLikelihood.score) return; createLikelihood.mutate({ label: newLikelihood.label, score: Number(newLikelihood.score), description: newLikelihood.description, sort_order: likelihoodLevels.length + 1 } as any); setNewLikelihood({ label: '', score: '', description: '' }); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Impact Levels */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Impact Levels</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-20">Score</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impactLevels.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.label} onBlur={(e) => { if (e.target.value !== l.label) updateImpact.mutate({ id: l.id, label: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-16 h-8" defaultValue={l.score} onBlur={(e) => { if (Number(e.target.value) !== l.score) updateImpact.mutate({ id: l.id, score: Number(e.target.value) }); }} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.description || ''} onBlur={(e) => { if (e.target.value !== (l.description || '')) updateImpact.mutate({ id: l.id, description: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeImpact.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-end gap-3 pt-2 border-t">
                <div className="flex-1 space-y-1"><Label className="text-xs">Label</Label><Input value={newImpact.label} onChange={e => setNewImpact(s => ({ ...s, label: e.target.value }))} placeholder="e.g., Extreme" /></div>
                <div className="w-20 space-y-1"><Label className="text-xs">Score</Label><Input type="number" value={newImpact.score} onChange={e => setNewImpact(s => ({ ...s, score: e.target.value }))} /></div>
                <div className="flex-1 space-y-1"><Label className="text-xs">Description</Label><Input value={newImpact.description} onChange={e => setNewImpact(s => ({ ...s, description: e.target.value }))} /></div>
                <Button onClick={() => { if (!newImpact.label || !newImpact.score) return; createImpact.mutate({ label: newImpact.label, score: Number(newImpact.score), description: newImpact.description, sort_order: impactLevels.length + 1 } as any); setNewImpact({ label: '', score: '', description: '' }); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Control Effectiveness */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Control Effectiveness Levels</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-28">Reduction %</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effectivenessLevels.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.label} onBlur={(e) => { if (e.target.value !== l.label) updateEffectiveness.mutate({ id: l.id, label: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8" defaultValue={l.reduction_percentage} onBlur={(e) => { if (Number(e.target.value) !== l.reduction_percentage) updateEffectiveness.mutate({ id: l.id, reduction_percentage: Number(e.target.value) }); }} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" defaultValue={l.description || ''} onBlur={(e) => { if (e.target.value !== (l.description || '')) updateEffectiveness.mutate({ id: l.id, description: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeEffectiveness.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-end gap-3 pt-2 border-t">
                <div className="flex-1 space-y-1"><Label className="text-xs">Label</Label><Input value={newEffectiveness.label} onChange={e => setNewEffectiveness(s => ({ ...s, label: e.target.value }))} placeholder="e.g., Strong" /></div>
                <div className="w-28 space-y-1"><Label className="text-xs">Reduction %</Label><Input type="number" value={newEffectiveness.reduction_percentage} onChange={e => setNewEffectiveness(s => ({ ...s, reduction_percentage: e.target.value }))} min={0} max={100} /></div>
                <div className="flex-1 space-y-1"><Label className="text-xs">Description</Label><Input value={newEffectiveness.description} onChange={e => setNewEffectiveness(s => ({ ...s, description: e.target.value }))} /></div>
                <Button onClick={() => { if (!newEffectiveness.label || !newEffectiveness.reduction_percentage) return; createEffectiveness.mutate({ label: newEffectiveness.label, reduction_percentage: Number(newEffectiveness.reduction_percentage), description: newEffectiveness.description, sort_order: effectivenessLevels.length + 1 } as any); setNewEffectiveness({ label: '', reduction_percentage: '', description: '' }); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Risk Classification Thresholds */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Risk Classification Thresholds</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Define residual risk score boundaries for automatic risk classification (Likelihood × Impact scale).</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-24">Min Score</TableHead>
                    <TableHead className="w-24">Max Score</TableHead>
                    <TableHead className="w-24">Color</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classificationThresholds.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Input className="h-8" defaultValue={t.label} onBlur={(e) => { if (e.target.value !== t.label) updateThreshold.mutate({ id: t.id, label: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8" defaultValue={t.min_score} onBlur={(e) => { if (Number(e.target.value) !== Number(t.min_score)) updateThreshold.mutate({ id: t.id, min_score: Number(e.target.value) }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8" defaultValue={t.max_score} onBlur={(e) => { if (Number(e.target.value) !== Number(t.max_score)) updateThreshold.mutate({ id: t.id, max_score: Number(e.target.value) }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="color" className="w-12 h-8 p-0 border-0" defaultValue={t.color} onBlur={(e) => { if (e.target.value !== t.color) updateThreshold.mutate({ id: t.id, color: e.target.value }); }} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeThreshold.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-end gap-3 pt-2 border-t">
                <div className="flex-1 space-y-1"><Label className="text-xs">Label</Label><Input value={newClassification.label} onChange={e => setNewClassification(s => ({ ...s, label: e.target.value }))} placeholder="e.g., Critical" /></div>
                <div className="w-24 space-y-1"><Label className="text-xs">Min Score</Label><Input type="number" value={newClassification.min_score} onChange={e => setNewClassification(s => ({ ...s, min_score: e.target.value }))} /></div>
                <div className="w-24 space-y-1"><Label className="text-xs">Max Score</Label><Input type="number" value={newClassification.max_score} onChange={e => setNewClassification(s => ({ ...s, max_score: e.target.value }))} /></div>
                <div className="w-24 space-y-1"><Label className="text-xs">Color</Label><Input type="color" value={newClassification.color} onChange={e => setNewClassification(s => ({ ...s, color: e.target.value }))} className="p-0 border-0 h-8" /></div>
                <Button onClick={() => { if (!newClassification.label || !newClassification.min_score || !newClassification.max_score) return; createThreshold.mutate({ label: newClassification.label, min_score: Number(newClassification.min_score), max_score: Number(newClassification.max_score), color: newClassification.color, sort_order: classificationThresholds.length + 1 } as any); setNewClassification({ label: '', min_score: '', max_score: '', color: '#gray' }); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications & SLA */}
        <TabsContent value="sla">
          <Card>
            <CardHeader><CardTitle>Notifications & SLA Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Response Days</Label>
                  <Input type="number" value={slaSettings.defaultResponseDays} onChange={(e) => setSlaSettings({ ...slaSettings, defaultResponseDays: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Number of days management has to respond to findings</p>
                </div>
                <div className="space-y-2">
                  <Label>Reminder Days Before Due</Label>
                  <Input type="number" value={slaSettings.reminderDaysBefore} onChange={(e) => setSlaSettings({ ...slaSettings, reminderDaysBefore: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Days before due date to send reminder</p>
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div><Label>Auto-notify on Plan Approval</Label><p className="text-sm text-muted-foreground">Send notifications when plans are approved</p></div>
                <Switch checked={slaSettings.autoNotifyOnPlanApproval} onCheckedChange={(checked) => setSlaSettings({ ...slaSettings, autoNotifyOnPlanApproval: checked })} />
              </div>
              <Button onClick={() => saveCategory('sla', slaSettings)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save SLA Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features">
          <Card>
            <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div><Label>Enable Report Builder</Label><p className="text-sm text-muted-foreground">Enable the report builder module</p></div>
                <Switch checked={featureFlags.enableReportBuilder} onCheckedChange={(checked) => setFeatureFlags({ ...featureFlags, enableReportBuilder: checked })} />
              </div>
              <Button onClick={() => saveCategory('features', featureFlags)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Feature Flags'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reference Settings */}
        <TabsContent value="reference">
          <Card>
            <CardHeader><CardTitle>Reference Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Fiscal Year</Label>
                  <Input value={refSettings.defaultFiscalYear} onChange={(e) => setRefSettings({ ...refSettings, defaultFiscalYear: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <Input value={refSettings.locations} onChange={(e) => setRefSettings({ ...refSettings, locations: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Comma-separated list</p>
                </div>
              </div>
              <Button onClick={() => saveCategory('reference', refSettings)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Reference Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Types */}
        <TabsContent value="activities">
          <Card>
            <CardHeader><CardTitle>Activity Types Configuration</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Activity Type</TableHead><TableHead>Description</TableHead><TableHead>Duration (hrs)</TableHead><TableHead>Enabled</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {activityTypes.map((type: any) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.default_duration_hours || '-'}</TableCell>
                      <TableCell>
                        <Switch checked={type.is_active !== false} onCheckedChange={(checked) => updateType.mutate({ id: type.id, is_active: checked })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
