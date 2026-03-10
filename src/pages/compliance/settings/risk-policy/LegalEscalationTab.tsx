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
import { Plus, Edit, Trash2, Clock, DollarSign, Target, Shield, AlertTriangle, Save } from 'lucide-react';
import { legalEscalationService } from '@/services/legalEscalationService';
import { LegalEscalationPolicy, LegalEscalationRule, EscalationRuleType, EscalationTriggerCondition } from '@/types/legalEscalation';

export default function LegalEscalationTab() {
  const [policy, setPolicy] = useState<LegalEscalationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<LegalEscalationRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<LegalEscalationRule>>({
    ruleType: EscalationRuleType.AGE_THRESHOLD,
    triggerCondition: EscalationTriggerCondition.AND,
    enabled: true,
    priority: 1,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: false,
  });

  useEffect(() => { loadPolicy(); }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const history = await legalEscalationService.getPolicyHistory();
      setPolicy(history.activePolicy);
    } catch { toast.error('Failed to load escalation policy'); }
    finally { setLoading(false); }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    try {
      await legalEscalationService.updateActivePolicy(policy);
      toast.success('Escalation policy saved');
      loadPolicy();
    } catch { toast.error('Failed to save policy'); }
  };

  const handleAddRule = async () => {
    try {
      await legalEscalationService.addRule(newRule as Omit<LegalEscalationRule, 'id'>);
      toast.success('Rule added');
      setShowRuleDialog(false);
      resetRuleForm();
      loadPolicy();
    } catch { toast.error('Failed to add rule'); }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<LegalEscalationRule>) => {
    try {
      await legalEscalationService.updateRule(ruleId, updates);
      toast.success('Rule updated');
      setShowRuleDialog(false);
      loadPolicy();
    } catch { toast.error('Failed to update rule'); }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this escalation rule?')) return;
    try {
      await legalEscalationService.deleteRule(ruleId);
      toast.success('Rule deleted');
      loadPolicy();
    } catch { toast.error('Failed to delete rule'); }
  };

  const resetRuleForm = () => {
    setNewRule({
      ruleType: EscalationRuleType.AGE_THRESHOLD,
      triggerCondition: EscalationTriggerCondition.AND,
      enabled: true, priority: 1,
      autoMarkLegalRecommended: true,
      notifyComplianceOfficer: true,
      notifySupervisor: false,
    });
    setEditingRule(null);
  };

  const getRuleTypeIcon = (type: EscalationRuleType) => {
    const icons: Record<string, JSX.Element> = {
      [EscalationRuleType.AGE_THRESHOLD]: <Clock className="h-4 w-4" />,
      [EscalationRuleType.AMOUNT_THRESHOLD]: <DollarSign className="h-4 w-4" />,
      [EscalationRuleType.BEHAVIOUR_THRESHOLD]: <Target className="h-4 w-4" />,
      [EscalationRuleType.RISK_THRESHOLD]: <Shield className="h-4 w-4" />,
    };
    return icons[type] || <AlertTriangle className="h-4 w-4" />;
  };

  const getRuleTypeBadgeColor = (type: EscalationRuleType) => {
    const colors: Record<string, string> = {
      [EscalationRuleType.AGE_THRESHOLD]: 'bg-info/10 text-info',
      [EscalationRuleType.AMOUNT_THRESHOLD]: 'bg-success/10 text-success',
      [EscalationRuleType.BEHAVIOUR_THRESHOLD]: 'bg-warning/15 text-warning',
      [EscalationRuleType.RISK_THRESHOLD]: 'bg-destructive/10 text-destructive',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading escalation policy...</div>;
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No active escalation policy found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policy Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Legal Escalation Rules</h3>
          <p className="text-sm text-muted-foreground">
            Define thresholds for when compliance cases should be referred for legal proceedings
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="default" className="gap-1">
            Active: {policy.policyVersion}
          </Badge>
          <Button size="sm" onClick={handleSavePolicy}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Policy Settings */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Policy Name</Label>
            <Input
              value={policy.policyName}
              onChange={(e) => setPolicy({ ...policy, policyName: e.target.value })}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Evaluation Frequency</Label>
            <Select
              value={policy.evaluationFrequency}
              onValueChange={(value: any) => setPolicy({ ...policy, evaluationFrequency: value })}
            >
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
              <Switch checked={policy.isActive} onCheckedChange={(checked) => setPolicy({ ...policy, isActive: checked })} />
              <span className="text-sm">{policy.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Add Rule Button */}
      <div className="flex justify-end">
        <Button onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Escalation Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {policy.rules.map((rule) => (
          <Card key={rule.id} className="p-4 border-l-4" style={{ borderLeftColor: rule.enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={getRuleTypeBadgeColor(rule.ruleType)}>
                    <span className="flex items-center gap-1">
                      {getRuleTypeIcon(rule.ruleType)}
                      {rule.ruleType.replace(/_/g, ' ')}
                    </span>
                  </Badge>
                  <span className="font-semibold">{rule.ruleName}</span>
                  {!rule.enabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {rule.ageDaysOverdue && <div><span className="text-muted-foreground">Age: </span><span className="font-medium">{rule.ageDaysOverdue} days</span></div>}
                  {rule.totalArrearsThreshold && <div><span className="text-muted-foreground">Amount: </span><span className="font-medium">XCD {rule.totalArrearsThreshold.toLocaleString()}</span></div>}
                  {rule.noticesSentMinimum && <div><span className="text-muted-foreground">Notices: </span><span className="font-medium">{rule.noticesSentMinimum}+</span></div>}
                  {rule.riskBandMinimum && <div><span className="text-muted-foreground">Risk Band: </span><span className="font-medium">{rule.riskBandMinimum}+</span></div>}
                </div>
                <div className="mt-2 flex gap-2">
                  {rule.autoMarkLegalRecommended && <Badge variant="outline" className="text-xs">Auto-Mark</Badge>}
                  {rule.notifyComplianceOfficer && <Badge variant="outline" className="text-xs">Notify Officer</Badge>}
                  {rule.notifySupervisor && <Badge variant="outline" className="text-xs">Notify Supervisor</Badge>}
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <Button variant="ghost" size="sm" onClick={() => handleUpdateRule(rule.id, { enabled: !rule.enabled })}>
                  <Switch checked={rule.enabled} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingRule(rule); setNewRule(rule); setShowRuleDialog(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {policy.rules.length === 0 && (
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
              <Input value={newRule.ruleName || ''} onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })} placeholder="e.g., High Arrears - 90 Days" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newRule.description || ''} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Type</Label>
                <Select value={newRule.ruleType} onValueChange={(value: EscalationRuleType) => setNewRule({ ...newRule, ruleType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EscalationRuleType.AGE_THRESHOLD}>Age Threshold</SelectItem>
                    <SelectItem value={EscalationRuleType.AMOUNT_THRESHOLD}>Amount Threshold</SelectItem>
                    <SelectItem value={EscalationRuleType.BEHAVIOUR_THRESHOLD}>Behaviour Threshold</SelectItem>
                    <SelectItem value={EscalationRuleType.RISK_THRESHOLD}>Risk Threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input type="number" value={newRule.priority || 1} onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })} />
              </div>
            </div>

            {/* Age Threshold */}
            {newRule.ruleType === EscalationRuleType.AGE_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Age Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Overdue</Label><Input type="number" value={newRule.ageDaysOverdue || ''} onChange={(e) => setNewRule({ ...newRule, ageDaysOverdue: parseInt(e.target.value) })} placeholder="e.g., 90" /></div>
                  <div><Label>Consecutive Months Missing</Label><Input type="number" value={newRule.consecutiveMonthsMissing || ''} onChange={(e) => setNewRule({ ...newRule, consecutiveMonthsMissing: parseInt(e.target.value) })} placeholder="e.g., 3" /></div>
                </div>
              </div>
            )}

            {/* Amount Threshold */}
            {newRule.ruleType === EscalationRuleType.AMOUNT_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Amount Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Total Arrears Threshold (XCD)</Label><Input type="number" value={newRule.totalArrearsThreshold || ''} onChange={(e) => setNewRule({ ...newRule, totalArrearsThreshold: parseInt(e.target.value) })} placeholder="e.g., 50000" /></div>
                  <div><Label>Single Period Threshold (XCD)</Label><Input type="number" value={newRule.singlePeriodThreshold || ''} onChange={(e) => setNewRule({ ...newRule, singlePeriodThreshold: parseInt(e.target.value) })} placeholder="e.g., 20000" /></div>
                </div>
              </div>
            )}

            {/* Behaviour Threshold */}
            {newRule.ruleType === EscalationRuleType.BEHAVIOUR_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Behaviour Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Min Notices Sent</Label><Input type="number" value={newRule.noticesSentMinimum || ''} onChange={(e) => setNewRule({ ...newRule, noticesSentMinimum: parseInt(e.target.value) })} placeholder="e.g., 3" /></div>
                  <div><Label>No Response Days</Label><Input type="number" value={newRule.noResponseDays || ''} onChange={(e) => setNewRule({ ...newRule, noResponseDays: parseInt(e.target.value) })} placeholder="e.g., 60" /></div>
                  <div><Label>Payment Plan Breaches</Label><Input type="number" value={newRule.paymentPlanBreachesCount || ''} onChange={(e) => setNewRule({ ...newRule, paymentPlanBreachesCount: parseInt(e.target.value) })} placeholder="e.g., 2" /></div>
                  <div><Label>Audit Refusals</Label><Input type="number" value={newRule.auditRefusedCount || ''} onChange={(e) => setNewRule({ ...newRule, auditRefusedCount: parseInt(e.target.value) })} placeholder="e.g., 1" /></div>
                </div>
              </div>
            )}

            {/* Risk Threshold */}
            {newRule.ruleType === EscalationRuleType.RISK_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium text-sm">Risk Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Risk Band</Label>
                    <Select value={newRule.riskBandMinimum} onValueChange={(value) => setNewRule({ ...newRule, riskBandMinimum: value })}>
                      <SelectTrigger><SelectValue placeholder="Select band" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Minimum Risk Score</Label><Input type="number" value={newRule.riskScoreMinimum || ''} onChange={(e) => setNewRule({ ...newRule, riskScoreMinimum: parseInt(e.target.value) })} placeholder="e.g., 70" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newRule.combineWithAgeThreshold || false} onCheckedChange={(checked) => setNewRule({ ...newRule, combineWithAgeThreshold: checked })} />
                  <Label>Combine with age threshold</Label>
                </div>
                {newRule.combineWithAgeThreshold && (
                  <div><Label>Age Threshold (Days)</Label><Input type="number" value={newRule.ageDaysOverdue || ''} onChange={(e) => setNewRule({ ...newRule, ageDaysOverdue: parseInt(e.target.value) })} placeholder="e.g., 60" /></div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-medium text-sm">Actions When Triggered</h3>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.autoMarkLegalRecommended || false} onCheckedChange={(checked) => setNewRule({ ...newRule, autoMarkLegalRecommended: checked })} />
                <Label>Auto-mark as Legal Recommended</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.notifyComplianceOfficer || false} onCheckedChange={(checked) => setNewRule({ ...newRule, notifyComplianceOfficer: checked })} />
                <Label>Notify Compliance Officer</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newRule.notifySupervisor || false} onCheckedChange={(checked) => setNewRule({ ...newRule, notifySupervisor: checked })} />
                <Label>Notify Supervisor</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button onClick={editingRule ? () => handleUpdateRule(editingRule.id, newRule) : handleAddRule}>
              {editingRule ? 'Update' : 'Add'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
