import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Settings, Plus, Edit, Trash2, Clock, AlertTriangle, DollarSign, Target,
  Shield, Save, Calendar, History, CheckCircle2, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLegalEscalationPolicies,
  fetchActiveLegalEscalationPolicy,
  updateLegalEscalationPolicy,
  activateNewLegalEscalationPolicy,
  addPolicyRule,
  updatePolicyRule,
  deletePolicyRule,
  LegalEscalationPolicyWithRules,
  LegalEscalationPolicyRuleRow,
} from '@/services/legalEscalationPolicyService';
import { format } from 'date-fns';

const RULE_TYPES = [
  { value: 'AGE_THRESHOLD', label: 'Age Threshold' },
  { value: 'AMOUNT_THRESHOLD', label: 'Amount Threshold' },
  { value: 'BEHAVIOUR_THRESHOLD', label: 'Behaviour Threshold' },
  { value: 'RISK_THRESHOLD', label: 'Risk Threshold' },
  { value: 'COMBINED', label: 'Combined' },
];

const LegalEscalationPolicyPage = () => {
  const queryClient = useQueryClient();
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<LegalEscalationPolicyRuleRow | null>(null);
  const [newPolicyEffectiveFrom, setNewPolicyEffectiveFrom] = useState('');
  const [newPolicyNotes, setNewPolicyNotes] = useState('');
  const [localPolicy, setLocalPolicy] = useState<LegalEscalationPolicyWithRules | null>(null);
  const [newRule, setNewRule] = useState<Partial<LegalEscalationPolicyRuleRow>>({
    rule_type: 'AGE_THRESHOLD',
    trigger_condition: 'AND',
    is_enabled: true,
    priority: 1,
    auto_mark_legal_recommended: true,
    notify_compliance_officer: true,
    notify_supervisor: false,
  });

  const { data: activePolicy, isLoading } = useQuery({
    queryKey: ['ce_legal_escalation_policies', 'active'],
    queryFn: fetchActiveLegalEscalationPolicy,
  });

  const { data: allPolicies = [] } = useQuery({
    queryKey: ['ce_legal_escalation_policies'],
    queryFn: fetchLegalEscalationPolicies,
  });

  useEffect(() => {
    if (activePolicy) setLocalPolicy(activePolicy);
  }, [activePolicy]);

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['ce_legal_escalation_policies'] });

  const savePolicyMut = useMutation({
    mutationFn: () => {
      if (!localPolicy) throw new Error('No policy');
      return updateLegalEscalationPolicy(localPolicy.id, {
        policy_name: localPolicy.policy_name,
        evaluation_frequency: localPolicy.evaluation_frequency,
        is_active: localPolicy.is_active,
      });
    },
    onSuccess: () => { invalidateAll(); toast.success('Policy saved'); },
    onError: () => toast.error('Failed to save policy'),
  });

  const activateMut = useMutation({
    mutationFn: () => {
      if (!newPolicyEffectiveFrom) throw new Error('Date required');
      const nextVersion = `v${allPolicies.length + 1}.0`;
      const nextCode = `LEP-${new Date().getFullYear()}-${String(allPolicies.length + 1).padStart(3, '0')}`;
      return activateNewLegalEscalationPolicy(
        localPolicy?.id || null,
        {
          policy_code: nextCode,
          policy_version: nextVersion,
          policy_name: localPolicy?.policy_name || 'Legal Escalation Policy',
          effective_from: newPolicyEffectiveFrom,
          evaluation_frequency: localPolicy?.evaluation_frequency || 'WEEKLY',
          notes: newPolicyNotes,
          created_by: 'current.user',
        },
        localPolicy?.rules || []
      );
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewPolicyDialog(false);
      setNewPolicyEffectiveFrom('');
      setNewPolicyNotes('');
      toast.success('New policy activated');
    },
    onError: () => toast.error('Failed to activate new policy'),
  });

  const addRuleMut = useMutation({
    mutationFn: () => addPolicyRule({ ...newRule, policy_id: localPolicy?.id }),
    onSuccess: () => {
      invalidateAll();
      setShowRuleDialog(false);
      setNewRule({ rule_type: 'AGE_THRESHOLD', trigger_condition: 'AND', is_enabled: true, priority: 1, auto_mark_legal_recommended: true, notify_compliance_officer: true, notify_supervisor: false });
      toast.success('Rule added');
    },
    onError: () => toast.error('Failed to add rule'),
  });

  const updateRuleMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LegalEscalationPolicyRuleRow> }) => updatePolicyRule(id, updates),
    onSuccess: () => { invalidateAll(); toast.success('Rule updated'); },
    onError: () => toast.error('Failed to update rule'),
  });

  const deleteRuleMut = useMutation({
    mutationFn: (id: string) => deletePolicyRule(id),
    onSuccess: () => { invalidateAll(); toast.success('Rule deleted'); },
    onError: () => toast.error('Failed to delete rule'),
  });

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'AGE_THRESHOLD': return <Clock className="h-4 w-4" />;
      case 'AMOUNT_THRESHOLD': return <DollarSign className="h-4 w-4" />;
      case 'BEHAVIOUR_THRESHOLD': return <Target className="h-4 w-4" />;
      case 'RISK_THRESHOLD': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRuleTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AGE_THRESHOLD': return 'bg-info/10 text-info';
      case 'AMOUNT_THRESHOLD': return 'bg-success/10 text-success';
      case 'BEHAVIOUR_THRESHOLD': return 'bg-warning/15 text-warning';
      case 'RISK_THRESHOLD': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!localPolicy) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No policy found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Legal Escalation Policy
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure automated rules and thresholds for escalating compliance cases to legal proceedings
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Active Policy: {localPolicy.policy_version}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Effective from {format(new Date(localPolicy.effective_from), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowHistoryDialog(true)}>
            <History className="h-4 w-4" />Policy History
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowNewPolicyDialog(true)}>
            <Plus className="h-4 w-4" />Activate New Policy
          </Button>
          <Button onClick={() => savePolicyMut.mutate()} disabled={savePolicyMut.isPending}>
            {savePolicyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Policy Overview */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Policy Name</Label>
            <Input value={localPolicy.policy_name} onChange={(e) => setLocalPolicy({ ...localPolicy, policy_name: e.target.value })} className="mt-2" />
          </div>
          <div>
            <Label>Evaluation Frequency</Label>
            <Select value={localPolicy.evaluation_frequency} onValueChange={(v) => setLocalPolicy({ ...localPolicy, evaluation_frequency: v })}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Policy Status</Label>
            <div className="flex items-center gap-2 mt-2">
              <Switch checked={localPolicy.is_active} onCheckedChange={(v) => setLocalPolicy({ ...localPolicy, is_active: v })} />
              <span className="text-sm">{localPolicy.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        {localPolicy.last_evaluation_date && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-muted-foreground">Last Evaluation:</span>
                <span className="font-medium">{new Date(localPolicy.last_evaluation_date).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Next Scheduled:</span>
                <span className="font-medium">{localPolicy.next_evaluation_date ? new Date(localPolicy.next_evaluation_date).toLocaleString() : 'Not scheduled'}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Rules */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Escalation Rules</h2>
            <p className="text-sm text-muted-foreground mt-1">Define rules that automatically identify cases ready for legal action</p>
          </div>
          <Button onClick={() => { setEditingRule(null); setNewRule({ rule_type: 'AGE_THRESHOLD', trigger_condition: 'AND', is_enabled: true, priority: 1, auto_mark_legal_recommended: true, notify_compliance_officer: true, notify_supervisor: false }); setShowRuleDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Rule
          </Button>
        </div>
        <div className="space-y-4">
          {localPolicy.rules.map((rule) => (
            <Card key={rule.id} className="p-4 border-l-4" style={{ borderLeftColor: rule.is_enabled ? '#00713A' : '#CBD5E1' }}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getRuleTypeBadgeColor(rule.rule_type)}>
                      <span className="flex items-center gap-1">{getRuleTypeIcon(rule.rule_type)}{rule.rule_type.replace(/_/g, ' ')}</span>
                    </Badge>
                    <span className="font-semibold text-lg">{rule.rule_name}</span>
                    {!rule.is_enabled && <Badge variant="secondary">Disabled</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {rule.age_days_overdue && <div><span className="text-muted-foreground">Age Threshold: </span><span className="font-medium">{rule.age_days_overdue} days</span></div>}
                    {rule.total_arrears_threshold && <div><span className="text-muted-foreground">Amount Threshold: </span><span className="font-medium">XCD {Number(rule.total_arrears_threshold).toLocaleString()}</span></div>}
                    {rule.notices_sent_minimum && <div><span className="text-muted-foreground">Notices Required: </span><span className="font-medium">{rule.notices_sent_minimum}+</span></div>}
                    {rule.payment_plan_breaches_count && <div><span className="text-muted-foreground">Plan Breaches: </span><span className="font-medium">{rule.payment_plan_breaches_count}+</span></div>}
                    {rule.risk_band_minimum && <div><span className="text-muted-foreground">Risk Band: </span><span className="font-medium">{rule.risk_band_minimum}+</span></div>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {rule.auto_mark_legal_recommended && <Badge variant="outline" className="text-xs">Auto-Mark</Badge>}
                    {rule.notify_compliance_officer && <Badge variant="outline" className="text-xs">Notify Officer</Badge>}
                    {rule.notify_supervisor && <Badge variant="outline" className="text-xs">Notify Supervisor</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => updateRuleMut.mutate({ id: rule.id, updates: { is_enabled: !rule.is_enabled } })}>
                    <Switch checked={rule.is_enabled} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingRule(rule); setNewRule(rule); setShowRuleDialog(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this rule?')) deleteRuleMut.mutate(rule.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {localPolicy.rules.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No escalation rules configured</p>
          )}
        </div>
      </Card>

      {/* Policy History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy History</DialogTitle>
            <DialogDescription>View all legal escalation policy versions</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Policy Name</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPolicies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.policy_version}</TableCell>
                  <TableCell>{p.policy_name}</TableCell>
                  <TableCell>{format(new Date(p.effective_from), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{p.effective_to ? format(new Date(p.effective_to), 'MMM dd, yyyy') : 'Present'}</TableCell>
                  <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>{p.created_by}</TableCell>
                  <TableCell className="max-w-xs truncate">{p.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* New Policy Dialog */}
      <Dialog open={showNewPolicyDialog} onOpenChange={setShowNewPolicyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate New Policy</DialogTitle>
            <DialogDescription>Create a new policy version. The current policy will be deactivated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Effective From Date</Label>
              <Input type="date" value={newPolicyEffectiveFrom} onChange={(e) => setNewPolicyEffectiveFrom(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Describe the changes..." value={newPolicyNotes} onChange={(e) => setNewPolicyNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPolicyDialog(false)}>Cancel</Button>
            <Button onClick={() => activateMut.mutate()} disabled={activateMut.isPending}>
              {activateMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Activate Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={newRule.rule_name || ''} onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })} placeholder="e.g., High Arrears - 90 Days" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newRule.description || ''} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input type="number" value={newRule.priority || 1} onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })} />
              </div>
            </div>

            {/* Age Threshold */}
            {newRule.rule_type === 'AGE_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Age Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Overdue</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} placeholder="e.g., 90" /></div>
                  <div><Label>Consecutive Months Missing</Label><Input type="number" value={newRule.consecutive_months_missing || ''} onChange={(e) => setNewRule({ ...newRule, consecutive_months_missing: parseInt(e.target.value) })} placeholder="e.g., 3" /></div>
                </div>
              </div>
            )}

            {/* Amount Threshold */}
            {newRule.rule_type === 'AMOUNT_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Amount Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Total Arrears Threshold (XCD)</Label><Input type="number" value={newRule.total_arrears_threshold || ''} onChange={(e) => setNewRule({ ...newRule, total_arrears_threshold: parseInt(e.target.value) })} placeholder="e.g., 50000" /></div>
                  <div><Label>Single Period Threshold (XCD)</Label><Input type="number" value={newRule.single_period_threshold || ''} onChange={(e) => setNewRule({ ...newRule, single_period_threshold: parseInt(e.target.value) })} placeholder="e.g., 20000" /></div>
                </div>
              </div>
            )}

            {/* Behaviour Threshold */}
            {newRule.rule_type === 'BEHAVIOUR_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Behaviour Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Minimum Notices Sent</Label><Input type="number" value={newRule.notices_sent_minimum || ''} onChange={(e) => setNewRule({ ...newRule, notices_sent_minimum: parseInt(e.target.value) })} /></div>
                  <div><Label>No Response Days</Label><Input type="number" value={newRule.no_response_days || ''} onChange={(e) => setNewRule({ ...newRule, no_response_days: parseInt(e.target.value) })} /></div>
                  <div><Label>Payment Plan Breaches</Label><Input type="number" value={newRule.payment_plan_breaches_count || ''} onChange={(e) => setNewRule({ ...newRule, payment_plan_breaches_count: parseInt(e.target.value) })} /></div>
                  <div><Label>Audit Refusals</Label><Input type="number" value={newRule.audit_refused_count || ''} onChange={(e) => setNewRule({ ...newRule, audit_refused_count: parseInt(e.target.value) })} /></div>
                </div>
              </div>
            )}

            {/* Risk Threshold */}
            {newRule.rule_type === 'RISK_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Risk Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Risk Band</Label>
                    <Select value={newRule.risk_band_minimum || ''} onValueChange={(v) => setNewRule({ ...newRule, risk_band_minimum: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Minimum Risk Score</Label><Input type="number" value={newRule.risk_score_minimum || ''} onChange={(e) => setNewRule({ ...newRule, risk_score_minimum: parseInt(e.target.value) })} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newRule.combine_with_age_threshold || false} onCheckedChange={(v) => setNewRule({ ...newRule, combine_with_age_threshold: v })} />
                  <Label>Combine with age threshold</Label>
                </div>
                {newRule.combine_with_age_threshold && (
                  <div><Label>Age Threshold (Days)</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} /></div>
                )}
              </div>
            )}

            {/* Combined */}
            {newRule.rule_type === 'COMBINED' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Combined Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Overdue</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} /></div>
                  <div><Label>Arrears Threshold (XCD)</Label><Input type="number" value={newRule.total_arrears_threshold || ''} onChange={(e) => setNewRule({ ...newRule, total_arrears_threshold: parseInt(e.target.value) })} /></div>
                  <div><Label>Min Notices Sent</Label><Input type="number" value={newRule.notices_sent_minimum || ''} onChange={(e) => setNewRule({ ...newRule, notices_sent_minimum: parseInt(e.target.value) })} /></div>
                  <div><Label>No Response Days</Label><Input type="number" value={newRule.no_response_days || ''} onChange={(e) => setNewRule({ ...newRule, no_response_days: parseInt(e.target.value) })} /></div>
                </div>
              </div>
            )}

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-medium">Actions</h3>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.auto_mark_legal_recommended || false} onCheckedChange={(v) => setNewRule({ ...newRule, auto_mark_legal_recommended: v })} />
                <Label>Auto-mark cases as Legal Recommended</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.notify_compliance_officer || false} onCheckedChange={(v) => setNewRule({ ...newRule, notify_compliance_officer: v })} />
                <Label>Notify Compliance Officer</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.notify_supervisor || false} onCheckedChange={(v) => setNewRule({ ...newRule, notify_supervisor: v })} />
                <Label>Notify Supervisor</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!newRule.rule_name) { toast.error('Rule name is required'); return; }
              if (editingRule) {
                updateRuleMut.mutate({ id: editingRule.id, updates: newRule });
                setShowRuleDialog(false);
              } else {
                addRuleMut.mutate();
              }
            }} disabled={addRuleMut.isPending || updateRuleMut.isPending}>
              {(addRuleMut.isPending || updateRuleMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRule ? 'Update' : 'Add'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalEscalationPolicyPage;
