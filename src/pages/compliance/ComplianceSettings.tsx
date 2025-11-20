import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  Save
} from "lucide-react";
import { mockComplianceSettings } from "@/services/mockData/complianceData";
import { useState } from "react";
import { toast } from "sonner";

export default function ComplianceSettings() {
  const [settings, setSettings] = useState(mockComplianceSettings);

  const handleSave = () => {
    toast.success("Compliance settings saved successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance Settings</h1>
          <p className="text-muted-foreground">
            Configure rules, grace periods, and automation
          </p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
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
                value={settings.c3GracePeriodDays}
                onChange={(e) => setSettings({
                  ...settings,
                  c3GracePeriodDays: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Days after month-end before late case is created
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="submissionDeadline">Submission Deadline (day of month)</Label>
              <Input
                id="submissionDeadline"
                type="number"
                value={settings.c3SubmissionDeadlineDay}
                onChange={(e) => setSettings({
                  ...settings,
                  c3SubmissionDeadlineDay: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Day of month by which C3 must be submitted
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
              <Label htmlFor="paymentDueDay">Payment Due Date (day of month)</Label>
              <Input
                id="paymentDueDay"
                type="number"
                value={settings.paymentDueDateDay}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentDueDateDay: parseInt(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyRate">Penalty Rate (%)</Label>
              <Input
                id="penaltyRate"
                type="number"
                step="0.01"
                value={settings.penaltyRatePercent}
                onChange={(e) => setSettings({
                  ...settings,
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
                value={settings.interestRatePercent}
                onChange={(e) => setSettings({
                  ...settings,
                  interestRatePercent: parseFloat(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyFrequency">Penalty Calculation</Label>
              <Input
                id="penaltyFrequency"
                value={settings.penaltyCalculationFrequency}
                onChange={(e) => setSettings({
                  ...settings,
                  penaltyCalculationFrequency: e.target.value as any
                })}
              />
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
                value={settings.minimumAuditFrequencyMonths}
                onChange={(e) => setSettings({
                  ...settings,
                  minimumAuditFrequencyMonths: parseInt(e.target.value)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Every employer must be audited at least once in this period
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrearsThreshold">Arrears Threshold (XCD)</Label>
              <Input
                id="arrearsThreshold"
                type="number"
                value={settings.arrearsEscalationThreshold}
                onChange={(e) => setSettings({
                  ...settings,
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

      {/* Automatic Case Creation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle>Automatic Case Creation</CardTitle>
          </div>
          <CardDescription>
            Configure which events trigger automatic case creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {settings.autoCaseCreationRules.map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{rule.triggerEvent}</p>
                  <p className="text-sm text-muted-foreground">
                    Creates: {rule.caseType}
                  </p>
                </div>
                <Badge variant={rule.enabled ? "default" : "secondary"}>
                  {rule.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
