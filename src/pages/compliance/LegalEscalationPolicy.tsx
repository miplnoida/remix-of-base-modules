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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Target,
  Shield,
  Save,
  Calendar,
  History,
  CheckCircle2
} from 'lucide-react';
import { legalEscalationService } from '@/services/legalEscalationService';
import { LegalEscalationPolicy, LegalEscalationRule, EscalationRuleType, EscalationTriggerCondition } from '@/types/legalEscalation';
import { format } from 'date-fns';

const LegalEscalationPolicyPage = () => {
  const [policy, setPolicy] = useState<LegalEscalationPolicy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<LegalEscalationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<LegalEscalationRule | null>(null);
  const [newPolicyEffectiveFrom, setNewPolicyEffectiveFrom] = useState('');
  const [newPolicyNotes, setNewPolicyNotes] = useState('');
  const [newRule, setNewRule] = useState<Partial<LegalEscalationRule>>({
    ruleType: EscalationRuleType.AGE_THRESHOLD,
    triggerCondition: EscalationTriggerCondition.AND,
    enabled: true,
    priority: 1,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: false
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const history = await legalEscalationService.getPolicyHistory();
      setPolicy(history.activePolicy);
      setPolicyHistory(history.policies);
    } catch (error) {
      toast.error('Failed to load escalation policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    
    try {
      await legalEscalationService.updateActivePolicy(policy);
      toast.success('Policy settings saved successfully');
      loadPolicy();
    } catch (error) {
      toast.error('Failed to save policy');
    }
  };

  const handleActivateNewPolicy = async () => {
    if (!newPolicyEffectiveFrom) {
      toast.error('Please select an effective date');
      return;
    }

    if (!policy) return;

    try {
      await legalEscalationService.activateNewPolicy({
        ...policy,
        policyVersion: `v${policyHistory.length + 1}.0`,
        effectiveFrom: newPolicyEffectiveFrom,
        createdBy: 'current.user',
        notes: newPolicyNotes
      });
      
      toast.success('New policy activated successfully');
      setShowNewPolicyDialog(false);
      setNewPolicyEffectiveFrom('');
      setNewPolicyNotes('');
      loadPolicy();
    } catch (error) {
      console.error('Error activating new policy:', error);
      toast.error('Failed to activate new policy');
    }
  };

  const handleAddRule = async () => {
    try {
      await legalEscalationService.addRule(newRule as Omit<LegalEscalationRule, 'id'>);
      toast.success('Rule added successfully');
      setShowRuleDialog(false);
      setNewRule({
        ruleType: EscalationRuleType.AGE_THRESHOLD,
        triggerCondition: EscalationTriggerCondition.AND,
        enabled: true,
        priority: 1,
        autoMarkLegalRecommended: true,
        notifyComplianceOfficer: true,
        notifySupervisor: false
      });
      loadPolicy();
    } catch (error) {
      toast.error('Failed to add rule');
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<LegalEscalationRule>) => {
    try {
      await legalEscalationService.updateRule(ruleId, updates);
      toast.success('Rule updated successfully');
      loadPolicy();
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await legalEscalationService.deleteRule(ruleId);
      toast.success('Rule deleted successfully');
      loadPolicy();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const getRuleTypeIcon = (type: EscalationRuleType) => {
    switch (type) {
      case EscalationRuleType.AGE_THRESHOLD:
        return <Clock className="h-4 w-4" />;
      case EscalationRuleType.AMOUNT_THRESHOLD:
        return <DollarSign className="h-4 w-4" />;
      case EscalationRuleType.BEHAVIOUR_THRESHOLD:
        return <Target className="h-4 w-4" />;
      case EscalationRuleType.RISK_THRESHOLD:
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRuleTypeBadgeColor = (type: EscalationRuleType) => {
    switch (type) {
      case EscalationRuleType.AGE_THRESHOLD:
        return 'bg-blue-100 text-blue-800';
      case EscalationRuleType.AMOUNT_THRESHOLD:
        return 'bg-green-100 text-green-800';
      case EscalationRuleType.BEHAVIOUR_THRESHOLD:
        return 'bg-orange-100 text-orange-800';
      case EscalationRuleType.RISK_THRESHOLD:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
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
              Active Policy: {policy.policyVersion}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Effective from {format(new Date(policy.effectiveFrom), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowHistoryDialog(true)}>
            <History className="h-4 w-4" />
            Policy History
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowNewPolicyDialog(true)}>
            <Plus className="h-4 w-4" />
            Activate New Policy
          </Button>
          <Button onClick={handleSavePolicy}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Policy Overview Card */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Policy Name</Label>
            <Input
              value={policy.policyName}
              onChange={(e) => setPolicy({ ...policy, policyName: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Evaluation Frequency</Label>
            <Select
              value={policy.evaluationFrequency}
              onValueChange={(value: any) => setPolicy({ ...policy, evaluationFrequency: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
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
              <Switch
                checked={policy.isActive}
                onCheckedChange={(checked) => setPolicy({ ...policy, isActive: checked })}
              />
              <span className="text-sm">{policy.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        {policy.lastEvaluationDate && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-muted-foreground">Last Evaluation:</span>
                <span className="font-medium">{new Date(policy.lastEvaluationDate).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Next Scheduled:</span>
                <span className="font-medium">{policy.nextEvaluationDate ? new Date(policy.nextEvaluationDate).toLocaleString() : 'Not scheduled'}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Rules Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Escalation Rules</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Define rules that automatically identify cases ready for legal action
            </p>
          </div>
          <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        <div className="space-y-4">
          {policy.rules.map((rule) => (
            <Card key={rule.id} className="p-4 border-l-4" style={{ borderLeftColor: rule.enabled ? '#00713A' : '#CBD5E1' }}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getRuleTypeBadgeColor(rule.ruleType)}>
                      <span className="flex items-center gap-1">
                        {getRuleTypeIcon(rule.ruleType)}
                        {rule.ruleType.replace(/_/g, ' ')}
                      </span>
                    </Badge>
                    <span className="font-semibold text-lg">{rule.ruleName}</span>
                    {!rule.enabled && (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {rule.ageDaysOverdue && (
                      <div>
                        <span className="text-muted-foreground">Age Threshold: </span>
                        <span className="font-medium">{rule.ageDaysOverdue} days</span>
                      </div>
                    )}
                    {rule.totalArrearsThreshold && (
                      <div>
                        <span className="text-muted-foreground">Amount Threshold: </span>
                        <span className="font-medium">XCD {rule.totalArrearsThreshold.toLocaleString()}</span>
                      </div>
                    )}
                    {rule.noticesSentMinimum && (
                      <div>
                        <span className="text-muted-foreground">Notices Required: </span>
                        <span className="font-medium">{rule.noticesSentMinimum}+</span>
                      </div>
                    )}
                    {rule.paymentPlanBreachesCount && (
                      <div>
                        <span className="text-muted-foreground">Plan Breaches: </span>
                        <span className="font-medium">{rule.paymentPlanBreachesCount}+</span>
                      </div>
                    )}
                    {rule.riskBandMinimum && (
                      <div>
                        <span className="text-muted-foreground">Risk Band: </span>
                        <span className="font-medium">{rule.riskBandMinimum}+</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {rule.autoMarkLegalRecommended && (
                      <Badge variant="outline" className="text-xs">Auto-Mark</Badge>
                    )}
                    {rule.notifyComplianceOfficer && (
                      <Badge variant="outline" className="text-xs">Notify Officer</Badge>
                    )}
                    {rule.notifySupervisor && (
                      <Badge variant="outline" className="text-xs">Notify Supervisor</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateRule(rule.id, { enabled: !rule.enabled })}
                  >
                    <Switch checked={rule.enabled} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingRule(rule); setNewRule(rule); setShowRuleDialog(true); }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Policy History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy History</DialogTitle>
            <DialogDescription>
              View all legal escalation policy versions and their effective periods
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                {policyHistory.map((historyPolicy) => (
                  <TableRow key={historyPolicy.policyId}>
                    <TableCell className="font-medium">{historyPolicy.policyVersion}</TableCell>
                    <TableCell>{historyPolicy.policyName}</TableCell>
                    <TableCell>{format(new Date(historyPolicy.effectiveFrom), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {historyPolicy.effectiveTo 
                        ? format(new Date(historyPolicy.effectiveTo), 'MMM dd, yyyy')
                        : 'Present'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={historyPolicy.isActive ? "default" : "secondary"}>
                        {historyPolicy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{historyPolicy.createdBy}</TableCell>
                    <TableCell className="max-w-xs truncate">{historyPolicy.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Policy Dialog */}
      <Dialog open={showNewPolicyDialog} onOpenChange={setShowNewPolicyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate New Policy</DialogTitle>
            <DialogDescription>
              Create a new policy version with current settings. The current policy will be deactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From Date</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={newPolicyEffectiveFrom}
                onChange={(e) => setNewPolicyEffectiveFrom(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground">
                The date when this policy will become active
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Describe the changes in this policy version..."
                value={newPolicyNotes}
                onChange={(e) => setNewPolicyNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPolicyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleActivateNewPolicy}>
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
              <Input
                value={newRule.ruleName || ''}
                onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
                placeholder="e.g., High Arrears - 90 Days"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={newRule.description || ''}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Brief description of when this rule applies"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Type</Label>
                <Select
                  value={newRule.ruleType}
                  onValueChange={(value: EscalationRuleType) => setNewRule({ ...newRule, ruleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  type="number"
                  value={newRule.priority || 1}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Age Threshold Fields */}
            {newRule.ruleType === EscalationRuleType.AGE_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Age Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Days Overdue</Label>
                    <Input
                      type="number"
                      value={newRule.ageDaysOverdue || ''}
                      onChange={(e) => setNewRule({ ...newRule, ageDaysOverdue: parseInt(e.target.value) })}
                      placeholder="e.g., 90"
                    />
                  </div>
                  <div>
                    <Label>Consecutive Months Missing</Label>
                    <Input
                      type="number"
                      value={newRule.consecutiveMonthsMissing || ''}
                      onChange={(e) => setNewRule({ ...newRule, consecutiveMonthsMissing: parseInt(e.target.value) })}
                      placeholder="e.g., 3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Amount Threshold Fields */}
            {newRule.ruleType === EscalationRuleType.AMOUNT_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Amount Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Arrears Threshold (XCD)</Label>
                    <Input
                      type="number"
                      value={newRule.totalArrearsThreshold || ''}
                      onChange={(e) => setNewRule({ ...newRule, totalArrearsThreshold: parseInt(e.target.value) })}
                      placeholder="e.g., 50000"
                    />
                  </div>
                  <div>
                    <Label>Single Period Threshold (XCD)</Label>
                    <Input
                      type="number"
                      value={newRule.singlePeriodThreshold || ''}
                      onChange={(e) => setNewRule({ ...newRule, singlePeriodThreshold: parseInt(e.target.value) })}
                      placeholder="e.g., 20000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Behaviour Threshold Fields */}
            {newRule.ruleType === EscalationRuleType.BEHAVIOUR_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Behaviour Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Notices Sent</Label>
                    <Input
                      type="number"
                      value={newRule.noticesSentMinimum || ''}
                      onChange={(e) => setNewRule({ ...newRule, noticesSentMinimum: parseInt(e.target.value) })}
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div>
                    <Label>No Response Days</Label>
                    <Input
                      type="number"
                      value={newRule.noResponseDays || ''}
                      onChange={(e) => setNewRule({ ...newRule, noResponseDays: parseInt(e.target.value) })}
                      placeholder="e.g., 60"
                    />
                  </div>
                  <div>
                    <Label>Payment Plan Breaches</Label>
                    <Input
                      type="number"
                      value={newRule.paymentPlanBreachesCount || ''}
                      onChange={(e) => setNewRule({ ...newRule, paymentPlanBreachesCount: parseInt(e.target.value) })}
                      placeholder="e.g., 2"
                    />
                  </div>
                  <div>
                    <Label>Audit Refusals</Label>
                    <Input
                      type="number"
                      value={newRule.auditRefusedCount || ''}
                      onChange={(e) => setNewRule({ ...newRule, auditRefusedCount: parseInt(e.target.value) })}
                      placeholder="e.g., 1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Risk Threshold Fields */}
            {newRule.ruleType === EscalationRuleType.RISK_THRESHOLD && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">Risk Threshold Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Risk Band</Label>
                    <Select
                      value={newRule.riskBandMinimum}
                      onValueChange={(value) => setNewRule({ ...newRule, riskBandMinimum: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk band" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Minimum Risk Score</Label>
                    <Input
                      type="number"
                      value={newRule.riskScoreMinimum || ''}
                      onChange={(e) => setNewRule({ ...newRule, riskScoreMinimum: parseInt(e.target.value) })}
                      placeholder="e.g., 70"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRule.combineWithAgeThreshold || false}
                    onCheckedChange={(checked) => setNewRule({ ...newRule, combineWithAgeThreshold: checked })}
                  />
                  <Label>Combine with age threshold</Label>
                </div>
                {newRule.combineWithAgeThreshold && (
                  <div>
                    <Label>Age Threshold (Days)</Label>
                    <Input
                      type="number"
                      value={newRule.ageDaysOverdue || ''}
                      onChange={(e) => setNewRule({ ...newRule, ageDaysOverdue: parseInt(e.target.value) })}
                      placeholder="e.g., 60"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-medium">Actions</h3>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.autoMarkLegalRecommended || false}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, autoMarkLegalRecommended: checked })}
                />
                <Label>Auto-mark cases as Legal Recommended</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.notifyComplianceOfficer || false}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, notifyComplianceOfficer: checked })}
                />
                <Label>Notify Compliance Officer</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.notifySupervisor || false}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, notifySupervisor: checked })}
                />
                <Label>Notify Supervisor</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingRule ? () => handleUpdateRule(editingRule.id, newRule) : handleAddRule}>
              {editingRule ? 'Update' : 'Add'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalEscalationPolicyPage;
