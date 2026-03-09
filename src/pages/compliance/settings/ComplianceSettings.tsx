import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Settings, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  Save,
  History,
  Plus,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { complianceSettingsService } from "@/services/complianceSettingsService";
import { ComplianceSettingsPolicy, AutoViolationCreationRule } from "@/types/complianceSettings";
import { format } from "date-fns";

export default function ComplianceSettings() {
  const [activePolicy, setActivePolicy] = useState<ComplianceSettingsPolicy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<ComplianceSettingsPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ComplianceSettingsPolicy>>({});
  const [newPolicyEffectiveFrom, setNewPolicyEffectiveFrom] = useState('');
  const [newPolicyNotes, setNewPolicyNotes] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const history = await complianceSettingsService.getSettingsHistory();
      setActivePolicy(history.activePolicy);
      setPolicyHistory(history.policies);
      if (history.activePolicy) {
        setFormData(history.activePolicy);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load compliance settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activePolicy) return;
    
    try {
      await complianceSettingsService.updateActivePolicy(formData);
      toast.success('Compliance settings updated successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleRuleToggle = (ruleId: string, enabled: boolean) => {
    if (!formData.autoViolationCreationRules) return;
    
    const updatedRules = formData.autoViolationCreationRules.map(rule =>
      rule.ruleId === ruleId ? { ...rule, enabled } : rule
    );
    
    setFormData({ ...formData, autoViolationCreationRules: updatedRules });
  };

  const handleActivateNewPolicy = async () => {
    if (!newPolicyEffectiveFrom) {
      toast.error('Please select an effective date');
      return;
    }

    if (!formData) return;

    try {
      await complianceSettingsService.activateNewPolicy({
        ...formData as ComplianceSettingsPolicy,
        policyVersion: `v${policyHistory.length + 1}.0`,
        effectiveFrom: newPolicyEffectiveFrom,
        createdBy: 'current.user',
        notes: newPolicyNotes
      });
      
      toast.success('New policy activated successfully');
      setShowNewPolicyDialog(false);
      setNewPolicyEffectiveFrom('');
      setNewPolicyNotes('');
      loadSettings();
    } catch (error) {
      console.error('Error activating new policy:', error);
      toast.error('Failed to activate new policy');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading compliance settings...</div>
      </div>
    );
  }

  if (!activePolicy) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">No active policy found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance Settings</h1>
          <p className="text-muted-foreground">
            Configure rules, grace periods, and automation
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Active Policy: {activePolicy.policyVersion}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Effective from {format(new Date(activePolicy.effectiveFrom), 'MMM dd, yyyy')}
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
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* C3 Submission Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>C3 Submission Rules</CardTitle>
          </div>
          <CardDescription>
            Configure grace periods and submission deadlines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gracePeriod">Grace Period (days)</Label>
              <Input
                id="gracePeriod"
                type="number"
                value={formData.c3GracePeriodDays || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  c3GracePeriodDays: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Days after month-end before late case is created
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="submissionDeadline">Submission & Payment Deadline</Label>
              <Input
                id="submissionDeadline"
                type="text"
                value="End of Coming Month"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Both C3 submission and payment are due by the last day of the coming month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Penalty Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Payment & Penalty Rules</CardTitle>
          </div>
          <CardDescription>
            Configure payment due dates and penalty calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penaltyRate">Penalty Rate (%)</Label>
              <Input
                id="penaltyRate"
                type="number"
                step="0.01"
                value={formData.penaltyRatePercent || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  penaltyRatePercent: parseFloat(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (% per month)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                value={formData.interestRatePercent || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  interestRatePercent: parseFloat(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrearsThreshold">Arrears Escalation Threshold (XCD)</Label>
              <Input
                id="arrearsThreshold"
                type="number"
                value={formData.arrearsEscalationThreshold || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  arrearsEscalationThreshold: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Automatic legal escalation if arrears exceed this amount
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit & Inspection Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Audit & Inspection Rules</CardTitle>
          </div>
          <CardDescription>
            Configure audit frequency and risk-based rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auditFrequency">Minimum Audit Frequency (months)</Label>
              <Input
                id="auditFrequency"
                type="number"
                value={formData.minimumAuditFrequencyMonths || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  minimumAuditFrequencyMonths: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Every employer must be audited at least once in this period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violation Prefix Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Violation Prefix Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure violation number prefixes and formatting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="automaticPrefix">Automatic Creation Prefix</Label>
              <Input
                id="automaticPrefix"
                value={formData.violationPrefixConfig?.automaticPrefix || 'VIOA'}
                onChange={(e) => setFormData({
                  ...formData,
                  violationPrefixConfig: {
                    ...formData.violationPrefixConfig!,
                    automaticPrefix: e.target.value
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                Prefix for automatically created violations
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualPrefix">Manual Creation Prefix</Label>
              <Input
                id="manualPrefix"
                value={formData.violationPrefixConfig?.manualPrefix || 'VIOM'}
                onChange={(e) => setFormData({
                  ...formData,
                  violationPrefixConfig: {
                    ...formData.violationPrefixConfig!,
                    manualPrefix: e.target.value
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                Prefix for manually created violations
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberFormat">Number Format</Label>
              <Input
                id="numberFormat"
                value={formData.violationPrefixConfig?.numberFormat || 'YYYY-NNNN'}
                onChange={(e) => setFormData({
                  ...formData,
                  violationPrefixConfig: {
                    ...formData.violationPrefixConfig!,
                    numberFormat: e.target.value
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                YYYY = Year, NNNN = Sequential Number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentNumber">Current Number</Label>
              <Input
                id="currentNumber"
                type="number"
                value={formData.violationPrefixConfig?.currentNumber || 1}
                onChange={(e) => setFormData({
                  ...formData,
                  violationPrefixConfig: {
                    ...formData.violationPrefixConfig!,
                    currentNumber: parseInt(e.target.value)
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                Next violation number to be assigned
              </p>
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Example Violation Numbers:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Automatic: <span className="font-mono font-medium text-foreground">{formData.violationPrefixConfig?.automaticPrefix}-{new Date().getFullYear()}-{String(formData.violationPrefixConfig?.currentNumber || 1).padStart(4, '0')}</span></p>
              <p>Manual: <span className="font-mono font-medium text-foreground">{formData.violationPrefixConfig?.manualPrefix}-{new Date().getFullYear()}-{String(formData.violationPrefixConfig?.currentNumber || 1).padStart(4, '0')}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Violation Creation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle>Automatic Violation Creation Rules</CardTitle>
          </div>
          <CardDescription>
            Enable or disable automatic violation creation triggers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.autoViolationCreationRules?.map((rule) => (
            <div key={rule.ruleId} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{rule.triggerEvent}</p>
                  <Badge variant={rule.enabled ? "default" : "secondary"} className="gap-1">
                    {rule.enabled ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rule.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Creates violation type: <span className="font-mono">{rule.violationType}</span>
                </p>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) => handleRuleToggle(rule.ruleId, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Policy History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy History</DialogTitle>
            <DialogDescription>
              View all compliance policy versions and their effective periods
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyHistory.map((policy) => (
                  <TableRow key={policy.policyId}>
                    <TableCell className="font-medium">{policy.policyVersion}</TableCell>
                    <TableCell>{format(new Date(policy.effectiveFrom), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {policy.effectiveTo 
                        ? format(new Date(policy.effectiveTo), 'MMM dd, yyyy')
                        : 'Present'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ? "default" : "secondary"}>
                        {policy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.createdBy}</TableCell>
                    <TableCell className="max-w-xs truncate">{policy.notes || '-'}</TableCell>
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
    </div>
  );
}
