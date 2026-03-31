import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Bell, Shield, Flag, MapPin, Plus, Trash2, Target, Clock, BarChart3, CheckCircle, XCircle, FileText } from 'lucide-react';
import { NotificationTriggerManager } from '@/components/audit/NotificationTriggerManager';
import { TemplatePolicyMatrix } from '@/components/audit/TemplatePolicyMatrix';
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
import { usePlanningWeights, useFrequencyPolicies, usePlanningParameters } from '@/hooks/useAutoPlanEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AuditConfig({ embedded = false }: { embedded?: boolean }) {
  
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

  // Planning engine config
  const { data: planningWeights = [], updateWeight: updatePlanningWeight } = usePlanningWeights();
  const { data: freqPolicies = [], updatePolicy } = useFrequencyPolicies();
  const { data: planningParams = [], updateParam } = usePlanningParameters();

  // Weight edit state
  const [editWeightDialog, setEditWeightDialog] = useState<any>(null);
  const [editWeightValue, setEditWeightValue] = useState('');
  const [editWeightReason, setEditWeightReason] = useState('');

  // Frequency policy edit state
  const [editPolicyDialog, setEditPolicyDialog] = useState<any>(null);
  const [editPolicyValue, setEditPolicyValue] = useState('');
  const [editPolicyReason, setEditPolicyReason] = useState('');

  // Parameter edit state
  const [editParamDialog, setEditParamDialog] = useState<any>(null);
  const [editParamValue, setEditParamValue] = useState('');
  const [editParamReason, setEditParamReason] = useState('');

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

  const pageContent = (
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
          <TabsTrigger value="planning"><Target className="w-4 h-4 mr-2" />Planning Engine</TabsTrigger>
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

        {/* ===== Config Change Approvals ===== */}
        <TabsContent value="configApprovals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Pending Configuration Change Requests ({pendingRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No pending change requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Config Type</TableHead>
                      <TableHead>Field Changed</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell><Badge variant="outline">{req.config_type}</Badge></TableCell>
                        <TableCell className="font-medium">{req.field_changed}</TableCell>
                        <TableCell className="text-muted-foreground">{req.old_value || '-'}</TableCell>
                        <TableCell className="font-semibold">{req.new_value}</TableCell>
                        <TableCell>{req.requested_by || '-'}</TableCell>
                        <TableCell className="text-xs">{req.created_at ? new Date(req.created_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={() => reviewChangeRequest.mutate({ id: req.id, status: 'Approved', approved_by: userCode })}>
                              <CheckCircle className="h-3 w-3 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => reviewChangeRequest.mutate({ id: req.id, status: 'Rejected', approved_by: userCode })}>
                              <XCircle className="h-3 w-3 mr-1" />Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {decidedRequests.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Change Request History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Config Type</TableHead>
                      <TableHead>Field Changed</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decidedRequests.slice(0, 20).map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell><Badge variant="outline">{req.config_type}</Badge></TableCell>
                        <TableCell>{req.field_changed}</TableCell>
                        <TableCell>{req.new_value}</TableCell>
                        <TableCell>{req.requested_by || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'Approved' ? 'default' : 'destructive'}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{req.approved_by || '-'}</TableCell>
                        <TableCell className="text-xs">{req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications & SLA */}
        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>SLA Settings</CardTitle></CardHeader>
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

          {/* Auto-Notification Triggers */}
          <NotificationTriggerManager />

          {/* Template Policy Matrix */}
          <TemplatePolicyMatrix />
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

        {/* Planning Engine Config Tab */}
        <TabsContent value="planning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Planning Priority Score Weights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure the weight each factor contributes to the composite priority score.
                Total should equal 1.0 (100%).
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const totalW = planningWeights.reduce((sum: number, w: any) => sum + Number(w.weight || 0), 0);
                const isValid = Math.abs(totalW - 1.0) < 0.01;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <span>Total Weight:</span>
                      <Badge variant={isValid ? 'default' : 'destructive'} className={isValid ? 'bg-green-600' : ''}>
                        {(totalW * 100).toFixed(0)}%
                      </Badge>
                      {!isValid && <span className="text-destructive text-xs">Weights must sum to 100%</span>}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factor</TableHead>
                          <TableHead className="w-24">Weight</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-16">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planningWeights.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">{w.factor_label}</TableCell>
                            <TableCell>{w.weight}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{(w.weight * 100).toFixed(0)}%</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{w.description}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditWeightDialog(w);
                                setEditWeightValue(String(w.weight));
                                setEditWeightReason('');
                              }}>
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Risk Band Frequency Policy
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Maximum months between audits for each risk band. Functions exceeding this are flagged as overdue.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Max Months Between Audits</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freqPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant={
                          p.risk_level === 'Critical' ? 'destructive' :
                          p.risk_level === 'High' ? 'destructive' :
                          p.risk_level === 'Medium' ? 'secondary' : 'outline'
                        }>
                          {p.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{p.max_months_between_audits} months</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditPolicyDialog(p);
                          setEditPolicyValue(String(p.max_months_between_audits));
                          setEditPolicyReason('');
                        }}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Planning Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Scoring Parameters (Global)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configurable multipliers and constants used by the scoring engine. Supports scope precedence: Scenario → Plan → Function → Department → Global.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-16">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planningParams.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">{p.parameter_key?.replace(/_/g, ' ')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.parameter_group}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{JSON.stringify(p.value_json?.value ?? p.value_json)}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{p.scope_type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">v{p.version_no}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditParamDialog(p);
                          setEditParamValue(String(p.value_json?.value ?? ''));
                          setEditParamReason('');
                        }}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {planningParams.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No parameters configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Score Formula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs">
                <p className="text-muted-foreground mb-2">Composite Priority Score =</p>
                <p className="pl-4">
                  {planningWeights.map((w: any, i: number) => (
                    <span key={w.id}>
                      {i > 0 && ' + '}
                      <span className="text-primary font-semibold">{w.weight}</span>
                      <span> × {w.factor_label}</span>
                    </span>
                  ))}
                </p>
                <p className="text-muted-foreground mt-3">Each factor is normalized to 0–100 scale before weighting.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Weight Dialog */}
      <Dialog open={!!editWeightDialog} onOpenChange={() => setEditWeightDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Weight: {editWeightDialog?.factor_label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Weight (0.00 – 1.00)</Label>
              <Input type="number" step="0.01" min="0" max="1" value={editWeightValue} onChange={(e) => setEditWeightValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason for Change *</Label>
              <Textarea value={editWeightReason} onChange={(e) => setEditWeightReason(e.target.value)} placeholder="Why is this weight being changed?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditWeightDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!editWeightReason.trim() || updatePlanningWeight.isPending} onClick={() => {
              updatePlanningWeight.mutate({ id: editWeightDialog.id, weight: Number(editWeightValue), change_reason: editWeightReason, updated_by: userCode });
              setEditWeightDialog(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Frequency Policy Dialog */}
      <Dialog open={!!editPolicyDialog} onOpenChange={() => setEditPolicyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Frequency: {editPolicyDialog?.risk_level}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Max Months Between Audits</Label>
              <Input type="number" min="1" max="120" value={editPolicyValue} onChange={(e) => setEditPolicyValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason for Change *</Label>
              <Textarea value={editPolicyReason} onChange={(e) => setEditPolicyReason(e.target.value)} placeholder="Why is this policy being changed?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditPolicyDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!editPolicyReason.trim() || updatePolicy.isPending} onClick={() => {
              updatePolicy.mutate({ id: editPolicyDialog.id, max_months_between_audits: Number(editPolicyValue), change_reason: editPolicyReason, updated_by: userCode });
              setEditPolicyDialog(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Parameter Dialog */}
      <Dialog open={!!editParamDialog} onOpenChange={() => setEditParamDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Parameter: {editParamDialog?.parameter_key?.replace(/_/g, ' ')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input type="number" value={editParamValue} onChange={(e) => setEditParamValue(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Current version: v{editParamDialog?.version_no}</p>
              <p>Scope: {editParamDialog?.scope_type}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason for Change *</Label>
              <Textarea value={editParamReason} onChange={(e) => setEditParamReason(e.target.value)} placeholder="Why is this parameter being changed?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditParamDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!editParamReason.trim() || updateParam.isPending} onClick={() => {
              updateParam.mutate({ id: editParamDialog.id, value_json: { value: Number(editParamValue) }, change_reason: editParamReason, updated_by: userCode });
              setEditParamDialog(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return pageContent;

  return (
    <PageShell
      title="System Configuration"
      subtitle="Configure Internal Audit system settings"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'System Configuration' }]}
      isLoading={isLoading}
    >
      {pageContent}
    </PageShell>
  );
}
