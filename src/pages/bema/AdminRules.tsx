import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function BemaAdminRules() {
  const [auditFrequency, setAuditFrequency] = useState("18");
  const [statuteOfLimitations, setStatuteOfLimitations] = useState("7");
  const [penaltyRate, setPenaltyRate] = useState("10");
  const [interestRate, setInterestRate] = useState("8");

  const handleSave = () => {
    toast.success("Rules updated successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Rules Engine</h1>
          <p className="text-muted-foreground">
            Configure system rules and business logic
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit">Audit Rules</TabsTrigger>
          <TabsTrigger value="penalty">Penalties & Interest</TabsTrigger>
          <TabsTrigger value="contributor">Contributor Rules</TabsTrigger>
          <TabsTrigger value="legal">Legal Thresholds</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Frequency & Sampling</CardTitle>
              <CardDescription>
                Configure audit intervals and risk-based sampling rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auditFrequency">Default Audit Frequency (months)</Label>
                <Input
                  id="auditFrequency"
                  type="number"
                  value={auditFrequency}
                  onChange={(e) => setAuditFrequency(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Employers will be flagged for audit if not audited within this period
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskScore">High Risk Score Threshold</Label>
                <Input id="riskScore" type="number" defaultValue="75" />
                <p className="text-sm text-muted-foreground">
                  Employers above this score will be prioritized for audit
                </p>
              </div>

              <div className="space-y-2">
                <Label>Risk Factors</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  {[
                    { factor: "Late C3 Filing", weight: "High", points: 20 },
                    { factor: "Arrears Balance", weight: "High", points: 25 },
                    { factor: "Employee Count Variance", weight: "Medium", points: 15 },
                    { factor: "Previous Non-Compliance", weight: "High", points: 30 },
                  ].map((risk, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{risk.factor}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{risk.weight}</span>
                        <Input 
                          type="number" 
                          defaultValue={risk.points} 
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Penalties & Interest Configuration</CardTitle>
              <CardDescription>
                Set rates for late filing penalties and interest charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="penaltyRate">Monthly Penalty Rate (%)</Label>
                <Input
                  id="penaltyRate"
                  type="number"
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  step="0.1"
                />
                <p className="text-sm text-muted-foreground">
                  Applied to late C3 submissions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">Annual Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  step="0.1"
                />
                <p className="text-sm text-muted-foreground">
                  Applied to outstanding arrears
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                <Input id="gracePeriod" type="number" defaultValue="14" />
                <p className="text-sm text-muted-foreground">
                  Days before penalties are applied after due date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPenalty">Maximum Penalty Cap (%)</Label>
                <Input id="maxPenalty" type="number" defaultValue="50" />
                <p className="text-sm text-muted-foreground">
                  Maximum penalty as percentage of original contribution
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Self-Employed & Voluntary Contributor Rules</CardTitle>
              <CardDescription>
                Configure rules for SE/VC registration and contributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="statuteOfLimitations">Statute of Limitations (years)</Label>
                <Input
                  id="statuteOfLimitations"
                  type="number"
                  value={statuteOfLimitations}
                  onChange={(e) => setStatuteOfLimitations(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum retroactive contribution period
                </p>
              </div>

              <div className="space-y-2">
                <Label>Category Change Rules</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Allowed change periods</span>
                    <span className="text-sm font-medium">January & July</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Minimum weeks required</span>
                    <Input type="number" defaultValue="52" className="w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Changes per year</span>
                    <Input type="number" defaultValue="1" className="w-20" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contribution Categories & Rates</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  {[
                    { category: "Category A", weeklyRate: 15.00, monthlyRate: 65.00 },
                    { category: "Category B", weeklyRate: 25.00, monthlyRate: 108.33 },
                    { category: "Category C", weeklyRate: 35.00, monthlyRate: 151.67 },
                    { category: "Category D", weeklyRate: 45.00, monthlyRate: 195.00 },
                  ].map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          defaultValue={cat.weeklyRate} 
                          className="w-24"
                          step="0.01"
                        />
                        <span className="text-sm text-muted-foreground">/week</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legal Escalation Thresholds</CardTitle>
              <CardDescription>
                Configure automatic escalation rules for legal action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoEscalateAmount">Auto-Escalate Amount ($)</Label>
                <Input id="autoEscalateAmount" type="number" defaultValue="50000" />
                <p className="text-sm text-muted-foreground">
                  Arrears above this amount automatically flagged for legal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brokenPlanGrace">Broken Plan Grace Period (days)</Label>
                <Input id="brokenPlanGrace" type="number" defaultValue="7" />
                <p className="text-sm text-muted-foreground">
                  Days before broken payment plan escalates to legal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waiverThreshold">Waiver Approval Threshold ($)</Label>
                <Input id="waiverThreshold" type="number" defaultValue="10000" />
                <p className="text-sm text-muted-foreground">
                  Waivers above this amount require Director approval
                </p>
              </div>

              <div className="space-y-2">
                <Label>Escalation Triggers</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  {[
                    { trigger: "First broken payment plan", action: "Flag for review" },
                    { trigger: "Second broken payment plan", action: "Auto-escalate" },
                    { trigger: "90+ days overdue", action: "Auto-escalate" },
                    { trigger: "Outstanding > 6 periods", action: "Flag for review" },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{rule.trigger}</span>
                      <span className="text-sm font-medium text-primary">{rule.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
