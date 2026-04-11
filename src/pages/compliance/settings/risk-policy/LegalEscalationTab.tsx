import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Clock, DollarSign, Target, Shield, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActiveLegalEscalationPolicy,
  updateLegalEscalationPolicy,
  addPolicyRule,
  updatePolicyRule,
  deletePolicyRule,
  LegalEscalationPolicyWithRules,
  LegalEscalationPolicyRuleRow,
} from '@/services/legalEscalationPolicyService';

const RULE_TYPES = [
  { value: 'AGE_THRESHOLD', label: 'Age Threshold' },
  { value: 'AMOUNT_THRESHOLD', label: 'Amount Threshold' },
  { value: 'BEHAVIOUR_THRESHOLD', label: 'Behaviour Threshold' },
  { value: 'RISK_THRESHOLD', label: 'Risk Threshold' },
  { value: 'COMBINED', label: 'Combined' },
];

export default function LegalEscalationTab() {
  const queryClient = useQueryClient();
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<LegalEscalationPolicyRuleRow | null>(null);
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
    onSuccess: () => { invalidateAll(); toast.success('Escalation policy saved'); },
    onError: () => toast.error('Failed to save policy'),
  });

  const addRuleMut = useMutation({
    mutationFn: () => addPolicyRule({ ...newRule, policy_id: localPolicy?.id }),
    onSuccess: () => { invalidateAll(); setShowRuleDialog(false); resetRuleForm(); toast.success('Rule added'); },
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

  const resetRuleForm = () => {
    setNewRule({
      rule_type: 'AGE_THRESHOLD', trigger_condition: 'AND', is_enabled: true, priority: 1,
      auto_mark_legal_recommended: true, notify_compliance_officer: true, notify_supervisor: false,
    });
    setEditingRule(null);
  };

  const getRuleTypeIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      'AGE_THRESHOLD': <Clock className="h-4 w-4" />,
      'AMOUNT_THRESHOLD': <DollarSign className="h-4 w-4" />,
      'BEHAVIOUR_THRESHOLD': <Target className="h-4 w-4" />,
      'RISK_THRESHOLD': <Shield className="h-4 w-4" />,
    };
    return icons[type] || <AlertTriangle className="h-4 w-4" />;
  };

  const getRuleTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'AGE_THRESHOLD': 'bg-info/10 text-info',
      'AMOUNT_THRESHOLD': 'bg-success/10 text-success',
      'BEHAVIOUR_THRESHOLD': 'bg-warning/15 text-warning',
      'RISK_THRESHOLD': 'bg-destructive/10 text-destructive',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!localPolicy) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No active escalation policy found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Legal Escalation Rules</h3>
          <p className="text-sm text-muted-foreground">Define thresholds for when compliance cases should be referred for legal proceedings</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="default" className="gap-1">Active: {localPolicy.policy_version}</Badge>
          <Button size="sm" onClick={() => savePolicyMut.mutate()} disabled={savePolicyMut.isPending}>
            {savePolicyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Policy Name</Label>
            <Input value={localPolicy.policy_name} onChange={(e) => setLocalPolicy({ ...localPolicy, policy_name: e.target.value })} className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Evaluation Frequency</Label>
            <Select value={localPolicy.evaluation_frequency} onValueChange={(v) => setLocalPolicy({ ...localPolicy, evaluation_frequency: v })}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <div className="flex items-center gap-2 mt-2">
              <Switch checked={localPolicy.is_active} onCheckedChange={(v) => setLocalPolicy({ ...localPolicy, is_active: v })} />
              <span className="text-sm">{localPolicy.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Escalation Rule
        </Button>
      </div>

      <div className="space-y-3">
        {localPolicy.rules.map((rule) => (
          <Card key={rule.id} className="p-4 border-l-4" style={{ borderLeftColor: rule.is_enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={getRuleTypeBadgeColor(rule.rule_type)}>
                    <span className="flex items-center gap-1">{getRuleTypeIcon(rule.rule_type)}{rule.rule_type.replace(/_/g, ' ')}</span>
                  </Badge>
                  <span className="font-semibold">{rule.rule_name}</span>
                  {!rule.is_enabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {rule.age_days_overdue && <div><span className="text-muted-foreground">Age: </span><span className="font-medium">{rule.age_days_overdue} days</span></div>}
                  {rule.total_arrears_threshold && <div><span className="text-muted-foreground">Amount: </span><span className="font-medium">XCD {Number(rule.total_arrears_threshold).toLocaleString()}</span></div>}
                  {rule.notices_sent_minimum && <div><span className="text-muted-foreground">Notices: </span><span className="font-medium">{rule.notices_sent_minimum}+</span></div>}
                  {rule.risk_band_minimum && <div><span className="text-muted-foreground">Risk Band: </span><span className="font-medium">{rule.risk_band_minimum}+</span></div>}
                </div>
                <div className="mt-2 flex gap-2">
                  {rule.auto_mark_legal_recommended && <Badge variant="outline" className="text-xs">Auto-Mark</Badge>}
                  {rule.notify_compliance_officer && <Badge variant="outline" className="text-xs">Notify Officer</Badge>}
                  {rule.notify_supervisor && <Badge variant="outline" className="text-xs">Notify Supervisor</Badge>}
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <Button variant="ghost" size="sm" onClick={() => updateRuleMut.mutate({ id: rule.id, updates: { is_enabled: !rule.is_enabled } })}>
                  <Switch checked={rule.is_enabled} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingRule(rule); setNewRule(rule); setShowRuleDialog(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this escalation rule?')) deleteRuleMut.mutate(rule.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {localPolicy.rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No escalation rules configured. Add a rule to get started.</div>
        )}
      </div>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Escalation Rule'}</DialogTitle>
            <DialogDescription>Configure when compliance cases should be escalated to legal proceedings</DialogDescription>
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

            {newRule.rule_type === 'AGE_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Age Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Overdue</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} placeholder="e.g., 90" /></div>
                  <div><Label>Consecutive Months Missing</Label><Input type="number" value={newRule.consecutive_months_missing || ''} onChange={(e) => setNewRule({ ...newRule, consecutive_months_missing: parseInt(e.target.value) })} placeholder="e.g., 3" /></div>
                </div>
              </div>
            )}

            {newRule.rule_type === 'AMOUNT_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Amount Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Total Arrears Threshold (XCD)</Label><Input type="number" value={newRule.total_arrears_threshold || ''} onChange={(e) => setNewRule({ ...newRule, total_arrears_threshold: parseInt(e.target.value) })} placeholder="e.g., 50000" /></div>
                  <div><Label>Single Period Threshold (XCD)</Label><Input type="number" value={newRule.single_period_threshold || ''} onChange={(e) => setNewRule({ ...newRule, single_period_threshold: parseInt(e.target.value) })} placeholder="e.g., 20000" /></div>
                </div>
              </div>
            )}

            {newRule.rule_type === 'BEHAVIOUR_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Behaviour Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Min Notices Sent</Label><Input type="number" value={newRule.notices_sent_minimum || ''} onChange={(e) => setNewRule({ ...newRule, notices_sent_minimum: parseInt(e.target.value) })} placeholder="e.g., 3" /></div>
                  <div><Label>No Response Days</Label><Input type="number" value={newRule.no_response_days || ''} onChange={(e) => setNewRule({ ...newRule, no_response_days: parseInt(e.target.value) })} placeholder="e.g., 60" /></div>
                  <div><Label>Payment Plan Breaches</Label><Input type="number" value={newRule.payment_plan_breaches_count || ''} onChange={(e) => setNewRule({ ...newRule, payment_plan_breaches_count: parseInt(e.target.value) })} placeholder="e.g., 2" /></div>
                  <div><Label>Audit Refusals</Label><Input type="number" value={newRule.audit_refused_count || ''} onChange={(e) => setNewRule({ ...newRule, audit_refused_count: parseInt(e.target.value) })} placeholder="e.g., 1" /></div>
                </div>
              </div>
            )}

            {newRule.rule_type === 'RISK_THRESHOLD' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Risk Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Risk Band</Label>
                    <Select value={newRule.risk_band_minimum || ''} onValueChange={(v) => setNewRule({ ...newRule, risk_band_minimum: v })}>
                      <SelectTrigger><SelectValue placeholder="Select band" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Minimum Risk Score</Label><Input type="number" value={newRule.risk_score_minimum || ''} onChange={(e) => setNewRule({ ...newRule, risk_score_minimum: parseInt(e.target.value) })} placeholder="e.g., 70" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newRule.combine_with_age_threshold || false} onCheckedChange={(v) => setNewRule({ ...newRule, combine_with_age_threshold: v })} />
                  <Label>Combine with age threshold</Label>
                </div>
                {newRule.combine_with_age_threshold && (
                  <div><Label>Age Threshold (Days)</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} placeholder="e.g., 60" /></div>
                )}
              </div>
            )}

            {newRule.rule_type === 'COMBINED' && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Combined Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Overdue</Label><Input type="number" value={newRule.age_days_overdue || ''} onChange={(e) => setNewRule({ ...newRule, age_days_overdue: parseInt(e.target.value) })} /></div>
                  <div><Label>Arrears Threshold (XCD)</Label><Input type="number" value={newRule.total_arrears_threshold || ''} onChange={(e) => setNewRule({ ...newRule, total_arrears_threshold: parseInt(e.target.value) })} /></div>
                  <div><Label>Min Notices Sent</Label><Input type="number" value={newRule.notices_sent_minimum || ''} onChange={(e) => setNewRule({ ...newRule, notices_sent_minimum: parseInt(e.target.value) })} /></div>
                  <div><Label>No Response Days</Label><Input type="number" value={newRule.no_response_days || ''} onChange={(e) => setNewRule({ ...newRule, no_response_days: parseInt(e.target.value) })} /></div>
                </div>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-medium text-sm">Actions When Triggered</h3>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.auto_mark_legal_recommended || false} onCheckedChange={(v) => setNewRule({ ...newRule, auto_mark_legal_recommended: v })} />
                <Label>Auto-mark as Legal Recommended</Label>
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
}
